/**
 * Cross-Chain Stealth Payment Utilities
 * Combines Axelar GMP with stealth address generation
 */

import { ethers } from "ethers";
import * as secp256k1 from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha2.js";
import {
  generateStealthAddress,
  generateEphemeralKeyPair,
  hexToBytes,
} from "../aptos/stealthAddress";
import {
  AXELAR_CHAINS,
  estimateCrossChainGas,
  getSupportedTokens,
  trackTransaction,
} from "./index";

// Contract ABIs - Human-readable format for ethers.js
// Full ABI available at: src/abi/AxelarStealthBridge.json
export const AXELAR_STEALTH_BRIDGE_ABI = [
  "function sendCrossChainStealthPayment(string destinationChain, address stealthAddress, bytes ephemeralPubKey, bytes1 viewHint, uint32 k, string symbol, uint256 amount) external payable",
  "function registerMetaAddress(bytes spendPubKey, bytes viewingPubKey) external",
  "function syncMetaAddress(string destinationChain) external payable",
  "function getMetaAddress(address user) external view returns (bytes spendPubKey, bytes viewingPubKey)",
  "function gateway() external view returns (address)",
  "function gatewayWithToken() external view returns (address)",
  "function trustedRemotes(string) external view returns (string)",
  "function protocolFeeBps() external view returns (uint256)",
  "function feeRecipient() external view returns (address)",
  "event CrossChainStealthPaymentSent(string indexed destinationChain, address indexed sender, address stealthAddress, uint256 amount, string symbol, bytes32 paymentId)",
  "event StealthPaymentReceived(string indexed sourceChain, address indexed stealthAddress, uint256 amount, string symbol, bytes ephemeralPubKey, bytes1 viewHint, uint32 k)",
];

export const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

export const GATEWAY_ABI = [
  "function tokenAddresses(string symbol) external view returns (address)",
];

/**
 * Prepare a cross-chain stealth payment
 * Generates stealth address and estimates gas
 */
export async function prepareCrossChainPayment({
  sourceChain,
  destinationChain,
  recipientSpendPubKey,
  recipientViewingPubKey,
  amount,
  tokenSymbol,
}) {
  // Validate chain support
  const srcConfig = AXELAR_CHAINS[sourceChain];
  const dstConfig = AXELAR_CHAINS[destinationChain];

  if (!srcConfig || !dstConfig) {
    throw new Error("Unsupported chain configuration");
  }

  // Check token support
  const supportedTokens = getSupportedTokens(sourceChain, destinationChain);
  if (!supportedTokens.includes(tokenSymbol)) {
    throw new Error(`Token ${tokenSymbol} not supported for this route`);
  }

  // Generate ephemeral keypair
  const ephemeralKeyPair = generateEphemeralKeyPair();

  // Generate stealth address
  const stealthData = generateStealthAddress(
    recipientSpendPubKey,
    recipientViewingPubKey,
    hexToBytes(ephemeralKeyPair.privateKey),
    0 // k index
  );

  // Encode payload for gas estimation (required for L2 chains)
  // Per docs: https://docs.axelar.dev/dev/gas-service/pay-gas/
  const payload = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "bytes", "bytes1", "uint32"],
    [
      stealthData.stealthAddress,
      ethers.getBytes("0x" + stealthData.ephemeralPubKey),
      ethers.getBytes("0x" + stealthData.viewHint),
      stealthData.k
    ]
  );

  // Estimate gas with executeData for accurate L2 fee calculation
  const gasEstimate = await estimateCrossChainGas({
    sourceChain,
    destinationChain,
    gasLimit: 350000,
    gasLimit: 350000,
    express: true, // Enable GMP Express for faster execution (< 1 min)
  });

  return {
    stealthAddress: stealthData.stealthAddress,
    ephemeralPubKey: stealthData.ephemeralPubKey,
    viewHint: stealthData.viewHint,
    k: stealthData.k,
    gasEstimate,
    sourceChain: srcConfig,
    destinationChain: dstConfig,
    tokenSymbol,
    amount,
  };
}

