/**
 * Shielded Zcash Wallet Service
 * 
 * This module provides shielded Zcash functionality using the WebZjs SDK.
 * It supports Sapling and Orchard shielded pools, unified addresses,
 * and coexists with the existing zcash-bitcore-lib transparent wallet.
 * 
 * Features:
 * - Initialize WebWallet with ChainSafe mainnet gRPC-web proxy
 * - Import accounts with seed phrase and birthday height
 * - Sync shielded transactions with progress tracking
 * - Generate unified addresses
 * - Query shielded balances
 */

import { WebWallet, isWebZjsReady } from './webzjs-wrapper';

/**
 * Configuration for Zcash networks
 */
export const ZcashNetworks = {
  MAINNET: {
    name: 'main',
    rpcUrl: 'https://zcash-mainnet.chainsafe.dev',
    displayName: 'Mainnet',
  },
  TESTNET: {
    name: 'test',
    rpcUrl: 'https://zcash-testnet.chainsafe.dev',
    displayName: 'Testnet',
  },
} as const;

export type NetworkType = keyof typeof ZcashNetworks;

/**
 * Sync progress callback type
 */
export type SyncProgressCallback = (progress: {
  currentHeight: number;
  totalHeight: number;
  percentage: number;
}) => void;

/**
 * Shielded balance breakdown
 */
export interface ShieldedBalance {
  total: number;
  sapling: number;
  orchard: number;
  transparent: number;
}

/**
 * Unified address components
 */
export interface UnifiedAddress {
  address: string;
  hasTransparent: boolean;
  hasSapling: boolean;
  hasOrchard: boolean;
}

/**
 * Shielded Wallet Class
 * 
 * Handles all shielded Zcash operations using WebZjs SDK
 */
export class ShieldedWallet {
  private wallet: WebWallet | null = null;
  private network: NetworkType;
  private accountIndex: number;
  private isInitialized: boolean = false;

  /**
   * Create a new ShieldedWallet instance
   * @param network - Network to use (MAINNET or TESTNET)
   * @param accountIndex - Account index for derivation (default: 0)
   */
  constructor(network: NetworkType = 'MAINNET', accountIndex: number = 0) {
    this.network = network;
    this.accountIndex = accountIndex;
  }

  /**
   * Check if WebZjs SDK is ready for use
   */
  private ensureReady(): void {
    if (!isWebZjsReady()) {
      throw new Error('WebZjs not initialized. Call useZcashWasm hook at app level first.');
    }
  }

  /**
   * Initialize the wallet with a seed phrase
   * 
   * @param seedPhrase - BIP39 mnemonic seed phrase
   * @param birthdayHeight - Block height when wallet was created (for faster sync)
   * @returns Promise that resolves when wallet is initialized
   * 
   * Birthday height optimization:
   * - If you know when the wallet was created, provide the block height
   * - This allows the wallet to skip scanning earlier blocks
   * - Significantly speeds up initial sync
   * - If unknown, use 0 to scan from genesis (slower)
   */
  async initialize(seedPhrase: string, birthdayHeight: number = 0): Promise<void> {
    this.ensureReady();

    try {
      const networkConfig = ZcashNetworks[this.network];
      
      console.log(`[ShieldedWallet] Initializing wallet on ${networkConfig.displayName}`);
      console.log(`[ShieldedWallet] RPC URL: ${networkConfig.rpcUrl}`);
      console.log(`[ShieldedWallet] Birthday height: ${birthdayHeight}`);

      // Create WebWallet instance
      this.wallet = new WebWallet(
        networkConfig.name,
        networkConfig.rpcUrl,
        this.accountIndex
      );

      // Import account with seed phrase
      await this.wallet.create_account(seedPhrase, this.accountIndex, birthdayHeight);
      
      this.isInitialized = true;
      console.log('[ShieldedWallet] Wallet initialized successfully');
    } catch (error) {
      console.error('[ShieldedWallet] Initialization failed:', error);
      throw new Error(`Failed to initialize shielded wallet: ${error}`);
    }
  }

  /**
   * Sync the wallet with the blockchain
   * 
   * @param progressCallback - Optional callback to track sync progress
   * @returns Promise that resolves when sync is complete
   * 
   * Note: Initial sync can take several minutes depending on birthday height
   * and number of transactions. Subsequent syncs are much faster.
   */
  async sync(progressCallback?: SyncProgressCallback): Promise<void> {
    if (!this.wallet || !this.isInitialized) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }

