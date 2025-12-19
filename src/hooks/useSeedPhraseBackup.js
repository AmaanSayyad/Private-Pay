/**
 * Reusable hook for managing seed phrase backup flows
 * Can be used with any wallet type (Zcash, Solana, Aptos, Starknet, etc.)
 */

import { useState, useCallback } from 'react';

export function useSeedPhraseBackup() {
  const [pendingWallet, setPendingWallet] = useState(null);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [onBackupCompleteCallback, setOnBackupCompleteCallback] = useState(null);

  /**
   * Initiates a backup flow for a newly created wallet
   * @param {Object} wallet - Wallet object containing at minimum { mnemonic: string }
   * @param {Function} onComplete - Callback to execute after backup is verified
   */
  const initiateBackup = useCallback((wallet, onComplete) => {
    if (!wallet || !wallet.mnemonic) {
      console.error('Wallet must have a mnemonic to backup');
      return;
    }

    setPendingWallet(wallet);
    setShowBackupModal(true);
    setOnBackupCompleteCallback(() => onComplete);
  }, []);

  /**
   * Called when backup verification is complete
   */
  const handleBackupComplete = useCallback(() => {
    if (onBackupCompleteCallback && pendingWallet) {
      onBackupCompleteCallback(pendingWallet);
    }
    
    // Reset state
    setPendingWallet(null);
    setShowBackupModal(false);
    setOnBackupCompleteCallback(null);
  }, [pendingWallet, onBackupCompleteCallback]);

  /**
   * Cancels the backup flow (only if canSkip is true)
   */
  const cancelBackup = useCallback(() => {
    setPendingWallet(null);
    setShowBackupModal(false);
    setOnBackupCompleteCallback(null);
  }, []);

  return {
    // State
    pendingWallet,
    showBackupModal,
    
    // Actions
    initiateBackup,
    handleBackupComplete,
    cancelBackup,
  };
}