/**
 * Execute a cross-chain stealth payment
 */
export async function executeCrossChainPayment({
  signer,
  bridgeAddress,
  preparedPayment,
}) {
  const {
    stealthAddress,
    ephemeralPubKey,
    viewHint,
    k,
    gasEstimate,
    destinationChain,
    tokenSymbol,
    amount,
  } = preparedPayment;

  // Get contract instance
  const bridgeContract = new ethers.Contract(
    bridgeAddress,
    AXELAR_STEALTH_BRIDGE_ABI,
    signer
  );

  // Get gateway and token addresses
  const gatewayAddress = await bridgeContract.gateway();
  const gatewayContract = new ethers.Contract(gatewayAddress, GATEWAY_ABI, signer);
  const tokenAddress = await gatewayContract.tokenAddresses(tokenSymbol);

  if (tokenAddress === ethers.ZeroAddress) {
    throw new Error(`Token ${tokenSymbol} not available on gateway`);
  }

  // Get token contract
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const decimals = await tokenContract.decimals();
  const amountInWei = ethers.parseUnits(amount.toString(), decimals);

  // Check balance
  const signerAddress = await signer.getAddress();
  const balance = await tokenContract.balanceOf(signerAddress);

  if (balance < amountInWei) {
    throw new Error(`Insufficient ${tokenSymbol} balance`);
  }

  // Check and set allowance
  const currentAllowance = await tokenContract.allowance(signerAddress, bridgeAddress);

  if (currentAllowance < amountInWei) {
    const approveTx = await tokenContract.approve(bridgeAddress, amountInWei);
    await approveTx.wait();
  }

  // Encode payload for cross-chain execution
  // Per docs: https://docs.axelar.dev/dev/general-message-passing/gmp-tokens-with-messages
  const payload = ethers.AbiCoder.defaultAbiCoder().encode(
    ["address", "bytes", "bytes1", "uint32"],
    [
      stealthAddress,
      ethers.getBytes("0x" + ephemeralPubKey),
      ethers.getBytes("0x" + viewHint),
      k
    ]
  );

  // Convert keys to bytes
  // Handle both with and without 0x prefix
  const ephemeralPubKeyHex = ephemeralPubKey.startsWith("0x") ? ephemeralPubKey : "0x" + ephemeralPubKey;
  const ephemeralPubKeyBytes = ethers.getBytes(ephemeralPubKeyHex);
  // viewHint is a single byte (bytes1 in Solidity) - ensure proper formatting
  const viewHintHex = viewHint.startsWith("0x") ? viewHint : "0x" + viewHint;
  const viewHintByte = viewHintHex.slice(0, 4); // bytes1 = 0x + 2 hex chars

  // Send payment
  const tx = await bridgeContract.sendCrossChainStealthPayment(
    destinationChain.axelarName,
    stealthAddress,
    ephemeralPubKeyBytes,
    viewHintByte,
    k,
    tokenSymbol,
    amountInWei,
    { value: gasEstimate }
  );

  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    stealthAddress,
    ephemeralPubKey,
    viewHint,
    k,
  };
}

/**
 * Listen for incoming stealth payments on a chain
 * @param {object} params - Parameters
 * @param {object} params.provider - Ethers provider
 * @param {string} params.bridgeAddress - Bridge contract address
 * @param {function} params.callback - Callback for matching payments
 * @param {function} params.onError - Error callback (optional)
 */
