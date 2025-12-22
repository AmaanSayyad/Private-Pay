/**
 * Argument Builders for Arcium Computations
 * 
 * These utilities help build properly formatted arguments for
 * different types of encrypted computations.
 */

import BN from "bn.js";

/**
 * Build arguments for private payment computation
 * @param {Object} params Payment parameters
 * @param {BigInt} params.amount - Payment amount (encrypted)
 * @param {string} params.recipient - Recipient address
 * @param {Uint8Array} params.ciphertext - Encrypted amount
 * @param {Uint8Array} params.publicKey - Sender's x25519 public key
 * @param {BigInt} params.nonce - Encryption nonce
 * @returns {Object} Formatted arguments for the Solana instruction
 */
export function buildPrivatePaymentArgs({
  amount,
  recipient,
  ciphertext,
  publicKey,
  nonce,
}) {
  return {
    computationOffset: generateRandomOffset(),
    encryptedAmount: Array.from(ciphertext),
    recipientPubkey: Array.from(new Uint8Array(16).fill(0)), // Will encode recipient
    encryptionPubkey: Array.from(publicKey),
    nonce: new BN(nonce.toString()),
  };
}

/**
 * Build arguments for private swap computation
 * @param {Object} params Swap parameters
 * @param {BigInt} params.inputAmount - Amount to swap (encrypted)
 * @param {BigInt} params.minOutputAmount - Minimum output (encrypted)
 * @param {string} params.tokenIn - Input token mint
 * @param {string} params.tokenOut - Output token mint
 * @param {Uint8Array[]} params.ciphertexts - Encrypted values [inputAmount, minOutput]
 * @param {Uint8Array} params.publicKey - User's x25519 public key
 * @param {BigInt} params.nonce - Encryption nonce
 * @returns {Object} Formatted arguments for the Solana instruction
 */
export function buildPrivateSwapArgs({
  inputAmount,
  minOutputAmount,
  tokenIn,
  tokenOut,
  ciphertexts,
  publicKey,
  nonce,
}) {
  return {
    computationOffset: generateRandomOffset(),
    encryptedInputAmount: Array.from(ciphertexts[0]),
    encryptedMinOutput: Array.from(ciphertexts[1]),
    tokenInMint: tokenIn,
    tokenOutMint: tokenOut,
    encryptionPubkey: Array.from(publicKey),
    nonce: new BN(nonce.toString()),
  };
}

/**
 * Build arguments for dark pool order
 * @param {Object} params Order parameters
 * @param {BigInt} params.size - Order size (encrypted)
 * @param {BigInt} params.price - Order price (encrypted)
 * @param {boolean} params.isBid - True for buy, false for sell
 * @param {string} params.tokenMint - Token being traded
 * @param {Uint8Array[]} params.ciphertexts - Encrypted values [size, price]
 * @param {Uint8Array} params.publicKey - Trader's x25519 public key
 * @param {BigInt} params.nonce - Encryption nonce
 * @returns {Object} Formatted arguments for the Solana instruction
 */
export function buildDarkPoolOrderArgs({
  size,
  price,
  isBid,
  tokenMint,
  ciphertexts,
  publicKey,
  nonce,
}) {
  return {
    computationOffset: generateRandomOffset(),
    encryptedSize: Array.from(ciphertexts[0]),
    encryptedPrice: Array.from(ciphertexts[1]),
    isBid,
    tokenMint,
    encryptionPubkey: Array.from(publicKey),
    nonce: new BN(nonce.toString()),
  };
}

/**
 * Build arguments for canceling a dark pool order
 * @param {Object} params Cancel parameters
 * @param {number} params.orderId - Order ID to cancel
 * @param {Uint8Array} params.publicKey - Owner's x25519 public key
 * @returns {Object} Formatted arguments
 */
export function buildCancelOrderArgs({ orderId, publicKey }) {
  return {
    computationOffset: generateRandomOffset(),
    orderId,
    ownerPubkey: Array.from(publicKey),
  };
}

/**
 * Build arguments for matching orders in dark pool
 * @param {Object} params Match parameters
 * @param {string} params.poolId - Pool identifier
 * @returns {Object} Formatted arguments
 */
export function buildMatchOrdersArgs({ poolId }) {
  return {
    computationOffset: generateRandomOffset(),
    poolId,
  };
}

/**
 * Generate a random 8-byte offset for computation
 * @returns {BN} Random offset as BN
 */
function generateRandomOffset() {
  const bytes = new Uint8Array(8);
  if (typeof window !== "undefined" && window.crypto) {
    window.crypto.getRandomValues(bytes);
  } else {
    // Fallback for non-browser environments
    for (let i = 0; i < 8; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return new BN(bytes, "le");
}

/**
 * Encode a public key to u128 for Arcium programs
 * @param {string | PublicKey} pubkey - Solana public key
 * @returns {BigInt} u128 representation (first 16 bytes)
 */
export function pubkeyToU128(pubkey) {
  const bytes = typeof pubkey === "string" 
    ? new Uint8Array(Buffer.from(pubkey, "base58"))
    : pubkey.toBytes();
  
  let result = BigInt(0);
  for (let i = 0; i < 16 && i < bytes.length; i++) {
    result |= BigInt(bytes[i]) << BigInt(i * 8);
  }
  return result;
}

/**
 * Validate swap parameters
 * @param {Object} params Swap parameters to validate
 * @throws {Error} If parameters are invalid
 */
export function validateSwapParams({ inputAmount, minOutputAmount, tokenIn, tokenOut }) {
  if (inputAmount <= 0) {
    throw new Error("Input amount must be positive");
  }
  if (minOutputAmount < 0) {
    throw new Error("Minimum output cannot be negative");
  }
  if (tokenIn === tokenOut) {
    throw new Error("Input and output tokens must be different");
  }
}

/**
 * Validate order parameters
 * @param {Object} params Order parameters to validate
 * @throws {Error} If parameters are invalid
 */
export function validateOrderParams({ size, price }) {
  if (size <= 0) {
    throw new Error("Order size must be positive");
  }
  if (price <= 0) {
    throw new Error("Order price must be positive");
  }
}








