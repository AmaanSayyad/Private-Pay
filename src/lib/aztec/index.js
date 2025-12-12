/**
 * Aztec Integration Module
 * 
 * Main entry point for Aztec functionality
 * Exports all Aztec-related utilities and classes
 */

export { 
  AztecPXEClient, 
  createAztecPXEClient 
} from './aztecClient.js';

export {
  EncryptedNote,
  NoteManager,
  createNoteManager,
} from './encryptedNotes.js';

export {
  BridgeDeposit,
  BridgeWithdrawal,
  BridgeManager,
  createBridgeManager,
} from './bridge.js';

/**
 * Default Aztec configuration
 */
export const AZTEC_CONFIG = {
  // PXE URL (default)
  TESTNET_PXE: 'http://localhost:8080',
  MAINNET_PXE: 'https://pxe.aztec.network',
  
  // Network selection
  NETWORK: import.meta.env?.VITE_AZTEC_NETWORK || 
           (typeof process !== 'undefined' ? process.env.VITE_AZTEC_NETWORK : null) || 
           'testnet', // 'testnet' or 'mainnet'
  
  // Custom PXE URL (optional, overrides default)
  PXE_URL: import.meta.env?.VITE_AZTEC_PXE_URL || 
           (typeof process !== 'undefined' ? process.env.VITE_AZTEC_PXE_URL : null) || 
           null,
};

/**
 * Get PXE URL based on network
 * @param {string} network - 'testnet' or 'mainnet'
 * @returns {string} PXE URL
 */
export function getPXEUrl(network = AZTEC_CONFIG.NETWORK) {
  // Use custom PXE URL if provided
  if (AZTEC_CONFIG.PXE_URL) {
    return AZTEC_CONFIG.PXE_URL;
  }
  
  return network === 'mainnet' 
    ? AZTEC_CONFIG.MAINNET_PXE 
    : AZTEC_CONFIG.TESTNET_PXE;
}

/**
 * Create configured Aztec PXE client
 * @param {string} network - 'testnet' or 'mainnet'
 * @returns {AztecPXEClient} Configured PXE client
 */
export function createConfiguredPXEClient(network = AZTEC_CONFIG.NETWORK) {
  return createAztecPXEClient(getPXEUrl(network));
}