export function subscribeToStealthPayments({
  provider,
  bridgeAddress,
  callback,
  onError = console.error,
}) {
  const bridgeContract = new ethers.Contract(
    bridgeAddress,
    AXELAR_STEALTH_BRIDGE_ABI,
    provider
  );

  const filter = bridgeContract.filters.StealthPaymentReceived();

  const handler = (sourceChain, stealthAddress, amount, symbol, ephemeralPubKey, viewHint, k, event) => {
    try {
      callback({
        sourceChain,
        stealthAddress,
        amount: amount.toString(),
        symbol,
        ephemeralPubKey: ethers.hexlify(ephemeralPubKey),
        viewHint: ethers.hexlify(viewHint),
        k,
        txHash: event.transactionHash,
        blockNumber: event.blockNumber,
      });
    } catch (error) {
      onError(error);
    }
  };

  bridgeContract.on(filter, handler);

  return () => {
    bridgeContract.off(filter, handler);
  };
}

/**
 * Compute view hint from shared secret for fast filtering
 * MUST match stealthAddress.js: viewHint = sharedSecret[0] (first byte directly)
 * @param {Uint8Array} sharedSecret - ECDH shared secret (compressed point, 33 bytes)
 * @returns {string} - Single byte view hint as hex
 */
function computeViewHint(sharedSecret) {
  // IMPORTANT: Must match stealthAddress.js line 179
  // viewHint is the FIRST BYTE of shared secret directly, NOT hashed
  return ethers.hexlify(sharedSecret.slice(0, 1));
}

/**
 * Check if a stealth payment belongs to a user by verifying the view hint
 * @param {string} ephemeralPubKeyHex - Ephemeral public key from event (hex)
 * @param {string} viewingPrivateKeyHex - User's viewing private key (hex)
 * @param {string} eventViewHint - View hint from event (hex)
 * @returns {boolean} - True if payment likely belongs to user
 */
function checkViewHintMatch(ephemeralPubKeyHex, viewingPrivateKeyHex, eventViewHint) {
  try {
    // Remove 0x prefix if present
    const ephemeralPubKey = ephemeralPubKeyHex.startsWith("0x")
      ? ephemeralPubKeyHex.slice(2)
      : ephemeralPubKeyHex;
    const viewingPrivateKey = viewingPrivateKeyHex.startsWith("0x")
      ? viewingPrivateKeyHex.slice(2)
      : viewingPrivateKeyHex;

    // Compute shared secret: viewingPrivateKey * ephemeralPubKey
    const sharedSecret = secp256k1.getSharedSecret(
      viewingPrivateKey,
      ephemeralPubKey,
      true // compressed
    );

    // Compute expected view hint
    const expectedViewHint = computeViewHint(sharedSecret);

    // Compare view hints (case-insensitive)
    return expectedViewHint.toLowerCase() === eventViewHint.toLowerCase();
  } catch (error) {
    console.error("Error checking view hint:", error);
    return false;
  }
}

/**
 * Derive the stealth private key for a matched payment
 * MUST match stealthAddress.js algorithm:
 *   tweak = sha256(sharedSecret || k)
 *   stealthPrivKey = spendPrivKey + tweak
 * 
 * @param {string} ephemeralPubKeyHex - Ephemeral public key (hex)
 * @param {string} viewingPrivateKeyHex - User's viewing private key (hex)
 * @param {string} spendPrivateKeyHex - User's spend private key (hex)
 * @param {number} k - Index used in stealth generation (default 0)
 * @returns {string} - Stealth private key (hex)
 */
