import * as secp from '@noble/secp256k1';
import { bech32 } from 'bech32';

// Simple hash function using built-in crypto
const simpleHash = async (data) => {
  const buffer = await crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(buffer);
};

// Synchronous version for compatibility
const simpleHashSync = (data) => {
  // For demo purposes, use a simple hash based on data content
  let hash = 0;
  const str = Array.from(data).join(',');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Convert to 32-byte array
  const result = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    result[i] = (hash + i) & 0xFF;
  }
  return result;
};

/**
 * Generate a private key for Osmosis stealth addresses
 * Uses crypto.getRandomValues for secure random generation
 * @returns {Uint8Array} 32-byte private key
 */
export const generatePrivateKey = () => {
  // Generate random 32 bytes using Web Crypto API
  const privateKey = new Uint8Array(32);
  crypto.getRandomValues(privateKey);
  return privateKey;
};

/**
 * Get compressed public key from private key
 * @param {Uint8Array} privateKey - 32-byte private key
 * @returns {Uint8Array} 33-byte compressed public key
 */
export const getCompressedPublicKey = (privateKey) => {
  return secp.getPublicKey(privateKey, true);
};

/**
 * Generate Osmosis meta address (spend + viewing keys)
 * @returns {Object} Meta address with spend and viewing key pairs
 */
export const generateMetaAddress = () => {
  const spendPrivateKey = generatePrivateKey();
  const viewingPrivateKey = generatePrivateKey();
  
  const spendPublicKey = getCompressedPublicKey(spendPrivateKey);
  const viewingPublicKey = getCompressedPublicKey(viewingPrivateKey);
  
  return {
    spendPrivateKey: Array.from(spendPrivateKey),
    spendPublicKey: Array.from(spendPublicKey),
    viewingPrivateKey: Array.from(viewingPrivateKey),
    viewingPublicKey: Array.from(viewingPublicKey),
    metaAddress: encodeMetaAddress(spendPublicKey, viewingPublicKey)
  };
};

/**
 * Encode meta address for Osmosis
 * Uses hex encoding instead of bech32 due to length limits
 * @param {Uint8Array} spendPubKey - Spend public key
 * @param {Uint8Array} viewingPubKey - Viewing public key
 * @returns {string} Hex encoded meta address with prefix
 */
export const encodeMetaAddress = (spendPubKey, viewingPubKey) => {
  // Use hex encoding with a prefix since bech32 has length limits
  const spendHex = bytesToHex(spendPubKey);
  const viewingHex = bytesToHex(viewingPubKey);
  return `osmometa:${spendHex}${viewingHex}`;
};

/**
 * Decode meta address
 * @param {string} metaAddress - Encoded meta address
 * @returns {Object} Decoded spend and viewing public keys
 */
export const decodeMetaAddress = (metaAddress) => {
  // Handle hex-encoded format
  if (metaAddress.startsWith('osmometa:')) {
    const hex = metaAddress.slice(9); // Remove 'osmometa:' prefix
    const spendHex = hex.slice(0, 66); // 33 bytes = 66 hex chars
    const viewingHex = hex.slice(66, 132); // Next 33 bytes
    
    return {
      spendPublicKey: hexToBytes(spendHex),
      viewingPublicKey: hexToBytes(viewingHex)
    };
  }
  
  // Fallback for bech32 format (legacy)
  const { words } = bech32.decode(metaAddress, 200);
  const combined = bech32.fromWords(words);
  
  return {
    spendPublicKey: combined.slice(0, 33),
    viewingPublicKey: combined.slice(33, 66)
  };
};

/**
 * Generate stealth address for payment
 * @param {string} metaAddress - Recipient's meta address
 * @param {number} k - Index for multiple addresses
 * @returns {Object} Stealth address data
 */