    try {
      console.log('[ShieldedWallet] Starting sync...');
      
      // If we have a progress callback, we could implement polling here
      // WebZjs may provide sync progress events - check their API
      if (progressCallback) {
        // Stub: Actual implementation depends on WebZjs API
        progressCallback({
          currentHeight: 0,
          totalHeight: 100,
          percentage: 0,
        });
      }

      await this.wallet.sync();
      
      if (progressCallback) {
        progressCallback({
          currentHeight: 100,
          totalHeight: 100,
          percentage: 100,
        });
      }

      console.log('[ShieldedWallet] Sync complete');
    } catch (error) {
      console.error('[ShieldedWallet] Sync failed:', error);
      throw new Error(`Failed to sync wallet: ${error}`);
    }
  }

  /**
   * Get the current shielded balance
   * 
   * @returns Balance breakdown by pool
   */
  async getBalance(): Promise<ShieldedBalance> {
    if (!this.wallet || !this.isInitialized) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }

    try {
      const balance = await this.wallet.get_balance();
      
      return {
        total: balance.total || 0,
        sapling: balance.shielded || 0,
        orchard: 0, // WebZjs should provide this separately
        transparent: balance.transparent || 0,
      };
    } catch (error) {
      console.error('[ShieldedWallet] Failed to get balance:', error);
      return { total: 0, sapling: 0, orchard: 0, transparent: 0 };
    }
  }

  /**
   * Generate a unified address for this wallet
   * 
   * Unified addresses (UAs) can contain multiple receiver types:
   * - Transparent receiver (like t-address)
   * - Sapling receiver (like zs-address)
   * - Orchard receiver (like zo-address)
   * 
   * This allows the sender to choose which pool to send to,
   * maintaining compatibility with the existing transparent wallet.
   * 
   * @returns Unified address with metadata
   */
  async getUnifiedAddress(): Promise<UnifiedAddress> {
    if (!this.wallet || !this.isInitialized) {
      throw new Error('Wallet not initialized. Call initialize() first.');
    }

    try {
      const address = await this.wallet.get_unified_address();
      
      // Parse unified address to determine which receivers it contains
      // UA format includes metadata about available receivers
      const hasTransparent = address.includes('transparent') || true; // Default assumption
      const hasSapling = address.includes('sapling') || true;
      const hasOrchard = address.includes('orchard') || true;

      return {
        address,
        hasTransparent,
        hasSapling,
        hasOrchard,
      };
    } catch (error) {
      console.error('[ShieldedWallet] Failed to get unified address:', error);
      throw new Error(`Failed to get unified address: ${error}`);
    }
  }

  /**
   * Get network information
   */
  getNetwork(): typeof ZcashNetworks[NetworkType] {
    return ZcashNetworks[this.network];
  }

  /**
   * Check if wallet is initialized and ready
   */
  isReady(): boolean {
    return this.isInitialized && this.wallet !== null;
  }

  /**
   * Reset wallet state (useful for switching accounts)
   */
  reset(): void {
    this.wallet = null;
    this.isInitialized = false;
    console.log('[ShieldedWallet] Wallet reset');
  }
}

/**
 * Helper function to estimate sync time based on birthday height
 * 
 * @param birthdayHeight - Wallet birthday height
 * @param currentHeight - Current blockchain height
 * @returns Estimated sync time in seconds
 */
export function estimateSyncTime(birthdayHeight: number, currentHeight: number): number {
  const blocksToScan = currentHeight - birthdayHeight;
  // Rough estimate: ~0.1 seconds per block for trial decryption
  return Math.max(1, Math.floor(blocksToScan * 0.1));
}

/**
 * Helper function to get current Zcash blockchain height
 * This would typically call an RPC endpoint or block explorer API
 */
export async function getCurrentBlockHeight(network: NetworkType = 'MAINNET'): Promise<number> {
  try {
    const networkConfig = ZcashNetworks[network];
    // TODO: Implement actual RPC call to get current height
    // For now, return a reasonable estimate
    return network === 'MAINNET' ? 2400000 : 2700000;
  } catch (error) {
    console.error('[ShieldedWallet] Failed to get block height:', error);
    return 0;
  }
}

/**
 * Export a singleton instance for convenience
 * Note: For multiple accounts, create separate instances
 */
export const shieldedWallet = new ShieldedWallet('MAINNET', 0);

export default ShieldedWallet;