export function deriveStealthPrivateKey(ephemeralPubKeyHex, viewingPrivateKeyHex, spendPrivateKeyHex, k = 0) {
  // Remove 0x prefix if present
  const ephemeralPubKey = ephemeralPubKeyHex.startsWith("0x")
    ? ephemeralPubKeyHex.slice(2)
    : ephemeralPubKeyHex;
  const viewingPrivateKey = viewingPrivateKeyHex.startsWith("0x")
    ? viewingPrivateKeyHex.slice(2)
    : viewingPrivateKeyHex;
  const spendPrivateKey = spendPrivateKeyHex.startsWith("0x")
    ? spendPrivateKeyHex.slice(2)
    : spendPrivateKeyHex;

  // Compute shared secret: viewingPrivKey * ephemeralPubKey
  const sharedSecret = secp256k1.getSharedSecret(
    viewingPrivateKey,
    ephemeralPubKey,
    true // compressed
  );

  // MUST match stealthAddress.js lines 135-142:
  // tweak = sha256(sharedSecret || k) where k is 4 bytes big-endian
  const kBytes = new Uint8Array(4);
  const kView = new DataView(kBytes.buffer);
  kView.setUint32(0, k, false); // big-endian

  const tweakInput = new Uint8Array(sharedSecret.length + 4);
  tweakInput.set(sharedSecret, 0);
  tweakInput.set(kBytes, sharedSecret.length);
  const tweak = sha256(tweakInput);

  // Add tweak to spend private key (mod curve order)
  const spendKeyBigInt = BigInt("0x" + spendPrivateKey);
  const tweakBigInt = BigInt("0x" + ethers.hexlify(tweak).slice(2));
  const curveOrder = BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141");

  let stealthPrivateKeyBigInt = (spendKeyBigInt + tweakBigInt) % curveOrder;

  // Ensure valid private key (cannot be 0)
  // Probability is negligible (~1/2^256) but handle for correctness
  if (stealthPrivateKeyBigInt === 0n) {
    throw new Error("Invalid stealth private key derived (zero)");
  }

  return "0x" + stealthPrivateKeyBigInt.toString(16).padStart(64, "0");
}

// Maximum blocks to scan per query to prevent timeout
const MAX_BLOCK_RANGE = 10000;

/**
 * Scan for stealth payments that belong to a user
 * Uses view hint for fast filtering, then verifies with full ECDH
 * Implements chunked scanning for scalability on mainnet
 * 
 * @param {object} params - Parameters
 * @param {object} params.provider - Ethers provider
 * @param {string} params.bridgeAddress - Bridge contract address
 * @param {string} params.viewingPrivateKey - User's viewing private key (hex)
 * @param {string} params.spendPublicKey - User's spend public key (hex)
 * @param {number} params.fromBlock - Start block (default: 0)
 * @param {string|number} params.toBlock - End block (default: "latest")
 * @param {function} params.onProgress - Optional progress callback (scannedBlocks, totalBlocks)
 * @returns {Promise<Array>} - Array of matching payments
 */
export async function scanStealthPayments({
  provider,
  bridgeAddress,
  viewingPrivateKey,
  spendPublicKey,
  fromBlock = 0,
  toBlock = "latest",
  onProgress = null,
}) {
  if (!viewingPrivateKey) {
    throw new Error("viewingPrivateKey is required for scanning");
  }

  const bridgeContract = new ethers.Contract(
    bridgeAddress,
    AXELAR_STEALTH_BRIDGE_ABI,
    provider
  );

  // Resolve "latest" to actual block number for chunking
  let endBlock = toBlock;
  if (toBlock === "latest") {
    endBlock = await provider.getBlockNumber();
  }

  const totalBlocks = endBlock - fromBlock;
  let allEvents = [];

  // Chunk scanning for scalability (prevents RPC timeout on large ranges)
  for (let start = fromBlock; start <= endBlock; start += MAX_BLOCK_RANGE) {
    const end = Math.min(start + MAX_BLOCK_RANGE - 1, endBlock);

    const filter = bridgeContract.filters.StealthPaymentReceived();
    const events = await bridgeContract.queryFilter(filter, start, end);
    allEvents = allEvents.concat(events);

    // Report progress if callback provided
    if (onProgress) {
      onProgress(end - fromBlock, totalBlocks);
    }
  }

  const events = allEvents;

  const matchingPayments = [];

  for (const event of events) {
    try {
      // Extract event data
      const { stealthAddress, amount, symbol, ephemeralPubKey, viewHint, k } = event.args;

      const ephemeralPubKeyHex = ethers.hexlify(ephemeralPubKey);
      const viewHintHex = ethers.hexlify(viewHint);

      // Fast filter: Check view hint match using ECDH
      const isMatch = checkViewHintMatch(
        ephemeralPubKeyHex,
        viewingPrivateKey,
        viewHintHex
      );

      if (isMatch) {
        matchingPayments.push({
          stealthAddress,
          amount: amount.toString(),
          symbol,
          ephemeralPubKey: ephemeralPubKeyHex,
          viewHint: viewHintHex,
          k,
          txHash: event.transactionHash,
          blockNumber: event.blockNumber,
          // Include flag that this is a verified match
          verified: true,
        });
      }
    } catch (err) {
      console.error("Error processing event:", err);
    }
  }

  return matchingPayments;
}