export const generateStealthAddress = (metaAddress, k = 0) => {
  const { spendPublicKey, viewingPublicKey } = decodeMetaAddress(metaAddress);
  
  // Generate ephemeral key pair
  const ephemeralPrivateKey = generatePrivateKey();
  const ephemeralPublicKey = getCompressedPublicKey(ephemeralPrivateKey);
  
  // Compute shared secret using ECDH
  const sharedSecret = secp.getSharedSecret(ephemeralPrivateKey, viewingPublicKey, true);
  
  // Derive tweak from shared secret and index
  const tweakData = new Uint8Array(sharedSecret.length + 4);
  tweakData.set(sharedSecret, 0);
  tweakData.set(new Uint8Array(new Uint32Array([k]).buffer), sharedSecret.length);
  
  const tweak = simpleHashSync(tweakData);
  
  // Compute stealth public key: P_stealth = P_spend + tweak * G
  const tweakPoint = secp.ProjectivePoint.fromPrivateKey(tweak);
  const spendPoint = secp.ProjectivePoint.fromHex(bytesToHex(new Uint8Array(spendPublicKey)));
  const stealthPoint = spendPoint.add(tweakPoint);
  
  const stealthPublicKey = stealthPoint.toRawBytes(true);
  
  // Generate Osmosis address from stealth public key
  const addressHash = simpleHashSync(stealthPublicKey);
  const osmosisAddress = bech32.encode('osmo', bech32.toWords(addressHash.slice(0, 20)));
  
  // Create view hint for efficient scanning
  const viewHintData = new Uint8Array([...ephemeralPublicKey, ...viewingPublicKey]);
  const viewHintHash = simpleHashSync(viewHintData);
  const viewHint = viewHintHash.slice(0, 4);
  
  return {
    stealthAddress: osmosisAddress,
    stealthPublicKey: Array.from(stealthPublicKey),
    ephemeralPublicKey: Array.from(ephemeralPublicKey),
    viewHint: Array.from(viewHint),
    k
  };
};

/**
 * Compute stealth private key for spending
 * @param {Uint8Array} spendPrivateKey - Recipient's spend private key
 * @param {Uint8Array} viewingPrivateKey - Recipient's viewing private key
 * @param {Uint8Array} ephemeralPublicKey - Sender's ephemeral public key
 * @param {number} k - Index used in generation
 * @returns {Uint8Array} Stealth private key
 */
export const computeStealthPrivateKey = (spendPrivateKey, viewingPrivateKey, ephemeralPublicKey, k = 0) => {
  // Compute shared secret
  const sharedSecret = secp.getSharedSecret(viewingPrivateKey, ephemeralPublicKey, true);
  
  // Derive tweak
  const tweakData = new Uint8Array(sharedSecret.length + 4);
  tweakData.set(sharedSecret, 0);
  tweakData.set(new Uint8Array(new Uint32Array([k]).buffer), sharedSecret.length);
  
  const tweak = simpleHashSync(tweakData);
  
  // Compute stealth private key: d_stealth = d_spend + tweak
  const stealthPrivateKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    stealthPrivateKey[i] = (spendPrivateKey[i] + tweak[i]) % 256;
  }
  
  return stealthPrivateKey;
};

/**
 * Scan for stealth payments
 * @param {Uint8Array} viewingPrivateKey - Viewing private key
 * @param {Array} transactions - Array of transaction data
 * @returns {Array} Found stealth payments
 */
export const scanForPayments = (viewingPrivateKey, transactions) => {
  const payments = [];
  
  for (const tx of transactions) {
    if (tx.ephemeralPublicKey && tx.viewHint) {
      try {
        // Compute expected view hint
        const viewingPublicKey = getCompressedPublicKey(viewingPrivateKey);
        const viewHintData = new Uint8Array([...tx.ephemeralPublicKey, ...viewingPublicKey]);
        const expectedHintHash = simpleHashSync(viewHintData);
        const expectedHint = expectedHintHash.slice(0, 4);
        
        // Check if view hints match
        if (Array.from(expectedHint).every((byte, i) => byte === tx.viewHint[i])) {
          payments.push({
            txHash: tx.hash,
            amount: tx.amount,
            ephemeralPublicKey: tx.ephemeralPublicKey,
            stealthAddress: tx.stealthAddress,
            k: tx.k || 0
          });
        }
      } catch (error) {
        console.warn('Error scanning transaction:', error);
      }
    }
  }
  
  return payments;
};

/**
 * Validate public key format
 * @param {Uint8Array|Array} publicKey - Public key to validate
 * @returns {Object} Validation result
 */
export const validatePublicKey = (publicKey) => {
  try {
    const keyArray = publicKey instanceof Uint8Array ? publicKey : new Uint8Array(publicKey);
    
    if (keyArray.length !== 33) {
      return { valid: false, error: 'Public key must be 33 bytes' };
    }
    
    if (keyArray[0] !== 0x02 && keyArray[0] !== 0x03) {
      return { valid: false, error: 'Invalid compression flag' };
    }
    
    // Try to create point to validate
    secp.ProjectivePoint.fromHex(bytesToHex(keyArray));
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

/**
 * Convert bytes to hex string
 * @param {Uint8Array} bytes - Bytes to convert
 * @returns {string} Hex string
 */
export const bytesToHex = (bytes) => {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Convert hex string to bytes
 * @param {string} hex - Hex string to convert
 * @returns {Uint8Array} Bytes
 */
export const hexToBytes = (hex) => {
  const cleanHex = hex.replace(/^0x/, '');
  return new Uint8Array(cleanHex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
};