/**
 * WebZjs Wrapper Module
 * 
 * This module wraps the ChainSafe WebZjs SDK to provide a clean interface
 * for shielded Zcash operations (Sapling/Orchard).
 * 
 * SETUP REQUIRED:
 * 1. Clone WebZjs: git clone https://github.com/ChainSafe/WebZjs.git
 * 2. Build it: cd WebZjs && yarn install && yarn build
 * 3. Link or copy the built packages to this project
 * 
 * Once built, uncomment the imports below and update the paths accordingly.
 */

// Uncomment these after building WebZjs locally:
// import { initWasm as _initWasm, initThreadPool as _initThreadPool } from '@chainsafe/webzjs-wallet';
// import { WebWallet } from '@chainsafe/webzjs-wallet';

// For now, export stub functions that will be replaced once WebZjs is available
let wasmInitialized = false;
let threadPoolInitialized = false;

/**
 * Initialize the WebAssembly module
 * This must be called before any other WebZjs operations
 */
export const initWasm = async () => {
  if (wasmInitialized) {
    console.log('[WebZjs] WASM already initialized');
    return;
  }

  try {
    // Uncomment when WebZjs is available:
    // await _initWasm();
    
    // Temporary stub for development:
    console.warn('[WebZjs] STUB: initWasm called (WebZjs SDK not yet linked)');
    console.warn('[WebZjs] To enable shielded transactions:');
    console.warn('[WebZjs]   1. Clone: git clone https://github.com/ChainSafe/WebZjs.git');
    console.warn('[WebZjs]   2. Build: cd WebZjs && yarn install && yarn build');
    console.warn('[WebZjs]   3. Link the built packages to this project');
    
    wasmInitialized = true;
  } catch (error) {
    console.error('[WebZjs] Failed to initialize WASM:', error);
    throw error;
  }
};

/**
 * Initialize the thread pool for parallel processing
 * @param {number} threadCount - Number of threads to use (default: navigator.hardwareConcurrency)
 */
export const initThreadPool = async (threadCount = 4) => {
  if (threadPoolInitialized) {
    console.log('[WebZjs] Thread pool already initialized');
    return;
  }

  try {
    // Uncomment when WebZjs is available:
    // await _initThreadPool(threadCount);
    
    // Temporary stub for development:
    console.warn(`[WebZjs] STUB: initThreadPool called with ${threadCount} threads`);
    
    threadPoolInitialized = true;
  } catch (error) {
    console.error('[WebZjs] Failed to initialize thread pool:', error);
    throw error;
  }
};

/**
 * Check if WebZjs is properly initialized
 */
export const isWebZjsReady = () => {
  return wasmInitialized && threadPoolInitialized;
};

/**
 * Export WebWallet class when available
 * Uncomment after linking WebZjs:
 */
// export { WebWallet };

// Temporary stub export
export class WebWallet {
  constructor(network, rpcUrl, accountIndex) {
    console.warn('[WebZjs] STUB: WebWallet instantiated (SDK not yet linked)');
    this.network = network;
    this.rpcUrl = rpcUrl;
    this.accountIndex = accountIndex;
  }

  async create_account(seedPhrase, accountIndex, birthdayHeight) {
    console.warn('[WebZjs] STUB: create_account called');
    throw new Error('WebZjs SDK not yet linked. Please complete setup.');
  }

  async sync() {
    console.warn('[WebZjs] STUB: sync called');
    throw new Error('WebZjs SDK not yet linked. Please complete setup.');
  }

  async get_balance() {
    console.warn('[WebZjs] STUB: get_balance called');
    return { total: 0, shielded: 0, transparent: 0 };
  }

  async get_unified_address() {
    console.warn('[WebZjs] STUB: get_unified_address called');
    return 'u1_stub_address_webzjs_not_linked';
  }
}

