// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AleoEthereumBridge
 * @notice Bridge contract for Aleo-Ethereum asset transfers with privacy preservation
 * @dev Extends existing Axelar infrastructure to support Aleo private vault integration
 */

import {AxelarExecutableWithToken} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutableWithToken.sol";
import {IAxelarGasService} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract AleoEthereumBridge is AxelarExecutableWithToken, ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    IAxelarGasService public immutable gasService;
    
    // Mapping of trusted Aleo bridge contracts (chain name => contract address string)
    mapping(string => string) public trustedAleoBridges;
    
    // Reserve tracking for cryptographic proofs
    mapping(address => uint256) public tokenReserves;
    mapping(address => uint256) public totalLocked;
    mapping(address => uint256) public totalUnlocked;
    
    // Bridge request tracking
    mapping(bytes32 => BridgeRequest) public bridgeRequests;
    mapping(bytes32 => bool) public processedRequests;
    
    // Fee configuration
    uint256 public bridgeFeeBps = 25; // 0.25% default fee
    address public feeRecipient;
    uint256 public constant MAX_FEE_BPS = 500; // 5% maximum
    
    // Minimum amounts to prevent dust attacks
    mapping(address => uint256) public minimumAmounts;

    // ============ Structs ============

    struct BridgeRequest {
        address user;
        address token;
        uint256 amount;
        string targetChain;
        bytes32 aleoVaultId;
        bytes32 aleoStrategyId;
        uint256 timestamp;
        BridgeStatus status;
    }

    struct AleoDeposit {
        address token;
        uint256 amount;
        bytes32 vaultId;
        bytes32 strategyId;
        bytes bridgeProof;
        bytes32 bridgeNonce;
    }

    struct AleoWithdrawal {
        address user;
        address token;
        uint256 amount;
        bytes32 requestId;
        bytes withdrawalProof;
    }

    struct ReserveProof {
        address token;
        uint256 totalReserves;
        uint256 totalLocked;
        uint256 totalUnlocked;
        bytes32 proofHash;
        uint256 timestamp;
    }

    enum BridgeStatus {
        Pending,
        Locked,
        Completed,
        Failed
    }

    // ============ Events ============

    event AssetLocked(
        address indexed user,
        address indexed token,
        uint256 amount,
        string targetChain,
        bytes32 indexed requestId,
        bytes32 aleoVaultId,
        bytes32 aleoStrategyId
    );

    event AssetUnlocked(
        address indexed user,
        address indexed token,
        uint256 amount,
        bytes32 indexed requestId
    );

    event ReserveProofGenerated(
        address indexed token,
        uint256 totalReserves,
        bytes32 proofHash,
        uint256 timestamp
    );

    event BridgeRequestProcessed(
        bytes32 indexed requestId,
        BridgeStatus status
    );

    event TrustedAleoBridgeSet(
        string indexed chainName,
        string contractAddress
    );

    event MinimumAmountSet(
        address indexed token,
        uint256 amount
    );

    // ============ Errors ============

    error InvalidAmount();
    error InvalidToken();
    error InvalidChain();
    error UntrustedBridge();
    error RequestNotFound();
    error RequestAlreadyProcessed();
    error InsufficientReserves();
    error InvalidProof();
    error AmountTooSmall();
    error InvalidFee();
    error ZeroAddress();

    // ============ Constructor ============

    constructor(
        address gateway_,
        address gasService_,
        address initialOwner
    ) 
        AxelarExecutableWithToken(gateway_) 
        Ownable(initialOwner) 
    {
        if (gasService_ == address(0)) revert ZeroAddress();
        gasService = IAxelarGasService(gasService_);
        feeRecipient = initialOwner;
    }

    // ============ External Functions ============

    /**
     * @notice Lock Ethereum assets for Aleo vault deposit
     * @param token The ERC20 token to lock
     * @param amount The amount to lock
     * @param targetChain The Aleo chain identifier
     * @param aleoVaultId The target vault ID on Aleo
     * @param aleoStrategyId The strategy ID for yield farming
     */
    function lockForAleoVault(
        address token,
        uint256 amount,
        string calldata targetChain,
        bytes32 aleoVaultId,
        bytes32 aleoStrategyId
    ) external payable nonReentrant whenNotPaused {
        // Validate inputs
        if (token == address(0)) revert InvalidToken();
        if (amount == 0) revert InvalidAmount();
        if (bytes(targetChain).length == 0) revert InvalidChain();
        if (msg.value == 0) revert InvalidAmount(); // Gas payment required
        
        // Check minimum amount
        uint256 minAmount = minimumAmounts[token];
        if (minAmount > 0 && amount < minAmount) revert AmountTooSmall();
        
        // Verify trusted Aleo bridge
        string memory aleoBridge = trustedAleoBridges[targetChain];
        if (bytes(aleoBridge).length == 0) revert UntrustedBridge();
        
        // Calculate fee
        uint256 fee = (amount * bridgeFeeBps) / 10000;
        uint256 amountAfterFee = amount - fee;
        
        // Transfer tokens from user
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Transfer fee to recipient
        if (fee > 0 && feeRecipient != address(0)) {
            IERC20(token).safeTransfer(feeRecipient, fee);
        }
        
        // Update reserves
        tokenReserves[token] += amountAfterFee;
        totalLocked[token] += amountAfterFee;
        
        // Generate unique request ID
        bytes32 requestId = keccak256(
            abi.encodePacked(msg.sender, token, amount, block.timestamp, aleoVaultId)
        );
        
        // Store bridge request
        bridgeRequests[requestId] = BridgeRequest({
            user: msg.sender,
            token: token,
            amount: amountAfterFee,
            targetChain: targetChain,
            aleoVaultId: aleoVaultId,
            aleoStrategyId: aleoStrategyId,
            timestamp: block.timestamp,
            status: BridgeStatus.Locked
        });
        
        // Generate bridge proof for Aleo
        bytes memory bridgeProof = generateBridgeProof(token, amountAfterFee, requestId);
        bytes32 bridgeNonce = keccak256(abi.encodePacked(requestId, block.timestamp));
        
        // Prepare Aleo deposit payload
        bytes memory payload = abi.encode(
            AleoDeposit({
                token: token,
                amount: amountAfterFee,
                vaultId: aleoVaultId,
                strategyId: aleoStrategyId,
                bridgeProof: bridgeProof,
                bridgeNonce: bridgeNonce
            })
        );
        
        // Pay for gas on Aleo chain
        gasService.payNativeGasForContractCall{value: msg.value}(
            address(this),
            targetChain,
            aleoBridge,
            payload,
            msg.sender
        );
        
        // Send message to Aleo bridge
        gateway().callContract(targetChain, aleoBridge, payload);
        
        emit AssetLocked(
            msg.sender,
            token,
            amountAfterFee,
            targetChain,
            requestId,
            aleoVaultId,
            aleoStrategyId
        );
    }

    /**
     * @notice Unlock assets from Aleo vault withdrawal
     * @param user The user to receive unlocked assets
     * @param token The token to unlock
     * @param amount The amount to unlock
     * @param requestId The withdrawal request ID from Aleo
     * @param withdrawalProof The cryptographic proof of withdrawal from Aleo
     */
    function unlockFromAleoVault(
        address user,
        address token,
        uint256 amount,
        bytes32 requestId,
        bytes calldata withdrawalProof
    ) external onlyOwner nonReentrant {
        // Validate inputs
        if (user == address(0)) revert ZeroAddress();
        if (token == address(0)) revert InvalidToken();
        if (amount == 0) revert InvalidAmount();
        if (processedRequests[requestId]) revert RequestAlreadyProcessed();
        
        // Verify withdrawal proof (simplified - in production would verify ZK proof)
        if (!verifyWithdrawalProof(user, token, amount, requestId, withdrawalProof)) {
            revert InvalidProof();
        }
        
        // Check sufficient reserves
        if (tokenReserves[token] < amount) revert InsufficientReserves();
        
        // Update reserves
        tokenReserves[token] -= amount;
        totalUnlocked[token] += amount;
        
        // Mark request as processed
        processedRequests[requestId] = true;
        
        // Transfer tokens to user
        IERC20(token).safeTransfer(user, amount);
        
        emit AssetUnlocked(user, token, amount, requestId);
    }

    /**
     * @notice Generate cryptographic proof of reserves
     * @param token The token to generate proof for
     */
    function generateReserveProof(address token) external view returns (ReserveProof memory) {
        uint256 reserves = tokenReserves[token];
        uint256 locked = totalLocked[token];
        uint256 unlocked = totalUnlocked[token];
        
        // Generate proof hash (simplified - in production would use ZK proof)
        bytes32 proofHash = keccak256(
            abi.encodePacked(token, reserves, locked, unlocked, block.timestamp)
        );
        
        return ReserveProof({
            token: token,
            totalReserves: reserves,
            totalLocked: locked,
            totalUnlocked: unlocked,
            proofHash: proofHash,
            timestamp: block.timestamp
        });
    }

    /**
     * @notice Verify reserve proof from external source
     * @param proof The reserve proof to verify
     */
    function verifyReserveProof(ReserveProof calldata proof) external view returns (bool) {
        // Verify proof hash matches computed hash
        bytes32 computedHash = keccak256(
            abi.encodePacked(
                proof.token,
                proof.totalReserves,
                proof.totalLocked,
                proof.totalUnlocked,
                proof.timestamp
            )
        );
        
        return computedHash == proof.proofHash;
    }

    // ============ Internal Functions ============

    /**
     * @notice Handle incoming messages from Aleo bridge
     */
    function _execute(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override {
        // Verify source is trusted Aleo bridge
        string memory trustedBridge = trustedAleoBridges[sourceChain];
        if (keccak256(bytes(trustedBridge)) != keccak256(bytes(sourceAddress))) {
            revert UntrustedBridge();
        }
        
        // Decode withdrawal request from Aleo
        AleoWithdrawal memory withdrawal = abi.decode(payload, (AleoWithdrawal));
        
        // Process withdrawal (admin function called internally)
        _processAleoWithdrawal(withdrawal);
    }

    /**
     * @notice Process withdrawal request from Aleo
     */
    function _processAleoWithdrawal(AleoWithdrawal memory withdrawal) internal {
        // Verify withdrawal proof
        if (!verifyWithdrawalProof(
            withdrawal.user,
            withdrawal.token,
            withdrawal.amount,
            withdrawal.requestId,
            withdrawal.withdrawalProof
        )) {
            revert InvalidProof();
        }
        
        // Check if already processed
        if (processedRequests[withdrawal.requestId]) {
            revert RequestAlreadyProcessed();
        }
        
        // Check sufficient reserves
        if (tokenReserves[withdrawal.token] < withdrawal.amount) {
            revert InsufficientReserves();
        }
        
        // Update reserves
        tokenReserves[withdrawal.token] -= withdrawal.amount;
        totalUnlocked[withdrawal.token] += withdrawal.amount;
        
        // Mark as processed
        processedRequests[withdrawal.requestId] = true;
        
        // Transfer tokens to user
        IERC20(withdrawal.token).safeTransfer(withdrawal.user, withdrawal.amount);
        
        emit AssetUnlocked(
            withdrawal.user,
            withdrawal.token,
            withdrawal.amount,
            withdrawal.requestId
        );
    }

    /**
     * @notice Generate bridge proof for Aleo verification
     */
    function generateBridgeProof(
        address token,
        uint256 amount,
        bytes32 requestId
    ) internal view returns (bytes memory) {
        // Generate cryptographic proof (simplified - in production would use ZK proof)
        bytes32 proofHash = keccak256(
            abi.encodePacked(token, amount, requestId, block.timestamp, address(this))
        );
        
        return abi.encodePacked(proofHash);
    }

    /**
     * @notice Verify withdrawal proof from Aleo
     */
    function verifyWithdrawalProof(
        address user,
        address token,
        uint256 amount,
        bytes32 requestId,
        bytes calldata proof
    ) internal pure returns (bool) {
        // Simplified proof verification - in production would verify ZK proof
        bytes32 expectedHash = keccak256(
            abi.encodePacked(user, token, amount, requestId)
        );
        
        if (proof.length < 32) return false;
        
        bytes32 proofHash;
        assembly {
            proofHash := calldataload(add(proof.offset, 0))
        }
        
        return proofHash == expectedHash;
    }

    // ============ Admin Functions ============

    /**
     * @notice Set trusted Aleo bridge contract
     */
    function setTrustedAleoBridge(
        string calldata chainName,
        string calldata contractAddress
    ) external onlyOwner {
        trustedAleoBridges[chainName] = contractAddress;
        emit TrustedAleoBridgeSet(chainName, contractAddress);
    }

    /**
     * @notice Set minimum amount for a token
     */
    function setMinimumAmount(address token, uint256 amount) external onlyOwner {
        minimumAmounts[token] = amount;
        emit MinimumAmountSet(token, amount);
    }

    /**
     * @notice Set bridge fee
     */
    function setBridgeFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert InvalidFee();
        bridgeFeeBps = newFeeBps;
    }

    /**
     * @notice Set fee recipient
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        feeRecipient = newRecipient;
    }

    /**
     * @notice Emergency pause
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency token rescue
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        
        // Ensure we don't rescue reserved tokens
        uint256 available = IERC20(token).balanceOf(address(this)) - tokenReserves[token];
        if (amount > available) revert InsufficientReserves();
        
        IERC20(token).safeTransfer(to, amount);
    }

    // ============ View Functions ============

    /**
     * @notice Get bridge request details
     */
    function getBridgeRequest(bytes32 requestId) external view returns (BridgeRequest memory) {
        return bridgeRequests[requestId];
    }

    /**
     * @notice Check if request is processed
     */
    function isRequestProcessed(bytes32 requestId) external view returns (bool) {
        return processedRequests[requestId];
    }

    /**
     * @notice Get token reserves
     */
    function getTokenReserves(address token) external view returns (uint256) {
        return tokenReserves[token];
    }

    /**
     * @notice Get total locked amount for token
     */
    function getTotalLocked(address token) external view returns (uint256) {
        return totalLocked[token];
    }

    /**
     * @notice Get total unlocked amount for token
     */
    function getTotalUnlocked(address token) external view returns (uint256) {
        return totalUnlocked[token];
    }

    // Allow receiving ETH for gas payments
    receive() external payable {}
}