/**
 * Zcash Integration Module
 *
 * Main entry point for Zcash functionality
 * Exports all Zcash-related utilities and classes
 */

// Import first so we can both use and re-export these symbols
import {
  ZcashRPCClient,
  createZcashRPCClient,
} from './zcashRPC.js';

import {
  ZcashWallet,
  createZcashWallet,
} from './zcashWallet.js';

export {
  ZcashRPCClient,
  createZcashRPCClient,
  ZcashWallet,
  createZcashWallet,
};

export {
  PartialNote,
  PartialNoteProof,
  generatePartialNote,
  verifyPartialNoteProof,
  createPartialNoteProof,
  encryptNoteValue,
  decryptNoteValue,
} from './partialNotes.js';

/**
 * Get environment variable safely (works in both Vite and Node.js)
 */
function getEnvVar(key, defaultValue = '') {
  // In Vite (browser/build time)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key] || defaultValue;
  }
  // In Node.js (testing)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key] || defaultValue;
  }
  return defaultValue;
}

/**
 * Default Zcash configuration
 */
export const ZCASH_CONFIG = {
  // Testnet RPC URL (default)
  TESTNET_RPC: 'http://localhost:18232',
  MAINNET_RPC: 'http://localhost:8232',
  
  // Default RPC credentials (should be set via environment variables)
  RPC_USER: getEnvVar('VITE_ZCASH_RPC_USER', ''),
  RPC_PASSWORD: getEnvVar('VITE_ZCASH_RPC_PASSWORD', ''),
  
  // Network selection
  NETWORK: getEnvVar('VITE_ZCASH_NETWORK', 'testnet'), // 'testnet' or 'mainnet'
  
  // Custom RPC URL (optional, overrides default)
  RPC_URL: getEnvVar('VITE_ZCASH_RPC_URL', null),
  
  // Shielded address types
  ADDRESS_TYPES: {
    SAPLING: 'sapling',
    ORCHARD: 'orchard',
  },
  
  // Default transaction fee (in ZEC)
  DEFAULT_FEE: 0.0001,
  
  // Minimum confirmations
  MIN_CONFIRMATIONS: 1,
};

/**
 * Get RPC URL based on network
 * @param {string} network - 'testnet' or 'mainnet'
 * @returns {string} RPC URL
 */
export function getRPCUrl(network = ZCASH_CONFIG.NETWORK) {
  // Use custom RPC URL if provided
  if (ZCASH_CONFIG.RPC_URL) {
    return ZCASH_CONFIG.RPC_URL;
  }
  
  return network === 'mainnet' 
    ? ZCASH_CONFIG.MAINNET_RPC 
    : ZCASH_CONFIG.TESTNET_RPC;
}

/**
 * Create configured Zcash RPC client
 * @param {string} network - 'testnet' or 'mainnet'
 * @returns {ZcashRPCClient} Configured RPC client
 */
export function createConfiguredRPCClient(network = ZCASH_CONFIG.NETWORK) {
  return createZcashRPCClient(
    getRPCUrl(network),
    ZCASH_CONFIG.RPC_USER,
    ZCASH_CONFIG.RPC_PASSWORD
  );
}

