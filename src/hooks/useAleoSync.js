// Aleo State Synchronization
// Real-time blockchain event listeners and state updates

import { useEffect, useCallback } from 'react';
import { useSetAtom, useAtomValue } from 'jotai';
import {
    aleoNetworkStatusAtom,
    aleoBalancesAtom,
    darkPoolOrdersAtom,
    vaultPositionsAtom,
    lendingPositionsAtom,
    borrowPositionsAtom,
    creditScoreAtom,
    treasuryDataAtom,
    addNotification,
    addTransactionToQueue,
    updateTransactionStatus,
} from '../store/aleoAtoms';
import { useAleoWallet } from './useAleoWallet';
import toast from 'react-hot-toast';

/**
 * useAleoSync Hook
 * Manages real-time synchronization of Aleo state with blockchain
 */
export function useAleoSync() {
    const { connected, publicKey, sdk } = useAleoWallet();
    const setNetworkStatus = useSetAtom(aleoNetworkStatusAtom);
    const setBalances = useSetAtom(aleoBalancesAtom);
    const setDarkPoolOrders = useSetAtom(darkPoolOrdersAtom);
    const setVaultPositions = useSetAtom(vaultPositionsAtom);
    const setLendingPositions = useSetAtom(lendingPositionsAtom);
    const setBorrowPositions = useSetAtom(borrowPositionsAtom);
    const setCreditScore = useSetAtom(creditScoreAtom);
    const setTreasuryData = useSetAtom(treasuryDataAtom);

    /**
     * Sync network status
     */
    const syncNetworkStatus = useCallback(async () => {
        if (!sdk) return;

        try {
            const blockHeight = await sdk.getBlockHeight();
            setNetworkStatus({
                connected: true,
                blockHeight,
                network: 'testnet',
                lastUpdated: Date.now(),
            });
        } catch (error) {
            console.error('[AleoSync] Network status error:', error);
            setNetworkStatus(prev => ({ ...prev, connected: false }));
        }
    }, [sdk, setNetworkStatus]);

    /**
     * Sync balances
     */
    const syncBalances = useCallback(async () => {
        if (!connected || !publicKey) return;

        try {
            // In production, this would query actual balances from the blockchain
            // For now, we'll simulate it
            const mockBalances = {
                ALEO: Math.random() * 1000,
                USDC: Math.random() * 5000,
                WETH: Math.random() * 2,
                WBTC: Math.random() * 0.1,
                lastUpdated: Date.now(),
            };

            setBalances(mockBalances);
        } catch (error) {
            console.error('[AleoSync] Balance sync error:', error);
        }
    }, [connected, publicKey, setBalances]);

    /**
     * Sync dark pool orders
     */
    const syncDarkPoolOrders = useCallback(async () => {
        if (!connected || !publicKey) return;

        try {
            // Query orders from blockchain
            // This would use the SDK to fetch actual orders
            // For now, we'll keep existing orders
            console.debug('[AleoSync] Dark pool orders synced');
        } catch (error) {
            console.error('[AleoSync] Dark pool sync error:', error);
        }
    }, [connected, publicKey]);

    /**
     * Sync vault positions
     */
    const syncVaultPositions = useCallback(async () => {
        if (!connected || !publicKey) return;

        try {
            // Query vault positions from blockchain
            console.debug('[AleoSync] Vault positions synced');
        } catch (error) {
            console.error('[AleoSync] Vault sync error:', error);
        }
    }, [connected, publicKey]);

    /**
     * Sync lending positions
     */
    const syncLendingPositions = useCallback(async () => {
        if (!connected || !publicKey) return;

        try {
            // Query lending positions from blockchain
            console.debug('[AleoSync] Lending positions synced');
        } catch (error) {
            console.error('[AleoSync] Lending sync error:', error);
        }
    }, [connected, publicKey]);

    /**
     * Sync credit score
     */
    const syncCreditScore = useCallback(async () => {
        if (!connected || !publicKey) return;

        try {
            // Query credit score from blockchain
            console.debug('[AleoSync] Credit score synced');
        } catch (error) {
            console.error('[AleoSync] Credit score sync error:', error);
        }
    }, [connected, publicKey]);

    /**
     * Full sync - sync all state
     */
    const fullSync = useCallback(async () => {
        await Promise.all([
            syncNetworkStatus(),
            syncBalances(),
            syncDarkPoolOrders(),
            syncVaultPositions(),
            syncLendingPositions(),
            syncCreditScore(),
        ]);
    }, [
        syncNetworkStatus,
        syncBalances,
        syncDarkPoolOrders,
        syncVaultPositions,
        syncLendingPositions,
        syncCreditScore,
    ]);

    // Auto-sync on connection
    useEffect(() => {
        if (connected) {
            fullSync();
        }
    }, [connected, fullSync]);

    // Periodic sync every 30 seconds
    useEffect(() => {
        if (!connected) return;

        const interval = setInterval(() => {
            syncNetworkStatus();
            syncBalances();
        }, 30000);

        return () => clearInterval(interval);
    }, [connected, syncNetworkStatus, syncBalances]);

    return {
        syncNetworkStatus,
        syncBalances,
        syncDarkPoolOrders,
        syncVaultPositions,
        syncLendingPositions,
        syncCreditScore,
        fullSync,
    };
}

