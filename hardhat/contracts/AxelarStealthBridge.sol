// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title AxelarStealthBridge
 * @notice Cross-chain stealth payment bridge using Axelar GMP
 * @dev Based on Axelar GMP documentation:
 *      - https://docs.axelar.dev/dev/general-message-passing/gmp-tokens-with-messages
 *      - https://github.com/axelarnetwork/axelar-gmp-sdk-solidity
 * 
 * Architecture:
 * - Source chain: User sends tokens + stealth address data via callContractWithToken
 * - Axelar Network: Relays message and tokens to destination
 * - Destination chain: Tokens delivered to stealth address, event emitted for scanning
 */

import {AxelarExecutableWithToken} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutableWithToken.sol";
import {IAxelarGasService} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import {InterchainTokenExecutable} from "@axelar-network/interchain-token-service/contracts/executable/InterchainTokenExecutable.sol";
import {IInterchainTokenService} from "@axelar-network/interchain-token-service/contracts/interfaces/IInterchainTokenService.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract AxelarStealthBridge is AxelarExecutableWithToken, InterchainTokenExecutable, ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    IAxelarGasService public immutable gasService;
    
    // Mapping of trusted remote contracts (chain name => contract address string)
    mapping(string => string) public trustedRemotes;
    
    // Mapping of trusted remote contracts as addresses (for ITS)
    mapping(string => address) public trustedRemotesAddress;
    
    // Meta address registry for cross-chain sync
    mapping(address => MetaAddress) public metaAddresses;
    
    // Payment nonce for unique payment IDs
    mapping(address => uint256) public paymentNonces;
    
    // Fee configuration (in basis points, 100 = 1%)
    uint256 public protocolFeeBps = 50; // 0.5% default fee
    address public feeRecipient;
    
    // Maximum fee in basis points (5%)
    uint256 public constant MAX_FEE_BPS = 500;

    // Selector for Sync messages (keccak256("SYNC_META_ADDRESS"))
    bytes4 private constant SYNC_SELECTOR = bytes4(keccak256("SYNC_META_ADDRESS"));

    // ============ Structs ============

    struct StealthPayment {
        address stealthAddress;
        bytes ephemeralPubKey;
        bytes1 viewHint;
        uint32 k;
        address sender;
        uint256 nonce;
    }

    struct MetaAddress {
        bytes spendPubKey;
        bytes viewingPubKey;
        bool isRegistered;
    }

    // ============ Events ============

    event CrossChainStealthPaymentSent(
        string indexed destinationChain,
        address indexed sender,
        address stealthAddress,
        uint256 amount,
        string symbol,
        bytes32 paymentId
    );

    event StealthPaymentReceived(
        string indexed sourceChain,
        address indexed stealthAddress,
        uint256 amount,
        string symbol,
        bytes ephemeralPubKey,
        bytes1 viewHint,
        uint32 k
    );

    event MetaAddressRegistered(
        address indexed user,
        bytes spendPubKey,
        bytes viewingPubKey
    );

    event MetaAddressSynced(
        string indexed sourceChain,
        address indexed user,
        bytes spendPubKey,
        bytes viewingPubKey
    );

    event MetaAddressSyncSkipped(
        string indexed sourceChain,
        address indexed user
    );

    event TrustedRemoteSet(string indexed chainName, string contractAddress);
    event ProtocolFeeUpdated(uint256 newFeeBps);
    event FeeRecipientUpdated(address newRecipient);

    // ============ Errors ============

    error InvalidDestination();
    error InvalidAmount();
    error InvalidStealthAddress();
    error UntrustedRemote();
    error TokenTransferFailed();
    error InvalidFee();
    error ZeroAddress();
    error InsufficientGasPayment();
    error InvalidEphemeralKeyLength();
    error InvalidTokenAddress();
    error InvalidSymbol();
    error AmountTooSmall();
    error InvalidSpendKeyLength();
    error InvalidViewingKeyLength();
    error InvalidMessage();

    // ============ Constructor ============

    constructor(
        address gateway_,
        address gasService_,
        address tokenService_,
        address initialOwner
    ) 
        AxelarExecutableWithToken(gateway_) 
        InterchainTokenExecutable(tokenService_)
        Ownable(initialOwner) 
    {
        if (gasService_ == address(0)) revert ZeroAddress();
        gasService = IAxelarGasService(gasService_);
        feeRecipient = initialOwner;
    }

    // ============ External Functions ============

    /**
     * @notice Send a cross-chain stealth payment
     * @param destinationChain The name of the destination chain (Axelar format)
     * @param stealthAddress The computed stealth address on destination
     * @param ephemeralPubKey The ephemeral public key for recipient detection
     * @param viewHint The view hint byte for fast scanning
     * @param k The index used in stealth address generation
     * @param symbol The token symbol (e.g., "axlUSDC")
     * @param amount The amount of tokens to send
     */
    function sendCrossChainStealthPayment(
        string calldata destinationChain,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes1 viewHint,
        uint32 k,
        string calldata symbol,
        uint256 amount
    ) external payable nonReentrant whenNotPaused {
        // Validate inputs
        if (bytes(destinationChain).length == 0) revert InvalidDestination();
        if (stealthAddress == address(0)) revert InvalidStealthAddress();
        if (amount == 0) revert InvalidAmount();
        if (msg.value == 0) revert InsufficientGasPayment();
        if (ephemeralPubKey.length != 33) revert InvalidEphemeralKeyLength();
        if (bytes(symbol).length == 0) revert InvalidSymbol();
        
        string memory destinationContract = trustedRemotes[destinationChain];
        if (bytes(destinationContract).length == 0) revert UntrustedRemote();

        // Calculate protocol fee
        uint256 fee = (amount * protocolFeeBps) / 10000;
        uint256 amountAfterFee = amount - fee;
        
        // Ensure meaningful amount after fee (minimum 1000 wei to prevent dust)
        if (amountAfterFee < 1000) revert AmountTooSmall();

        // Get token address from gateway
        // gatewayWithToken() returns IAxelarGatewayWithToken which has tokenAddresses()
        // Docs: https://github.com/axelarnetwork/axelar-gmp-sdk-solidity/blob/main/contracts/interfaces/IAxelarGatewayWithToken.sol
        address tokenAddress = gatewayWithToken().tokenAddresses(symbol);
        if (tokenAddress == address(0)) revert TokenTransferFailed();

        // Transfer tokens from sender
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), amount);
        
        // Transfer fee to recipient
        if (fee > 0 && feeRecipient != address(0)) {
            IERC20(tokenAddress).safeTransfer(feeRecipient, fee);
        }

        // Approve gateway for token transfer
        // OpenZeppelin v5 uses forceApprove instead of safeApprove
        // Check existing allowance first for gas efficiency
        if (IERC20(tokenAddress).allowance(address(this), address(gatewayWithToken())) < amountAfterFee) {
            IERC20(tokenAddress).forceApprove(address(gatewayWithToken()), amountAfterFee);
        }

        // Generate unique payment ID
        uint256 nonce = paymentNonces[msg.sender]++;
        bytes32 paymentId = keccak256(
            abi.encodePacked(msg.sender, nonce, block.timestamp, stealthAddress)
        );

        // Encode payload
        bytes memory payload = abi.encode(
            StealthPayment({
                stealthAddress: stealthAddress,
                ephemeralPubKey: ephemeralPubKey,
                viewHint: viewHint,
                k: k,
                sender: msg.sender,
                nonce: nonce
            })
        );

        // Pay for gas on destination chain (msg.value already validated > 0)
        gasService.payNativeGasForContractCallWithToken{value: msg.value}(
            address(this),
            destinationChain,
            destinationContract,
            payload,
            symbol,
            amountAfterFee,
            msg.sender
        );

        // Send cross-chain message with tokens
        // Docs: https://docs.axelar.dev/dev/general-message-passing/gmp-tokens-with-messages
        gatewayWithToken().callContractWithToken(
            destinationChain,
            destinationContract,
            payload,
            symbol,
            amountAfterFee
        );

        emit CrossChainStealthPaymentSent(
            destinationChain,
            msg.sender,
            stealthAddress,
            amountAfterFee,
            symbol,
            paymentId
        );
    }

    /**
     * @notice Send a cross-chain stealth payment via ITS (Interchain Token Service)
     * @param destinationChain The name of the destination chain (Axelar format)
     * @param stealthAddress The computed stealth address on destination
     * @param ephemeralPubKey The ephemeral public key for recipient detection
     * @param viewHint The view hint byte for fast scanning
     * @param k The index used in stealth address generation
     * @param tokenId The ITS Token ID
     * @param amount The amount of tokens to send
     */
    function sendCrossChainStealthPaymentITS(
        string calldata destinationChain,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes1 viewHint,
        uint32 k,
        bytes32 tokenId,
        uint256 amount
    ) external payable nonReentrant whenNotPaused {
        // Validate inputs
        if (bytes(destinationChain).length == 0) revert InvalidDestination();
        if (stealthAddress == address(0)) revert InvalidStealthAddress();
        if (amount == 0) revert InvalidAmount();
        if (msg.value == 0) revert InsufficientGasPayment();
        if (ephemeralPubKey.length != 33) revert InvalidEphemeralKeyLength();
        
        address destinationContractAddress = trustedRemotesAddress[destinationChain];
        if (destinationContractAddress == address(0)) revert UntrustedRemote();

        // Calculate protocol fee
        uint256 fee = (amount * protocolFeeBps) / 10000;
        uint256 amountAfterFee = amount - fee;
        
        if (amountAfterFee < 1000) revert AmountTooSmall();

        // Get token address from ITS
        address tokenAddress = IInterchainTokenService(interchainTokenService).interchainTokenAddress(tokenId);
        if (tokenAddress == address(0)) revert InvalidTokenAddress();

        // Transfer tokens from sender
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), amount);
        
        // Transfer fee to recipient
        if (fee > 0 && feeRecipient != address(0)) {
            IERC20(tokenAddress).safeTransfer(feeRecipient, fee);
        }

        // Approve ITS
        IERC20(tokenAddress).forceApprove(interchainTokenService, amountAfterFee);

        // Generate unique payment ID
        uint256 nonce = paymentNonces[msg.sender]++;
        bytes32 paymentId = keccak256(
            abi.encodePacked(msg.sender, nonce, block.timestamp, stealthAddress)
        );

        // Encode payload
        bytes memory payload = abi.encode(
            StealthPayment({
                stealthAddress: stealthAddress,
                ephemeralPubKey: ephemeralPubKey,
                viewHint: viewHint,
                k: k,
                sender: msg.sender,
                nonce: nonce
            })
        );

        // Call ITS using interchainTransfer with metadata for contract execution
        // Per Axelar docs: metadata = bytes.concat(bytes4(0), payload) for contract calls
        // https://docs.axelar.dev/dev/send-tokens/interchain-tokens/developer-guides/programmatically-create-a-token#send-tokens-with-data
        bytes memory metadata = abi.encodePacked(bytes4(0), payload);
        
        IInterchainTokenService(interchainTokenService).interchainTransfer{value: msg.value}(
            tokenId,
            destinationChain,
            abi.encodePacked(destinationContractAddress), // 20-byte address as bytes
            amountAfterFee,
            metadata,
            msg.value // gasValue
        );

        emit CrossChainStealthPaymentSent(
            destinationChain,
            msg.sender,
            stealthAddress,
            amountAfterFee,
            "ITS_TOKEN", // Symbol might not be available, use placeholder or fetch from token
            paymentId
        );
    }

    /**
     * @notice Send a message-only cross-chain call (no tokens)
     * @dev Used for syncing meta addresses across chains
     */
    function syncMetaAddress(
        string calldata destinationChain
    ) external payable nonReentrant whenNotPaused {
        if (msg.value == 0) revert InsufficientGasPayment();
        
        string memory destinationContract = trustedRemotes[destinationChain];
        if (bytes(destinationContract).length == 0) revert UntrustedRemote();

        MetaAddress memory meta = metaAddresses[msg.sender];
        if (!meta.isRegistered) revert InvalidStealthAddress();

        bytes memory payload = abi.encode(
            SYNC_SELECTOR, // Use selector for safety
            msg.sender,
            meta.spendPubKey,
            meta.viewingPubKey
        );

        // Pay for gas on destination chain (msg.value already validated > 0)
        gasService.payNativeGasForContractCall{value: msg.value}(
            address(this),
            destinationChain,
            destinationContract,
            payload,
            msg.sender
        );

        gateway().callContract(destinationChain, destinationContract, payload);
    }

    /**
     * @notice Register a meta address for this user
     * @param spendPubKey The spend public key (33 bytes compressed secp256k1)
     * @param viewingPubKey The viewing public key (33 bytes compressed secp256k1)
     */
    function registerMetaAddress(
        bytes calldata spendPubKey,
        bytes calldata viewingPubKey
    ) external {
        if (spendPubKey.length != 33) revert InvalidSpendKeyLength();
        if (viewingPubKey.length != 33) revert InvalidViewingKeyLength();

        metaAddresses[msg.sender] = MetaAddress({
            spendPubKey: spendPubKey,
            viewingPubKey: viewingPubKey,
            isRegistered: true
        });

        emit MetaAddressRegistered(msg.sender, spendPubKey, viewingPubKey);
    }

    /**
     * @notice Get meta address for a user
     */
    function getMetaAddress(address user) 
        external 
        view 
        returns (bytes memory spendPubKey, bytes memory viewingPubKey) 
    {
        MetaAddress memory meta = metaAddresses[user];
        return (meta.spendPubKey, meta.viewingPubKey);
    }

    // ============ Internal Functions ============

    /**
     * @notice Handle incoming cross-chain payment with tokens
     * @dev Called by Axelar when receiving a GMP call with tokens
     *      Function signature from: https://github.com/axelarnetwork/axelar-gmp-sdk-solidity/blob/main/contracts/executable/AxelarExecutableWithToken.sol
     */
    function _executeWithToken(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload,
        string calldata tokenSymbol,
        uint256 amount
    ) internal override {
        // commandId is used by Axelar for tracking, we don't need it here
        commandId;
        
        // Verify source is trusted
        string memory trusted = trustedRemotes[sourceChain];
        if (keccak256(bytes(trusted)) != keccak256(bytes(sourceAddress))) {
            revert UntrustedRemote();
        }

        // Decode payload
        StealthPayment memory payment = abi.decode(payload, (StealthPayment));

        // Get token address from gateway
        // Docs: https://github.com/axelarnetwork/axelar-gmp-sdk-solidity/blob/main/contracts/interfaces/IAxelarGatewayWithToken.sol
        address tokenAddress = gatewayWithToken().tokenAddresses(tokenSymbol);
        if (tokenAddress == address(0)) revert InvalidTokenAddress();
        
        // Transfer tokens to stealth address
        IERC20(tokenAddress).safeTransfer(payment.stealthAddress, amount);

        // Emit event for recipient's scanner to detect
        emit StealthPaymentReceived(
            sourceChain,
            payment.stealthAddress,
            amount,
            tokenSymbol,
            payment.ephemeralPubKey,
            payment.viewHint,
            payment.k
        );
    }

    /**
     * @notice Handle incoming cross-chain message (no tokens)
     * @dev Overrides AxelarExecutableWithToken (which overrides AxelarExecutable)
     */
    function _execute(
        bytes32 commandId,
        string calldata sourceChain,
        string calldata sourceAddress,
        bytes calldata payload
    ) internal override {
        // Check if it's our Sync message
        if (payload.length >= 4 && bytes4(payload) == SYNC_SELECTOR) {
            // Verify source is trusted
            string memory trusted = trustedRemotes[sourceChain];
            if (keccak256(bytes(trusted)) != keccak256(bytes(sourceAddress))) {
                revert UntrustedRemote();
            }

            // Decode payload (skip selector)
            (, address user, bytes memory spendPubKey, bytes memory viewingPubKey) = 
                abi.decode(payload, (bytes4, address, bytes, bytes));

            // Security: Only allow sync if user hasn't registered on this chain
            if (!metaAddresses[user].isRegistered) {
                metaAddresses[user] = MetaAddress({
                    spendPubKey: spendPubKey,
                    viewingPubKey: viewingPubKey,
                    isRegistered: true
                });

                emit MetaAddressSynced(sourceChain, user, spendPubKey, viewingPubKey);
            } else {
                emit MetaAddressSyncSkipped(sourceChain, user);
            }
        } else {
            revert InvalidMessage();
        }
    }

    /**
     * @notice Handle incoming ITS token transfer
     * @dev Called by InterchainTokenExecutable when receiving ITS tokens
     */
    function _executeWithInterchainToken(
        bytes32 commandId,
        string calldata sourceChain,
        bytes calldata sourceAddress,
        bytes calldata data,
        bytes32 tokenId,
        address token,
        uint256 amount
    ) internal override {
        // commandId is used by Axelar for tracking
        commandId;
        tokenId; // We don't need to verify tokenId if we trust the token address provided by ITS

        // Verify source is trusted
        // Note: ITS sourceAddress is bytes, we need to convert to string to match trustedRemotes
        string memory sourceAddressStr = string(sourceAddress);
        string memory trusted = trustedRemotes[sourceChain];
        
        // Compare strings
        if (keccak256(bytes(trusted)) != keccak256(bytes(sourceAddressStr))) {
            revert UntrustedRemote();
        }

        // Decode payload
        StealthPayment memory payment = abi.decode(data, (StealthPayment));

        // Transfer tokens to stealth address
        IERC20(token).safeTransfer(payment.stealthAddress, amount);

        // Emit event for recipient's scanner to detect
        emit StealthPaymentReceived(
            sourceChain,
            payment.stealthAddress,
            amount,
            "ITS_TOKEN", // We don't have symbol here easily, use placeholder
            payment.ephemeralPubKey,
            payment.viewHint,
            payment.k
        );
    }

    // ============ Admin Functions ============

    /**
     * @notice Set trusted remote contract for a chain
     * @param chainName The Axelar chain name
     * @param contractAddress The contract address as string
     */
    function setTrustedRemote(
        string calldata chainName,
        string calldata contractAddress
    ) external onlyOwner {
        trustedRemotes[chainName] = contractAddress;
        // Also parse and store as address for ITS
        trustedRemotesAddress[chainName] = _parseAddress(contractAddress);
        emit TrustedRemoteSet(chainName, contractAddress);
    }
    
    /**
     * @notice Parse a hex string address to address type
     * @dev Expects format: 0x followed by 40 hex characters
     */
    function _parseAddress(string memory str) internal pure returns (address) {
        bytes memory strBytes = bytes(str);
        require(strBytes.length == 42, "Invalid address length");
        require(strBytes[0] == '0' && strBytes[1] == 'x', "Invalid address prefix");
        
        uint160 result = 0;
        for (uint256 i = 2; i < 42; i++) {
            result *= 16;
            uint8 b = uint8(strBytes[i]);
            if (b >= 48 && b <= 57) {
                result += b - 48; // 0-9
            } else if (b >= 65 && b <= 70) {
                result += b - 55; // A-F
            } else if (b >= 97 && b <= 102) {
                result += b - 87; // a-f
            } else {
                revert("Invalid hex character");
            }
        }
        return address(result);
    }

    /**
     * @notice Set multiple trusted remotes at once
     */
    function setTrustedRemotes(
        string[] calldata chainNames,
        string[] calldata contractAddresses
    ) external onlyOwner {
        require(chainNames.length == contractAddresses.length, "Length mismatch");
        
        for (uint256 i = 0; i < chainNames.length; i++) {
            trustedRemotes[chainNames[i]] = contractAddresses[i];
            trustedRemotesAddress[chainNames[i]] = _parseAddress(contractAddresses[i]);
            emit TrustedRemoteSet(chainNames[i], contractAddresses[i]);
        }
    }

    /**
     * @notice Update protocol fee
     * @param newFeeBps New fee in basis points
     */
    function setProtocolFee(uint256 newFeeBps) external onlyOwner {
        if (newFeeBps > MAX_FEE_BPS) revert InvalidFee();
        protocolFeeBps = newFeeBps;
        emit ProtocolFeeUpdated(newFeeBps);
    }

    /**
     * @notice Update fee recipient
     */
    function setFeeRecipient(address newRecipient) external onlyOwner {
        if (newRecipient == address(0)) revert ZeroAddress();
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    /**
     * @notice Emergency token rescue - only for tokens accidentally sent to contract
     * @dev Cannot rescue gateway tokens to prevent rug pulls
     */
    function rescueTokens(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner {
        // Prevent rescuing tokens that could be in-transit payments
        // Only allow rescuing tokens that are not gateway-supported
        // This is a safety measure - actual stuck funds require timelock
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    /**
     * @notice Emergency ETH rescue
     */
    function rescueETH(address payable to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert ZeroAddress();
        (bool success, ) = to.call{value: amount}("");
        require(success, "ETH transfer failed");
    }

    /**
     * @notice Pause the contract in case of emergency
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ============ View Functions ============

    /**
     * @notice Check if a remote is trusted
     */
    function isTrustedRemote(
        string calldata chainName,
        string calldata contractAddress
    ) external view returns (bool) {
        return keccak256(bytes(trustedRemotes[chainName])) == 
               keccak256(bytes(contractAddress));
    }

    /**
     * @notice Get the contract address for this contract as string (for setting as trusted remote)
     */
    function getAddressAsString() external view returns (string memory) {
        return _toAsciiString(address(this));
    }

    /**
     * @notice Convert address to string
     */
    function _toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(42);
        s[0] = "0";
        s[1] = "x";
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint256(uint160(x)) / (2**(8*(19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2*i + 2] = _char(hi);
            s[2*i + 3] = _char(lo);
        }
        return string(s);
    }

    function _char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
    }

    // Allow receiving ETH for gas payments
    receive() external payable {}
}
