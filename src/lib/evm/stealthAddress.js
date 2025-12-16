/**
 * Stealth Address Generation for EVM Chains
 * Uses keccak256 and 20-byte addresses (EVM standard)
 */

import { getPublicKey as secp256k1GetPublicKey, Point } from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha2.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/**
 * Convert hex string to bytes
 */
const hexToBytes = (hex) => {
  if (!hex || typeof hex !== 'string') {
    throw new Error('Invalid hex string');
  }
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return bytes;
};

/**
 * Get public key from private key (compressed, 33 bytes)
 */
const getPublicKey = (privateKey) => {
  const pubKey = secp256k1GetPublicKey(privateKey, true); // compressed
  return pubKey;
};

/**
 * ECDH: Compute shared secret between private key and public key
 */
const computeSharedSecret = (privateKey, publicKey) => {
  let publicKeyHex;
  if (publicKey instanceof Uint8Array) {
    publicKeyHex = bytesToHex(publicKey);
  } else {
    publicKeyHex = publicKey.startsWith("0x") ? publicKey.slice(2) : publicKey;
  }
  
  let privateKeyBigInt;
  if (privateKey instanceof Uint8Array) {
    let result = 0n;
    for (let i = 0; i < privateKey.length; i++) {
      result = result * 256n + BigInt(privateKey[i]);
    }
    privateKeyBigInt = result;
  } else if (typeof privateKey === "string") {
    const privKeyBytes = hexToBytes(privateKey);
    let result = 0n;
    for (let i = 0; i < privKeyBytes.length; i++) {
      result = result * 256n + BigInt(privKeyBytes[i]);
    }
    privateKeyBigInt = result;
  } else {
    privateKeyBigInt = privateKey;
  }
  
  const point = Point.fromHex(publicKeyHex);
  const sharedPoint = point.multiply(privateKeyBigInt);
  const sharedPointHex = sharedPoint.toHex(true);
  const sharedSecret = hexToBytes(sharedPointHex);
  
  return sharedSecret;
};

/**
 * Derive EVM stealth address from meta address and ephemeral key
 * @param {string} spendPubKeyHex - Spend public key (hex, 33 bytes compressed)
 * @param {string} viewingPubKeyHex - Viewing public key (hex, 33 bytes compressed)
 * @param {Uint8Array} ephemeralPrivKey - Ephemeral private key (32 bytes)
 * @param {number} k - Index (default 0)
 * @returns {Object} - { stealthAddress, ephemeralPubKey, viewHint, k }
 */
export const generateEvmStealthAddress = (
  spendPubKeyHex,
  viewingPubKeyHex,
  ephemeralPrivKey,
  k = 0
) => {
  try {
    const spendPubKey = hexToBytes(spendPubKeyHex);
    const viewingPubKey = hexToBytes(viewingPubKeyHex);

    // Get ephemeral public key
    const ephemeralPubKey = getPublicKey(ephemeralPrivKey);
    const ephemeralPubKeyHex = bytesToHex(ephemeralPubKey);

    // Compute shared secret using ECDH
    const sharedSecret = computeSharedSecret(ephemeralPrivKey, viewingPubKey);

    // Hash shared secret with k
    const kBytes = new Uint8Array(4);
    const kView = new DataView(kBytes.buffer);
    kView.setUint32(0, k, false);
    
    const tweakInput = new Uint8Array(sharedSecret.length + 4);
    tweakInput.set(sharedSecret, 0);
    tweakInput.set(kBytes, sharedSecret.length);
    const tweakBytes = sha256(tweakInput);

    // Convert tweak to bigint
    let tweakBigInt = 0n;
    for (let i = 0; i < tweakBytes.length; i++) {
      tweakBigInt = tweakBigInt * 256n + BigInt(tweakBytes[i]);
    }

    // Compute stealth public key: stealth_pub = spend_pub + tweak * G
    const tweakPoint = Point.BASE.multiply(tweakBigInt);
    const spendPoint = Point.fromHex(bytesToHex(spendPubKey));
    const stealthPubPoint = spendPoint.add(tweakPoint);
    
    // Get uncompressed public key (65 bytes) for EVM address derivation
    const stealthPubKeyUncompressed = stealthPubPoint.toHex(false);
    const stealthPubKeyBytes = hexToBytes(stealthPubKeyUncompressed);
    
    // EVM address: keccak256(uncompressed_pubkey[1:]) -> last 20 bytes
    const pubKeyWithoutPrefix = stealthPubKeyBytes.slice(1); // Skip 0x04 prefix
    const addressHash = keccak_256(pubKeyWithoutPrefix);
    const addressBytes = addressHash.slice(-20);
    const stealthAddress = "0x" + bytesToHex(addressBytes);

    // View hint
    const viewHint = bytesToHex(new Uint8Array([sharedSecret[0]]));

    return {
      stealthAddress,
      ephemeralPubKey: ephemeralPubKeyHex,
      viewHint,
      k,
    };
  } catch (error) {
    console.error("Error generating EVM stealth address:", error);
    throw error;
  }
};

// Re-export utilities from aptos for key generation
export { generateEphemeralKeyPair, generateMetaAddressKeys, hexToBytes } from "../aptos/stealthAddress.js";