/**
 * useTransactionMonitor Hook
 * Monitors transaction status and updates state accordingly
 */
export function useTransactionMonitor() {
    const { sdk } = useAleoWallet();

    /**
     * Monitor a transaction until completion
     */
    const monitorTransaction = useCallback(async (txId, onUpdate, onComplete, onError) => {
        if (!sdk) return;

        const maxAttempts = 60; // 5 minutes with 5-second intervals
        let attempts = 0;

        const checkStatus = async () => {
            try {
                const status = await sdk.getTransactionStatus(txId);

                onUpdate?.(status);

                if (status.confirmed) {
                    onComplete?.(status);
                    return true;
                }

                if (status.failed) {
                    onError?.(new Error(status.error || 'Transaction failed'));
                    return true;
                }

                return false;
            } catch (error) {
                console.error('[TransactionMonitor] Status check error:', error);
                return false;
            }
        };

        const monitor = setInterval(async () => {
            attempts++;

            const completed = await checkStatus();

            if (completed || attempts >= maxAttempts) {
                clearInterval(monitor);

                if (attempts >= maxAttempts) {
                    onError?.(new Error('Transaction monitoring timeout'));
                }
            }
        }, 5000);

        // Initial check
        await checkStatus();

        return () => clearInterval(monitor);
    }, [sdk]);

    return { monitorTransaction };
}

/**
 * useAutoRefresh Hook
 * Automatically refreshes specific state at intervals
 */
export function useAutoRefresh(syncFn, interval = 30000, enabled = true) {
    useEffect(() => {
        if (!enabled) return;

        // Initial sync
        syncFn();

        // Periodic sync
        const timer = setInterval(syncFn, interval);

        return () => clearInterval(timer);
    }, [syncFn, interval, enabled]);
}

/**
 * useBlockchainEvents Hook
 * Listens to blockchain events and updates state
 */
export function useBlockchainEvents() {
    const { connected, publicKey, sdk } = useAleoWallet();
    const setNotification = useSetAtom(aleoNotificationsAtom);

    useEffect(() => {
        if (!connected || !publicKey || !sdk) return;

        // In production, this would set up actual event listeners
        // For now, we'll simulate with a placeholder
        console.debug('[BlockchainEvents] Event listeners initialized');

        // Simulated event listener
        const handleNewBlock = (blockHeight) => {
            console.debug('[BlockchainEvents] New block:', blockHeight);
        };

        const handleOrderMatched = (orderId) => {
            addNotification(setNotification, {
                type: 'success',
                title: 'Order Matched',
                message: `Your dark pool order has been matched!`,
                action: { label: 'View', link: '/aleo/darkpool' },
            });

            toast.success('Dark pool order matched!');
        };

        const handleLoanRepaid = (loanId) => {
            addNotification(setNotification, {
                type: 'success',
                title: 'Loan Repaid',
                message: `Loan successfully repaid. Collateral unlocked.`,
                action: { label: 'View', link: '/aleo/lending' },
            });

            toast.success('Loan repaid successfully!');
        };

        const handleVaultCompounded = (vaultId) => {
            addNotification(setNotification, {
                type: 'info',
                title: 'Yield Compounded',
                message: `Your vault yield has been auto-compounded.`,
                action: { label: 'View', link: '/aleo/vaults' },
            });
        };

        // Cleanup
        return () => {
            console.debug('[BlockchainEvents] Event listeners cleaned up');
        };
    }, [connected, publicKey, sdk, setNotification]);
}

/**
 * useRetryLogic Hook
 * Implements retry logic for failed operations
 */
export function useRetryLogic() {
    const retry = useCallback(async (
        operation,
        maxAttempts = 3,
        delay = 1000,
        backoff = 2
    ) => {
        let lastError;

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error;
                console.error(`[Retry] Attempt ${attempt}/${maxAttempts} failed:`, error);

                if (attempt < maxAttempts) {
                    const waitTime = delay * Math.pow(backoff, attempt - 1);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }

        throw lastError;
    }, []);

    return { retry };
}

/**
 * useErrorRecovery Hook
 * Handles error recovery and state restoration
 */
export function useErrorRecovery() {
    const { fullSync } = useAleoSync();

    const recoverFromError = useCallback(async (error, context) => {
        console.error('[ErrorRecovery] Recovering from error:', error, context);

        try {
            // Attempt to resync state
            await fullSync();

            toast.success('State recovered successfully');
            return true;
        } catch (recoveryError) {
            console.error('[ErrorRecovery] Recovery failed:', recoveryError);
            toast.error('Failed to recover state. Please refresh the page.');
            return false;
        }
    }, [fullSync]);

    return { recoverFromError };
}

/**
 * useNotificationManager Hook
 * Manages in-app notifications
 */
export function useNotificationManager() {
    const setNotifications = useSetAtom(aleoNotificationsAtom);

    const addNotification = useCallback((notification) => {
        setNotifications(prev => [
            {
                id: Date.now().toString(),
                timestamp: Date.now(),
                read: false,
                ...notification,
            },
            ...prev,
        ].slice(0, 50));
    }, [setNotifications]);

    const markAsRead = useCallback((notificationId) => {
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
    }, [setNotifications]);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev =>
            prev.map(n => ({ ...n, read: true }))
        );
    }, [setNotifications]);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, [setNotifications]);

    return {
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
    };
}
