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
  getItsTokenId,
  getSupportedTokens,
  trackTransaction,
} from "./index";

// Contract ABIs - Human-readable format for ethers.js
// Full ABI available at: src/abi/AxelarStealthBridge.json
export const AXELAR_STEALTH_BRIDGE_ABI = [
  "function sendCrossChainStealthPayment(string destinationChain, address stealthAddress, bytes ephemeralPubKey, bytes1 viewHint, uint32 k, string symbol, uint256 amount) external payable",
  "function sendCrossChainStealthPaymentITS(string destinationChain, address stealthAddress, bytes ephemeralPubKey, bytes1 viewHint, uint32 k, bytes32 tokenId, uint256 amount) external payable",
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
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

export const GATEWAY_ABI = [
  "function tokenAddresses(string symbol) external view returns (address)",
];

const ITS_ABI = [
  "function interchainTokenAddress(bytes32 tokenId) external view returns (address)",
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
    sourceChain,
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

  const signerAddress = await signer.getAddress();
  const isItsToken = tokenSymbol === "TUSDC" && Boolean(getItsTokenId("TUSDC"));
  const amountStr = amount?.toString?.() ?? String(amount);

  let tokenAddress = ethers.ZeroAddress;
  let decimals = 18;
  if (isItsToken) {
    const srcCfg = sourceChain || null;
    const itsAddress = srcCfg?.its;
    if (!itsAddress) {
      throw new Error("Missing InterchainTokenService address for source chain");
    }
    const itsContract = new ethers.Contract(itsAddress, ITS_ABI, signer);
    tokenAddress = await itsContract.interchainTokenAddress(getItsTokenId("TUSDC"));
    if (tokenAddress === ethers.ZeroAddress) {
      throw new Error("ITS token address not found for tokenId");
    }
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    decimals = await tokenContract.decimals();
  } else {
    // Get gateway and token addresses (Gateway tokens)
    const gatewayAddress = await bridgeContract.gateway();
    const gatewayContract = new ethers.Contract(gatewayAddress, GATEWAY_ABI, signer);
    tokenAddress = await gatewayContract.tokenAddresses(tokenSymbol);

    if (tokenAddress === ethers.ZeroAddress) {
      throw new Error(`Token ${tokenSymbol} not available on gateway`);
    }

    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    decimals = await tokenContract.decimals();
  }

  // Get token contract
  const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const amountInWei = ethers.parseUnits(amountStr, decimals);

  // Check balance
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

  // Send payment (Gateway vs ITS)
  const tx = isItsToken
    ? await bridgeContract.sendCrossChainStealthPaymentITS(
        destinationChain.axelarName,
        stealthAddress,
        ephemeralPubKeyBytes,
        viewHintByte,
        k,
        getItsTokenId("TUSDC"),
        amountInWei,
        { value: gasEstimate }
      )
    : await bridgeContract.sendCrossChainStealthPayment(
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
 * Fully verify a stealth payment by re-deriving the expected stealth address
 * from (spendPubKey, viewingPrivKey, ephemeralPubKey, k) and comparing.
 *
 * This avoids false positives from the 1-byte viewHint filter.
 */
function deriveExpectedEvmStealthAddress({
  spendPublicKeyHex,
  viewingPrivateKeyHex,
  ephemeralPubKeyHex,
  k = 0,
}) {
  // Normalize hex inputs
  const spendPubKey = spendPublicKeyHex?.startsWith("0x")
    ? spendPublicKeyHex.slice(2)
    : spendPublicKeyHex;
  const viewingPrivKey = viewingPrivateKeyHex?.startsWith("0x")
    ? viewingPrivateKeyHex.slice(2)
    : viewingPrivateKeyHex;
  const ephemeralPubKey = ephemeralPubKeyHex?.startsWith("0x")
    ? ephemeralPubKeyHex.slice(2)
    : ephemeralPubKeyHex;

  if (!spendPubKey || !viewingPrivKey || !ephemeralPubKey) {
    throw new Error("Missing keys for stealth address verification");
  }

  // Compute shared secret (compressed point, 33 bytes)
  const sharedSecret = secp256k1.getSharedSecret(
    viewingPrivKey,
    ephemeralPubKey,
    true
  );

  // tweak = sha256(sharedSecret || k) where k is 4 bytes big-endian
  const kBytes = new Uint8Array(4);
  const kView = new DataView(kBytes.buffer);
  kView.setUint32(0, k, false); // big-endian

  const tweakInput = new Uint8Array(sharedSecret.length + 4);
  tweakInput.set(sharedSecret, 0);
  tweakInput.set(kBytes, sharedSecret.length);
  const tweakBytes = sha256(tweakInput);

  // Convert tweak to bigint
  let tweakBigInt = 0n;
  for (let i = 0; i < tweakBytes.length; i++) {
    tweakBigInt = tweakBigInt * 256n + BigInt(tweakBytes[i]);
  }

  // stealthPubPoint = spendPubPoint + tweak * G
  const spendPoint = secp256k1.Point.fromHex(spendPubKey);
  const tweakPoint = secp256k1.Point.BASE.multiply(tweakBigInt);
  const stealthPubPoint = spendPoint.add(tweakPoint);

  // EVM address = last 20 bytes of keccak256(uncompressed_pubkey[1:])
  const stealthUncompressed = stealthPubPoint.toRawBytes(false); // 65 bytes (0x04 + x + y)
  const pubKeyNoPrefix = stealthUncompressed.slice(1);
  const hashHex = ethers.keccak256(pubKeyNoPrefix); // 0x...
  return ethers.getAddress("0x" + hashHex.slice(-40));
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

const DEFAULT_STEALTH_SCAN_LOOKBACK_BLOCKS = Number(import.meta.env?.VITE_AXELAR_STEALTH_SCAN_LOOKBACK_BLOCKS ?? 90000);
const DEFAULT_STEALTH_SCAN_REORG_SAFETY_BLOCKS = Number(import.meta.env?.VITE_AXELAR_STEALTH_SCAN_REORG_SAFETY_BLOCKS ?? 20);
const MIN_SCAN_CHUNK_SIZE = 1000;

function getSafeLocalStorage() {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function fingerprintKeyHex(hex) {
  try {
    const normalized = hex?.startsWith("0x") ? hex : `0x${hex}`;
    return ethers.keccak256(normalized).slice(2, 10);
  } catch {
    return "unknown";
  }
}

function makeStealthScanCheckpointKey({ chainId, bridgeAddress, viewingPrivateKey }) {
  const addr = (bridgeAddress || "").toLowerCase();
  const viewerFp = fingerprintKeyHex(viewingPrivateKey);
  const cid = chainId != null ? String(chainId) : "unknown";
  return `pp_axelar_stealth_scan_ckpt_v1:${cid}:${addr}:${viewerFp}`;
}

function readScanCheckpoint(key) {
  const ls = getSafeLocalStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.lastScannedBlock !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeScanCheckpoint(key, checkpoint) {
  const ls = getSafeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(key, JSON.stringify(checkpoint));
  } catch {
    // ignore
  }
}

function makeDeployBlockCacheKey({ chainId, address }) {
  const cid = chainId != null ? String(chainId) : "unknown";
  return `pp_contract_deploy_block_v1:${cid}:${(address || "").toLowerCase()}`;
}

function readCachedDeployBlock(key) {
  const ls = getSafeLocalStorage();
  if (!ls) return null;
  try {
    const raw = ls.getItem(key);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
  } catch {
    return null;
  }
}

function writeCachedDeployBlock(key, blockNumber) {
  const ls = getSafeLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(key, String(blockNumber));
  } catch {
    // ignore
  }
}

async function getChainIdSafe(provider) {
  try {
    const net = await provider.getNetwork();
    return Number(net.chainId);
  } catch {
    return null;
  }
}

function looksLikeBlockRangeError(err) {
  const msg = (err?.shortMessage || err?.reason || err?.message || "").toLowerCase();
  if (msg.includes("query exceeds max block range")) return true;
  if (msg.includes("max block range")) return true;
  if (msg.includes("block range") && msg.includes("exceed")) return true;
  const nestedMsg =
    err?.error?.data?.message ||
    err?.error?.message ||
    err?.data?.message ||
    err?.info?.error?.data?.message ||
    "";
  if (String(nestedMsg).toLowerCase().includes("query exceeds max block range")) return true;
  return false;
}

async function findContractDeployBlock(provider, address, latestBlock, { maxProbeSteps = 26 } = {}) {
  // Best-effort: some RPC endpoints do not support historical `eth_getCode` (non-archive),
  // so this may fail; callers should fall back to a lookback window.
  const codeAtLatest = await provider.getCode(address, latestBlock);
  if (!codeAtLatest || codeAtLatest === "0x") return null;

  let high = latestBlock;
  let low = 0;
  let steps = 0;

  // Quick narrowing: probe backwards with exponential steps to reduce binary-search calls.
  let step = 1_000;
  while (steps < maxProbeSteps) {
    steps += 1;
    const probe = Math.max(0, high - step);
    let code;
    try {
      code = await provider.getCode(address, probe);
    } catch {
      return null;
    }
    if (code && code !== "0x") {
      high = probe;
      step *= 2;
      continue;
    }
    low = probe;
    break;
  }

  // Binary search between low (no code) and high (code) for first code block.
  while (low + 1 < high && steps < maxProbeSteps * 3) {
    steps += 1;
    const mid = Math.floor((low + high) / 2);
    let code;
    try {
      code = await provider.getCode(address, mid);
    } catch {
      return null;
    }
    if (code && code !== "0x") {
      high = mid;
    } else {
      low = mid;
    }
  }

  return high;
}

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
 * @param {number} params.fromBlock - Start block (optional; default uses checkpoint/deploy/lookback)
 * @param {string|number} params.toBlock - End block (default: "latest")
 * @param {function} params.onProgress - Optional progress callback (scannedBlocks, totalBlocks)
 * @param {number} params.chainId - Optional chainId (enables stable per-chain checkpoints)
 * @param {boolean} params.useCheckpoint - Whether to resume scanning from checkpoint (default: true)
 * @param {number} params.lookbackBlocks - Fallback lookback window if no checkpoint is available
 * @param {number} params.reorgSafetyBlocks - Reorg safety margin when resuming (default: 20)
 * @param {number} params.chunkSize - Initial scan chunk size (auto-reduced on RPC limits)
 * @returns {Promise<Array>} - Array of matching payments
 */
export async function scanStealthPayments({
  provider,
  bridgeAddress,
  viewingPrivateKey,
  spendPublicKey,
  fromBlock,
  toBlock = "latest",
  onProgress = null,
  chainId = null,
  useCheckpoint = true,
  lookbackBlocks = DEFAULT_STEALTH_SCAN_LOOKBACK_BLOCKS,
  reorgSafetyBlocks = DEFAULT_STEALTH_SCAN_REORG_SAFETY_BLOCKS,
  chunkSize = MAX_BLOCK_RANGE,
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

  const resolvedChainId = chainId ?? (await getChainIdSafe(provider));

  let startBlock = null;
  if (fromBlock != null) {
    startBlock = Number(fromBlock);
  }

  // 1) Resume from checkpoint if available (fastest and best UX)
  if (startBlock == null && useCheckpoint && resolvedChainId != null) {
    const ckKey = makeStealthScanCheckpointKey({
      chainId: resolvedChainId,
      bridgeAddress,
      viewingPrivateKey,
    });
    const ck = readScanCheckpoint(ckKey);
    if (ck?.lastScannedBlock != null) {
      startBlock = Math.max(0, ck.lastScannedBlock - reorgSafetyBlocks);
    }
  }

  // 2) Try to find deployment block and cache it (best-effort; may fail on non-archive RPCs)
  if (startBlock == null && resolvedChainId != null) {
    const deployKey = makeDeployBlockCacheKey({ chainId: resolvedChainId, address: bridgeAddress });
    const cachedDeploy = readCachedDeployBlock(deployKey);
    if (cachedDeploy != null) {
      startBlock = cachedDeploy;
    } else {
      try {
        const deployBlock = await findContractDeployBlock(provider, bridgeAddress, endBlock);
        if (deployBlock != null) {
          startBlock = deployBlock;
          writeCachedDeployBlock(deployKey, deployBlock);
        }
      } catch {
        // ignore; fall back to lookback window
      }
    }
  }

  // 3) Final fallback: bounded lookback to avoid RPC max-range failures
  if (startBlock == null) {
    const lookback = Number.isFinite(Number(lookbackBlocks))
      ? Number(lookbackBlocks)
      : DEFAULT_STEALTH_SCAN_LOOKBACK_BLOCKS;
    startBlock = Math.max(0, endBlock - Math.max(1, lookback));
  }

  if (startBlock > endBlock) return [];

  const totalBlocks = endBlock - startBlock + 1;
  let allEvents = [];

  const ckKey =
    useCheckpoint && resolvedChainId != null
      ? makeStealthScanCheckpointKey({ chainId: resolvedChainId, bridgeAddress, viewingPrivateKey })
      : null;

  // Chunk scanning for scalability (prevents RPC timeout on large ranges)
  let currentChunkSize = Math.max(MIN_SCAN_CHUNK_SIZE, Number(chunkSize) || MAX_BLOCK_RANGE);
  const filter = bridgeContract.filters.StealthPaymentReceived();

  for (let start = startBlock; start <= endBlock; ) {
    const end = Math.min(start + currentChunkSize - 1, endBlock);
    try {
      const events = await bridgeContract.queryFilter(filter, start, end);
      allEvents = allEvents.concat(events);

      if (ckKey) {
        writeScanCheckpoint(ckKey, {
          lastScannedBlock: end,
          updatedAt: Date.now(),
        });
      }

      // Report progress if callback provided
      if (onProgress) {
        const scanned = end - startBlock + 1;
        onProgress(scanned, totalBlocks, { startBlock, endBlock, chunkSize: currentChunkSize });
      }

      start = end + 1;
    } catch (err) {
      // Some RPCs enforce a max range; adaptively reduce chunk size and retry.
      if (looksLikeBlockRangeError(err) && currentChunkSize > MIN_SCAN_CHUNK_SIZE) {
        currentChunkSize = Math.max(MIN_SCAN_CHUNK_SIZE, Math.floor(currentChunkSize / 2));
        continue;
      }
      throw err;
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
        // Full verification: re-derive expected stealth address and compare
        const expectedStealthAddress = deriveExpectedEvmStealthAddress({
          spendPublicKeyHex: spendPublicKey,
          viewingPrivateKeyHex: viewingPrivateKey,
          ephemeralPubKeyHex: ephemeralPubKeyHex,
          k: Number(k),
        });

        if (expectedStealthAddress.toLowerCase() !== stealthAddress.toLowerCase()) {
          // False positive from 1-byte view hint (expected occasionally)
          continue;
        }

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
