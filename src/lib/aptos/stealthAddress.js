/**
 * Stealth Address Generation for Aptos
 * JavaScript implementation of the off-chain helper
 */

import { getPublicKey as secp256k1GetPublicKey, utils, Point } from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha2.js";
import { sha3_256 } from "@noble/hashes/sha3.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/**
 * Generate a random private key (32 bytes)
 */
export const generatePrivateKey = () => {
  // Use crypto.getRandomValues for secure random generation
  const privateKey = new Uint8Array(32);
  crypto.getRandomValues(privateKey);
  
  // Ensure the private key is valid (not zero and less than secp256k1 order)
  // This is a simple check - in production, you might want more validation
  if (privateKey.every(byte => byte === 0)) {
    // If all zeros, generate again (extremely unlikely but handle it)
    crypto.getRandomValues(privateKey);
  }
  
  return privateKey;
};

/**
 * Get public key from private key (compressed, 33 bytes)
 */
export const getPublicKey = (privateKey) => {
  const pubKey = secp256k1GetPublicKey(privateKey, true); // compressed
  return pubKey;
};

/**
 * Convert public key to hex string
 */
export const publicKeyToHex = (publicKey) => {
  return bytesToHex(publicKey);
};

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

// Export for use in components
export { hexToBytes };

/**
 * ECDH: Compute shared secret between private key and public key
 */
export const computeSharedSecret = (privateKey, publicKey) => {
  // publicKey can be Uint8Array or hex string
  let publicKeyHex;
  if (publicKey instanceof Uint8Array) {
    publicKeyHex = bytesToHex(publicKey);
  } else {
    publicKeyHex = publicKey.startsWith("0x") ? publicKey.slice(2) : publicKey;
  }
  
  // Convert private key to bigint if it's Uint8Array
  // Manual conversion from bytes to bigint (big-endian)
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
  
  // Convert Point to compressed public key bytes
  // Use toHex and convert to bytes (toRawBytes might not be available in all versions)
  const sharedPointHex = sharedPoint.toHex(true); // compressed (33 bytes)
  const sharedSecret = hexToBytes(sharedPointHex);
  
  return sharedSecret;
};

/**
 * Derive stealth address from meta address and ephemeral key
 * @param {string} spendPubKeyHex - Spend public key (hex, 33 bytes compressed)
 * @param {string} viewingPubKeyHex - Viewing public key (hex, 33 bytes compressed)
 * @param {Uint8Array} ephemeralPrivKey - Ephemeral private key (32 bytes)
 * @param {number} k - Index (default 0)
 * @returns {Object} - { stealthAddress, ephemeralPubKey, viewHint, k }
 */
