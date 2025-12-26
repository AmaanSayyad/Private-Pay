// useAleoWallet Hook
// Custom hook for Aleo wallet integration with state management

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useAtom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import { aleoSDK, initializeAleoSDK } from '../lib/aleo';
import toast from 'react-hot-toast';

// Jotai atoms for Aleo wallet state
export const aleoWalletAtom = atomWithStorage('aleo-wallet-state', {
    connected: false,
    publicKey: null,
    network: 'testnet',
    lastConnected: null,
});

export const aleoBalanceAtom = atomWithStorage('aleo-balance', {
    credits: 0,
    lastUpdated: null,
});

export const aleoTransactionsAtom = atomWithStorage('aleo-transactions', []);

/**
 * Custom hook for Aleo wallet operations
 * Integrates with Demox Labs wallet adapter and provides enhanced functionality
 */
export function useAleoWallet() {
    const wallet = useWallet();
    const [walletState, setWalletState] = useAtom(aleoWalletAtom);
    const [balance, setBalance] = useAtom(aleoBalanceAtom);
    const [transactions, setTransactions] = useAtom(aleoTransactionsAtom);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize SDK when wallet connects
    useEffect(() => {
        if (wallet.connected && wallet.wallet) {
            initializeAleoSDK(wallet);
            setIsInitialized(true);

            // Update wallet state
            setWalletState({
                connected: true,
                publicKey: wallet.publicKey,
                network: 'testnet',
                lastConnected: Date.now(),
            });

            toast.success('Aleo wallet connected!');
        } else {
            setIsInitialized(false);
            setWalletState({
                connected: false,
                publicKey: null,
                network: 'testnet',
                lastConnected: walletState.lastConnected,
            });
        }
    }, [wallet.connected, wallet.wallet, wallet.publicKey]);

    /**
     * Connect wallet
     */
    const connect = useCallback(async () => {
        try {
            await wallet.connect();
        } catch (error) {
            console.error('[useAleoWallet] Connect error:', error);
            toast.error('Failed to connect wallet');
            throw error;
        }
    }, [wallet]);

    /**
     * Disconnect wallet
     */
    const disconnect = useCallback(async () => {
        try {
            await wallet.disconnect();
            setWalletState({
                connected: false,
                publicKey: null,
                network: 'testnet',
                lastConnected: walletState.lastConnected,
            });
            toast.success('Wallet disconnected');
        } catch (error) {
            console.error('[useAleoWallet] Disconnect error:', error);
            toast.error('Failed to disconnect wallet');
            throw error;
        }
    }, [wallet, walletState.lastConnected]);

    /**
     * Execute a Leo program transition
     */
    const executeTransition = useCallback(async (programId, functionName, inputs, options = {}) => {
        if (!isInitialized) {
            throw new Error('Wallet not initialized');
        }

        try {
            const result = await aleoSDK.executeTransition(programId, functionName, inputs, options);

            // Add to transaction history
            const newTransaction = {
                id: result.txId,
                programId,
                functionName,
                inputs,
                timestamp: Date.now(),
                status: result.status,
            };

            setTransactions(prev => [newTransaction, ...prev].slice(0, 50)); // Keep last 50

            return result;
        } catch (error) {
            console.error('[useAleoWallet] Execute transition error:', error);
            throw error;
        }
    }, [isInitialized, setTransactions]);

    /**
     * Sign and send transaction
     */
    const signAndSendTransaction = useCallback(async (transaction) => {
        if (!wallet.connected) {
            throw new Error('Wallet not connected');
        }

        try {
            const txId = await wallet.signAndSendTransaction(transaction);

            // Add to transaction history
            const newTransaction = {
                id: txId,
                ...transaction,
                timestamp: Date.now(),
                status: 'pending',
            };

            setTransactions(prev => [newTransaction, ...prev].slice(0, 50));

            return txId;
        } catch (error) {
            console.error('[useAleoWallet] Sign and send error:', error);
            throw error;
        }
    }, [wallet, setTransactions]);

    /**
     * Request records from wallet
     */
    const requestRecords = useCallback(async (programId) => {
        if (!wallet.connected) {
            throw new Error('Wallet not connected');
        }

        try {
            const records = await wallet.requestRecords(programId);
            return records;
        } catch (error) {
            console.error('[useAleoWallet] Request records error:', error);
            throw error;
        }
    }, [wallet]);

    /**
     * Decrypt record
     */
    const decryptRecord = useCallback(async (ciphertext) => {
        if (!wallet.connected) {
            throw new Error('Wallet not connected');
        }

        try {
            const plaintext = await wallet.decrypt(ciphertext);
            return plaintext;
        } catch (error) {
            console.error('[useAleoWallet] Decrypt error:', error);
            throw error;
        }
    }, [wallet]);

    /**
     * Request transaction history
     */
    const requestTransactionHistory = useCallback(async (programId) => {
        if (!wallet.connected) {
            throw new Error('Wallet not connected');
        }

        try {
            const history = await wallet.requestTransactionHistory(programId);
            return history;
        } catch (error) {
            console.error('[useAleoWallet] Request history error:', error);
            throw error;
        }
    }, [wallet]);

    /**
     * Get balance (query from blockchain)
     */
    const refreshBalance = useCallback(async () => {
        if (!wallet.connected) {
            return;
        }

        try {
            // Query actual balance from the network using wallet adapter
            const records = await wallet.requestRecords('credits.aleo');

            // Calculate total balance from records
            let totalBalance = 0;
            if (records && Array.isArray(records)) {
                records.forEach(record => {
                    // Parse microcredits from record
                    // Records contain encrypted data, we need to decrypt and parse
                    try {
                        if (record.data && record.data.microcredits) {
                            totalBalance += parseInt(record.data.microcredits) / 1_000_000;
                        }
                    } catch (e) {
                        console.debug('[useAleoWallet] Record parse error:', e);
                    }
                });
            }

            setBalance({
                credits: totalBalance,
                lastUpdated: Date.now(),
            });

            return totalBalance;
        } catch (error) {
            console.error('[useAleoWallet] Refresh balance error:', error);

            // Fallback to 0 if query fails
            setBalance({
                credits: 0,
                lastUpdated: Date.now(),
            });

            throw error;
        }
    }, [wallet, setBalance]);

    /**
     * Subscribe to proof progress
     */
    const onProofProgress = useCallback((callback) => {
        if (!isInitialized) {
            return () => { };
        }
        return aleoSDK.onProofProgress(callback);
    }, [isInitialized]);

    /**
     * Get network info
     */
    const getNetworkInfo = useCallback(() => {
        if (!isInitialized) {
            return null;
        }
        return aleoSDK.getNetworkInfo();
    }, [isInitialized]);

    return {
        // Wallet state
        connected: wallet.connected,
        connecting: wallet.connecting,
        publicKey: wallet.publicKey,
        wallet: wallet.wallet,
        walletState,
        balance,
        transactions,
        isInitialized,

        // Wallet actions
        connect,
        disconnect,
        select: wallet.select,

        // Transaction methods
        executeTransition,
        signAndSendTransaction,
        requestRecords,
        decryptRecord,
        requestTransactionHistory,

        // Balance methods
        refreshBalance,

        // SDK methods
        onProofProgress,
        getNetworkInfo,
        sdk: isInitialized ? aleoSDK : null,
    };
}
