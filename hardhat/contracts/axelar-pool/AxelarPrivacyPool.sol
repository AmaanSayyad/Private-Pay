// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import {Groth16Verifier} from "./Groth16Verifier.sol";

interface IMimcSpongeHasher {
    function MiMCSponge(uint256 xL_in, uint256 xR_in, uint256 k) external pure returns (uint256 xL, uint256 xR);
}

/**
 * AxelarPrivacyPool (fixed denomination, MVP)
 *
 * Goal: make the source of an Axelar send unlinkable by having Axelar bridge calls
 * originate from this pool contract, not from the user's EOA.
 *
 * This is intentionally fixed-denomination to reduce amount correlation and to
 * keep the circuit and accounting simple.
 */
contract AxelarPrivacyPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Scalar field size for BN254 (Groth16 public inputs must be < r)
    uint256 public constant SNARK_SCALAR_FIELD =
        21888242871839275222246405745257275088548364400416034343698204186575808495617;

    uint32 public constant TREE_LEVELS = 20;
    uint32 public constant ROOT_HISTORY_SIZE = 30;

    IERC20 public immutable token;
    uint256 public immutable denomination;

    // MiMC sponge hasher contract (Tornado-style, used for commitment + Merkle tree hashing)
    IMimcSpongeHasher public immutable hasher;

    // AxelarStealthBridge contract address (destination for pool -> bridge call)
    address public immutable axelarStealthBridge;

    // ITS tokenId used by AxelarStealthBridge.sendCrossChainStealthPaymentITS
    bytes32 public immutable itsTokenId;

    // GMP symbol used by AxelarStealthBridge.sendCrossChainStealthPayment
    // (leave empty string to use ITS mode only)
    string public gmpSymbol;

    Groth16Verifier public immutable verifier;

    // --- Merkle tree state (incremental) ---
    uint32 public nextIndex = 0;
    uint32 public currentRootIndex = 0;

    uint256[TREE_LEVELS] public filledSubtrees;
    uint256[TREE_LEVELS] public zeros;
    uint256[ROOT_HISTORY_SIZE] public roots;

    // --- Nullifiers ---
    mapping(uint256 => bool) public nullifierHashes;

    event Deposit(uint256 indexed commitment, uint32 leafIndex, uint256 timestamp);
    event WithdrawalAndBridge(
        uint256 indexed nullifierHash,
        address indexed relayer,
        string destinationChain,
        address stealthAddress,
        uint256 amountToBridge,
        uint256 relayerFee
    );

    error InvalidFieldElement();
    error TreeFull();
    error UnknownRoot();
    error NullifierAlreadyUsed();
    error InvalidProof();
    error InvalidRelayerFee();
    error PoolNotConfiguredForITS();
    error PoolNotConfiguredForGMP();

    constructor(
        address token_,
        uint256 denomination_,
        address hasher_,
        address axelarStealthBridge_,
        bytes32 itsTokenId_,
        string memory gmpSymbol_,
        address verifier_
    ) {
        require(token_ != address(0), "token=0");
        require(hasher_ != address(0), "hasher=0");
        require(axelarStealthBridge_ != address(0), "bridge=0");
        require(verifier_ != address(0), "verifier=0");
        require(denomination_ > 0, "denom=0");

        token = IERC20(token_);
        denomination = denomination_;
        hasher = IMimcSpongeHasher(hasher_);
        axelarStealthBridge = axelarStealthBridge_;
        itsTokenId = itsTokenId_;
        gmpSymbol = gmpSymbol_;
        verifier = Groth16Verifier(verifier_);

        // Initialize zero values
        zeros[0] = _hashLeftRight(0, 0);
        for (uint32 i = 1; i < TREE_LEVELS; i++) {
            zeros[i] = _hashLeftRight(zeros[i - 1], zeros[i - 1]);
        }

        for (uint32 i = 0; i < TREE_LEVELS; i++) {
            filledSubtrees[i] = zeros[i];
        }

        roots[0] = zeros[TREE_LEVELS - 1];
    }

    /**
     * Deposit a fixed amount into the pool and add a commitment to the tree.
     *
     * Note: Deposit is public on-chain; the privacy goal is unlinkability
     * between deposit and subsequent withdraw-and-bridge.
     */
    function deposit(uint256 commitment) external nonReentrant {
        if (commitment >= SNARK_SCALAR_FIELD) revert InvalidFieldElement();

        // Pull denomination from depositor
        token.safeTransferFrom(msg.sender, address(this), denomination);

        uint32 index = nextIndex;
        if (index >= uint32(1 << TREE_LEVELS)) revert TreeFull();
        nextIndex = index + 1;

        _insert(commitment);

        emit Deposit(commitment, index, block.timestamp);
    }

    /**
     * Withdraw a fixed note, pay relayer fee, then bridge via Axelar ITS to a stealth address.
     *
     * The relayer submits this tx and pays native gas (msg.value) for Axelar gas service.
     *
     * Public signals are: [root, nullifierHash, extDataHash]
     */
    function withdrawAndBridgeITS(
        uint256 root,
        uint256 nullifierHash,
        uint256 relayerFee,
        string calldata destinationChain,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes1 viewHint,
        uint32 k,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) external payable nonReentrant {
        if (itsTokenId == bytes32(0)) revert PoolNotConfiguredForITS();
        if (root >= SNARK_SCALAR_FIELD || nullifierHash >= SNARK_SCALAR_FIELD) revert InvalidFieldElement();
        if (!isKnownRoot(root)) revert UnknownRoot();
        if (nullifierHashes[nullifierHash]) revert NullifierAlreadyUsed();
        if (relayerFee > denomination) revert InvalidRelayerFee();

        uint256 amountToBridge = denomination - relayerFee;

        // Bind all mutable parameters to the proof via extDataHash (public signal).
        // Use keccak256 and reduce into the SNARK scalar field.
        uint256 extDataHash = uint256(
            keccak256(
                abi.encodePacked(
                    destinationChain,
                    stealthAddress,
                    ephemeralPubKey,
                    viewHint,
                    k,
                    amountToBridge,
                    relayerFee,
                    axelarStealthBridge,
                    itsTokenId
                )
            )
        ) % SNARK_SCALAR_FIELD;

        // Verify Groth16 proof
        bool ok = verifier.verifyProof(
            [a[0], a[1]],
            [[b[0][0], b[0][1]], [b[1][0], b[1][1]]],
            [c[0], c[1]],
            [root, nullifierHash, extDataHash]
        );
        if (!ok) revert InvalidProof();

        // Mark spent
        nullifierHashes[nullifierHash] = true;

        // Pay relayer fee in token (optional)
        if (relayerFee > 0) {
            token.safeTransfer(msg.sender, relayerFee);
        }

        // Approve Axelar bridge to pull tokens from this pool (AxelarStealthBridge uses transferFrom)
        token.forceApprove(axelarStealthBridge, amountToBridge);

        // Call Axelar bridge (pool becomes the on-chain sender)
        (bool success, ) = axelarStealthBridge.call{value: msg.value}(
            abi.encodeWithSignature(
                "sendCrossChainStealthPaymentITS(string,address,bytes,bytes1,uint32,bytes32,uint256)",
                destinationChain,
                stealthAddress,
                ephemeralPubKey,
                viewHint,
                k,
                itsTokenId,
                amountToBridge
            )
        );
        require(success, "Axelar bridge call failed");

        emit WithdrawalAndBridge(
            nullifierHash,
            msg.sender,
            destinationChain,
            stealthAddress,
            amountToBridge,
            relayerFee
        );
    }

    /**
     * Withdraw a fixed note, pay relayer fee, then bridge via Axelar GMP (callContractWithToken)
     * to a trusted remote on the destination chain.
     */
    function withdrawAndBridgeGMP(
        uint256 root,
        uint256 nullifierHash,
        uint256 relayerFee,
        string calldata destinationChain,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes1 viewHint,
        uint32 k,
        uint256[2] calldata a,
        uint256[2][2] calldata b,
        uint256[2] calldata c
    ) external payable nonReentrant {
        if (bytes(gmpSymbol).length == 0) revert PoolNotConfiguredForGMP();
        if (root >= SNARK_SCALAR_FIELD || nullifierHash >= SNARK_SCALAR_FIELD) revert InvalidFieldElement();
        if (!isKnownRoot(root)) revert UnknownRoot();
        if (nullifierHashes[nullifierHash]) revert NullifierAlreadyUsed();
        if (relayerFee > denomination) revert InvalidRelayerFee();

        uint256 amountToBridge = denomination - relayerFee;

        uint256 extDataHash = uint256(
            keccak256(
                abi.encodePacked(
                    destinationChain,
                    stealthAddress,
                    ephemeralPubKey,
                    viewHint,
                    k,
                    amountToBridge,
                    relayerFee,
                    axelarStealthBridge,
                    gmpSymbol
                )
            )
        ) % SNARK_SCALAR_FIELD;

        bool ok = verifier.verifyProof(
            [a[0], a[1]],
            [[b[0][0], b[0][1]], [b[1][0], b[1][1]]],
            [c[0], c[1]],
            [root, nullifierHash, extDataHash]
        );
        if (!ok) revert InvalidProof();

        nullifierHashes[nullifierHash] = true;

        if (relayerFee > 0) {
            token.safeTransfer(msg.sender, relayerFee);
        }

        token.forceApprove(axelarStealthBridge, amountToBridge);

        (bool success, ) = axelarStealthBridge.call{value: msg.value}(
            abi.encodeWithSignature(
                "sendCrossChainStealthPayment(string,address,bytes,bytes1,uint32,string,uint256)",
                destinationChain,
                stealthAddress,
                ephemeralPubKey,
                viewHint,
                k,
                gmpSymbol,
                amountToBridge
            )
        );
        require(success, "Axelar bridge call failed");

        emit WithdrawalAndBridge(
            nullifierHash,
            msg.sender,
            destinationChain,
            stealthAddress,
            amountToBridge,
            relayerFee
        );
    }

    function isKnownRoot(uint256 root) public view returns (bool) {
        if (root == 0) return false;
        for (uint32 i = 0; i < ROOT_HISTORY_SIZE; i++) {
            if (roots[i] == root) return true;
        }
        return false;
    }

    function getLastRoot() external view returns (uint256) {
        return roots[currentRootIndex];
    }

    function _hashLeftRight(uint256 left, uint256 right) internal view returns (uint256) {
        if (left >= SNARK_SCALAR_FIELD || right >= SNARK_SCALAR_FIELD) revert InvalidFieldElement();
        (uint256 xL, ) = hasher.MiMCSponge(left, right, 0);
        return xL;
    }

    function _insert(uint256 leaf) internal {
        uint32 index = nextIndex - 1;
        uint256 current = leaf;

        for (uint32 level = 0; level < TREE_LEVELS; level++) {
            if ((index & 1) == 0) {
                // current is left child
                filledSubtrees[level] = current;
                current = _hashLeftRight(current, zeros[level]);
            } else {
                // current is right child
                current = _hashLeftRight(filledSubtrees[level], current);
            }
            index >>= 1;
        }

        currentRootIndex = (currentRootIndex + 1) % ROOT_HISTORY_SIZE;
        roots[currentRootIndex] = current;
    }
}
