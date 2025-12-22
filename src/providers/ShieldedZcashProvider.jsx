/**
 * Shielded Zcash Provider
 * 
 * Provides React context for shielded Zcash operations using WebZjs SDK.
 * This provider wraps the ShieldedWallet class and manages shielded state.
 * 
 * Use this alongside ZcashProvider for full transparent + shielded support.
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ShieldedWallet } from '@/lib/zcash/shieldedWallet';
import { generateUnifiedAddress, isUnifiedAddress } from '@/lib/zcash/unifiedAddress';
import { isWebZjsReady } from '@/lib/zcash/webzjs-wrapper';
import toast from 'react-hot-toast';

const ShieldedZcashContext = createContext({});

export const useShieldedZcash = () => useContext(ShieldedZcashContext);

export default function ShieldedZcashProvider({ children }) {
  const [shieldedWallet, setShieldedWallet] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [balance, setBalance] = useState({
    total: 0,
    sapling: 0,
    orchard: 0,
    transparent: 0,
  });
  const [unifiedAddress, setUnifiedAddress] = useState(null);
  const [network, setNetwork] = useState('MAINNET');
  const [error, setError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  /**
   * Initialize shielded wallet from seed phrase
   */
  const initializeShieldedWallet = useCallback(async (seedPhrase, birthdayHeight = 0, networkType = 'MAINNET') => {
    try {
      // Check if WebZjs is ready
      if (!isWebZjsReady()) {
        throw new Error('WebZjs not initialized. Ensure WASM is loaded first.');
      }

      setError(null);
      console.log('[ShieldedZcashProvider] Initializing shielded wallet...');

      // Create wallet instance
      const wallet = new ShieldedWallet(networkType, 0);
      await wallet.initialize(seedPhrase, birthdayHeight);

      setShieldedWallet(wallet);
      setNetwork(networkType);
      setIsInitialized(true);

      // Get unified address
      try {
        const ua = await wallet.getUnifiedAddress();
        setUnifiedAddress(ua);
        console.log('[ShieldedZcashProvider] Unified address:', ua.address);
      } catch (err) {
        console.warn('[ShieldedZcashProvider] Could not get unified address:', err);
      }

      // Store initialization state
      localStorage.setItem('shielded_wallet_initialized', 'true');
      localStorage.setItem('shielded_wallet_network', networkType);

      toast.success('Shielded wallet initialized');
      return wallet;
    } catch (err) {
      console.error('[ShieldedZcashProvider] Failed to initialize:', err);
      setError(err.message);
      toast.error('Failed to initialize shielded wallet');
      throw err;
    }
  }, []);

  /**
   * Sync shielded wallet with blockchain
   */
  const syncShieldedWallet = useCallback(async () => {
    if (!shieldedWallet || !isInitialized) {
      console.warn('[ShieldedZcashProvider] Wallet not initialized');
      return;
    }

    try {
      setIsSyncing(true);
      setSyncProgress(0);
      setError(null);

      console.log('[ShieldedZcashProvider] Starting sync...');
      
      await shieldedWallet.sync((progress) => {
        setSyncProgress(progress.percentage);
      });

      // Update balance after sync
      const newBalance = await shieldedWallet.getBalance();
      setBalance(newBalance);
      setLastSyncTime(new Date());

      setSyncProgress(100);
      console.log('[ShieldedZcashProvider] Sync complete, balance:', newBalance);
      toast.success('Shielded wallet synced');
    } catch (err) {
      console.error('[ShieldedZcashProvider] Sync failed:', err);
      setError(err.message);
      toast.error('Failed to sync shielded wallet');
    } finally {
      setIsSyncing(false);
    }
  }, [shieldedWallet, isInitialized]);

  /**
   * Get current shielded balance (without full sync)
   */
  const getBalance = useCallback(async () => {
    if (!shieldedWallet || !isInitialized) {
      return balance;
    }

    try {
      const newBalance = await shieldedWallet.getBalance();
      setBalance(newBalance);
      return newBalance;
    } catch (err) {
      console.error('[ShieldedZcashProvider] Failed to get balance:', err);
      return balance;
    }
  }, [shieldedWallet, isInitialized, balance]);

  /**
   * Get unified address
   */
  const getUnifiedAddress = useCallback(async () => {
    if (!shieldedWallet || !isInitialized) {
      throw new Error('Wallet not initialized');
    }

    try {
      const ua = await shieldedWallet.getUnifiedAddress();
      setUnifiedAddress(ua);
      return ua;
    } catch (err) {
      console.error('[ShieldedZcashProvider] Failed to get UA:', err);
      throw err;
    }
  }, [shieldedWallet, isInitialized]);

  /**
   * Reset shielded wallet
   */
  const resetShieldedWallet = useCallback(() => {
    if (shieldedWallet) {
      shieldedWallet.reset();
    }
    setShieldedWallet(null);
    setIsInitialized(false);
    setBalance({ total: 0, sapling: 0, orchard: 0, transparent: 0 });
    setUnifiedAddress(null);
    setError(null);
    setSyncProgress(0);
    setLastSyncTime(null);
    
    localStorage.removeItem('shielded_wallet_initialized');
    localStorage.removeItem('shielded_wallet_network');
    
    console.log('[ShieldedZcashProvider] Wallet reset');
  }, [shieldedWallet]);

  /**
   * Switch network (mainnet/testnet)
   */
  const switchNetwork = useCallback(async (newNetwork, seedPhrase, birthdayHeight = 0) => {
    resetShieldedWallet();
    await initializeShieldedWallet(seedPhrase, birthdayHeight, newNetwork);
  }, [resetShieldedWallet, initializeShieldedWallet]);

  /**
   * Auto-sync on interval (optional)
   */
  useEffect(() => {
    if (!isInitialized || !shieldedWallet) {
      return;
    }

    // Auto-sync every 5 minutes if wallet is initialized
    const autoSyncInterval = setInterval(() => {
      if (!isSyncing) {
        console.log('[ShieldedZcashProvider] Auto-sync triggered');
        syncShieldedWallet();
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      clearInterval(autoSyncInterval);
    };
  }, [isInitialized, shieldedWallet, isSyncing, syncShieldedWallet]);

  /**
   * Restore wallet state from localStorage on mount
   */
  useEffect(() => {
    const wasInitialized = localStorage.getItem('shielded_wallet_initialized') === 'true';
    const storedNetwork = localStorage.getItem('shielded_wallet_network') || 'MAINNET';
    
    if (wasInitialized) {
      console.log('[ShieldedZcashProvider] Previous session detected, network:', storedNetwork);
      setNetwork(storedNetwork);
      // Note: Cannot auto-initialize without seed phrase
      // User must call initializeShieldedWallet manually
    }
  }, []);

  const value = {
    // State
    shieldedWallet,
    isInitialized,
    isSyncing,
    syncProgress,
    balance,
    unifiedAddress,
    network,
    error,
    lastSyncTime,

    // Actions
    initializeShieldedWallet,
    syncShieldedWallet,
    getBalance,
    getUnifiedAddress,
    resetShieldedWallet,
    switchNetwork,

    // Utilities
    isWebZjsReady,
    isUnifiedAddress,
    generateUnifiedAddress,
  };

  return (
    <ShieldedZcashContext.Provider value={value}>
      {children}
    </ShieldedZcashContext.Provider>
  );
}