export const generateStealthAddress = (
  spendPubKeyHex,
  viewingPubKeyHex,
  ephemeralPrivKey,
  k = 0
) => {
  try {
    // Convert hex strings to bytes
    const spendPubKey = hexToBytes(spendPubKeyHex);
    const viewingPubKey = hexToBytes(viewingPubKeyHex);

    // Get ephemeral public key
    const ephemeralPubKey = getPublicKey(ephemeralPrivKey);
    const ephemeralPubKeyHex = bytesToHex(ephemeralPubKey);

    // Compute shared secret using ECDH (ephemeral_priv_key * viewing_pub_key)
    const sharedSecret = computeSharedSecret(ephemeralPrivKey, viewingPubKey);

    // Hash shared secret with k: tweak = hash(shared_secret || k)
    const kBytes = new Uint8Array(4);
    const kView = new DataView(kBytes.buffer);
    kView.setUint32(0, k, false); // big-endian
    
    const tweakInput = new Uint8Array(sharedSecret.length + 4);
    tweakInput.set(sharedSecret, 0);
    tweakInput.set(kBytes, sharedSecret.length);
    const tweakBytes = sha256(tweakInput);

    // Convert tweak bytes to bigint for multiplication
    let tweakBigInt = 0n;
    for (let i = 0; i < tweakBytes.length; i++) {
      tweakBigInt = tweakBigInt * 256n + BigInt(tweakBytes[i]);
    }

    // Compute stealth public key: stealth_pub = spend_pub + tweak * G
    // tweak * G: multiply generator point by tweak
    const tweakPoint = Point.BASE.multiply(tweakBigInt);
    // Convert Point to hex and then to bytes
    const tweakPubKeyHex = tweakPoint.toHex(true); // compressed
    const tweakPubKey = hexToBytes(tweakPubKeyHex);
    
    // Point addition: spend_pub + tweak_pub
    // Convert bytes to hex for Point.fromHex
    const spendPubKeyHexStr = bytesToHex(spendPubKey);
    const tweakPubKeyHexStr = bytesToHex(tweakPubKey);
    const spendPoint = Point.fromHex(spendPubKeyHexStr);
    const tweakPubPoint = Point.fromHex(tweakPubKeyHexStr);
    const stealthPubPoint = spendPoint.add(tweakPubPoint);
    // Convert Point to hex and then to bytes
    const stealthPubKeyHex = stealthPubPoint.toHex(true); // compressed
    const stealthPubKey = hexToBytes(stealthPubKeyHex);

    // Derive Aptos address from stealth public key using SHA3-256
    const addressHash = sha3_256(stealthPubKey);
    
    // Take first 16 bytes for Aptos address
    const addressBytes16 = addressHash.slice(0, 16);
    // Convert to hex and pad to 64 characters (32 bytes) by adding zeros at the beginning
    const addressHex = bytesToHex(addressBytes16); // 32 hex characters (16 bytes)
    const paddedAddressHex = addressHex.padStart(64, '0'); // Pad to 64 hex characters (32 bytes)
    const stealthAddress = "0x" + paddedAddressHex;

    // View hint: first byte of shared secret
    const viewHint = bytesToHex(new Uint8Array([sharedSecret[0]]));

    return {
      stealthAddress,
      ephemeralPubKey: ephemeralPubKeyHex,
      viewHint,
      k,
    };
  } catch (error) {
    console.error("Error generating stealth address:", error);
    throw error;
  }
};

/**
 * Generate ephemeral key pair
 */
export const generateEphemeralKeyPair = () => {
  const privateKey = generatePrivateKey();
  const publicKey = getPublicKey(privateKey);
  return {
    privateKey: bytesToHex(privateKey),
    publicKey: bytesToHex(publicKey),
  };
};

/**
 * Generate meta address key pairs (spend and viewing)
 * Returns both private and public keys for secure storage
 */
export const generateMetaAddressKeys = () => {
  // Generate spend key pair
  const spendPrivateKey = generatePrivateKey();
  const spendPublicKey = getPublicKey(spendPrivateKey);
  
  // Generate viewing key pair
  const viewingPrivateKey = generatePrivateKey();
  const viewingPublicKey = getPublicKey(viewingPrivateKey);
  
  return {
    spend: {
      privateKey: bytesToHex(spendPrivateKey),
      publicKey: bytesToHex(spendPublicKey),
    },
    viewing: {
      privateKey: bytesToHex(viewingPrivateKey),
      publicKey: bytesToHex(viewingPublicKey),
    },
  };
};

/**
 * Validate public key format (33 bytes compressed)
 */
export const validatePublicKey = (pubKeyHex) => {
  try {
    if (!pubKeyHex || typeof pubKeyHex !== 'string') {
      return { valid: false, error: "Public key must be a string" };
    }

    // Clean the hex string
    const cleanHex = pubKeyHex.trim().startsWith("0x") ? pubKeyHex.trim().slice(2) : pubKeyHex.trim();
    
    if (cleanHex.length !== 66) { // 33 bytes = 66 hex characters
      return { 
        valid: false, 
        error: `Public key must be 33 bytes (66 hex characters), got ${cleanHex.length / 2} bytes` 
      };
    }

    const bytes = hexToBytes(pubKeyHex);
    if (bytes.length !== 33) {
      return { valid: false, error: `Public key must be 33 bytes, got ${bytes.length} bytes` };
    }
    if (bytes[0] !== 0x02 && bytes[0] !== 0x03) {
      return { valid: false, error: `Invalid compression flag (must be 0x02 or 0x03), got 0x${bytes[0].toString(16).padStart(2, '0')}` };
    }
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message || "Invalid public key format" };
  }
};