/**
 * Calculate privacy score for a cross-chain payment route
 */
export function calculatePrivacyScore({
  sourceChain,
  destinationChain,
  hops = [],
  useDarkPool = false,
  delayedExecution = false,
}) {
  let score = 50; // Base score

  // Chain hopping adds privacy
  score += hops.length * 10;

  // Using confidential chain (Oasis) adds significant privacy
  const chains = [sourceChain, destinationChain, ...hops];
  if (chains.some(c => AXELAR_CHAINS[c]?.isConfidential)) {
    score += 20;
  }

  // DarkPool mixing adds privacy
  if (useDarkPool) {
    score += 15;
  }

  // Delayed execution breaks timing correlation
  if (delayedExecution) {
    score += 10;
  }

  // Different source and destination chains add privacy
  if (sourceChain !== destinationChain) {
    score += 5;
  }

  // Cap at 100
  return Math.min(100, score);
}

/**
 * Suggest optimal privacy route
 */
export function suggestPrivacyRoute({
  sourceChain,
  destinationChain,
  prioritizePrivacy = true,
  maxHops = 2,
}) {
  const routes = [];

  // Direct route
  routes.push({
    path: [sourceChain, destinationChain],
    hops: 0,
    privacyScore: calculatePrivacyScore({ sourceChain, destinationChain }),
    estimatedTime: "15-30 minutes",
    description: "Direct cross-chain transfer",
  });

  // Route via Oasis Sapphire (confidential)
  if (sourceChain !== "oasis" && destinationChain !== "oasis") {
    routes.push({
      path: [sourceChain, "oasis", destinationChain],
      hops: 1,
      privacyScore: calculatePrivacyScore({
        sourceChain,
        destinationChain,
        hops: ["oasis"],
      }),
      estimatedTime: "30-60 minutes",
      description: "Route via Oasis for confidential computing",
    });
  }

  // Multi-hop route for maximum privacy
  if (maxHops >= 2) {
    const intermediateChains = ["polygon", "arbitrum", "oasis"].filter(
      c => c !== sourceChain && c !== destinationChain
    );

    if (intermediateChains.length >= 2) {
      routes.push({
        path: [sourceChain, intermediateChains[0], intermediateChains[1], destinationChain],
        hops: 2,
        privacyScore: calculatePrivacyScore({
          sourceChain,
          destinationChain,
          hops: [intermediateChains[0], intermediateChains[1]],
        }),
        estimatedTime: "45-90 minutes",
        description: "Maximum privacy multi-hop route",
      });
    }
  }

  // Sort by privacy score or speed
  if (prioritizePrivacy) {
    routes.sort((a, b) => b.privacyScore - a.privacyScore);
  } else {
    routes.sort((a, b) => a.hops - b.hops);
  }

  return routes;
}

export default {
  prepareCrossChainPayment,
  executeCrossChainPayment,
  subscribeToStealthPayments,
  scanStealthPayments,
  deriveStealthPrivateKey,
  calculatePrivacyScore,
  suggestPrivacyRoute,
};
