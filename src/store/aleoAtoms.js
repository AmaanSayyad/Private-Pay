// Aleo State Management
// Jotai atoms for comprehensive Aleo DeFi state management

import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';

// ============================================================================
// TRADING STATE (Dark Pool & AMM)
// ============================================================================

/**
 * Dark Pool Orders Atom
 * Stores user's dark pool orders with encrypted details
 */
export const darkPoolOrdersAtom = atomWithStorage('aleo-darkpool-orders', []);

/**
 * Dark Pool Order History Atom
 * Historical record of all dark pool orders
 */
export const darkPoolHistoryAtom = atomWithStorage('aleo-darkpool-history', []);

/**
 * AMM Swap History Atom
 * History of all AMM swaps
 */
export const ammSwapHistoryAtom = atomWithStorage('aleo-amm-swaps', []);

/**
 * AMM Liquidity Positions Atom
 * User's liquidity provider positions
 */
export const ammLiquidityPositionsAtom = atomWithStorage('aleo-amm-liquidity', []);

/**
 * Trading Settings Atom
 * User preferences for trading (slippage, privacy mode, etc.)
 */
export const tradingSettingsAtom = atomWithStorage('aleo-trading-settings', {
    defaultSlippage: 0.5,
    privacyMode: true,
    autoApprove: false,
    expertMode: false,
});

/**
 * Active Trading Pair Atom
 * Currently selected trading pair
 */
export const activeTradingPairAtom = atom('ALEO/USDC');

// ============================================================================
// CREDIT & LENDING STATE
// ============================================================================

/**
 * Credit Score Atom
 * User's ZK credit score and history
 */
export const creditScoreAtom = atomWithStorage('aleo-credit-score', {
    score: null,
    lastUpdated: null,
    history: [],
    totalLoans: 0,
    onTimePayments: 0,
    utilizationRate: 0,
    accountAge: 0,
});

/**
 * Active Loans Atom
 * User's active loan positions
 */
export const activeLoansAtom = atomWithStorage('aleo-active-loans', []);

/**
 * Lending Positions Atom
 * User's lending/supply positions
 */
export const lendingPositionsAtom = atomWithStorage('aleo-lending-positions', []);

/**
 * Borrow Positions Atom
 * User's borrow positions with collateral
 */
export const borrowPositionsAtom = atomWithStorage('aleo-borrow-positions', []);

/**
 * Lending Pools Atom
 * Available lending pools with rates
 */
export const lendingPoolsAtom = atom([
    {
        id: 'pool_aleo',
        asset: 'ALEO',
        totalSupply: 1000000,
        totalBorrow: 450000,
        supplyAPY: 5.2,
        borrowAPY: 8.5,
        utilizationRate: 45,
    },
    {
        id: 'pool_usdc',
        asset: 'USDC',
        totalSupply: 500000,
        totalBorrow: 200000,
        supplyAPY: 3.8,
        borrowAPY: 6.2,
        utilizationRate: 40,
    },
]);

// ============================================================================
// VAULT & YIELD FARMING STATE
// ============================================================================

/**
 * Vault Positions Atom
 * User's active vault positions
 */
export const vaultPositionsAtom = atomWithStorage('aleo-vault-positions', []);

/**
 * Vault Strategies Atom
 * Available yield farming strategies
 */
export const vaultStrategiesAtom = atom([
    {
        id: 'stable_yield',
        name: 'Stable Yield',
        description: 'Conservative strategy focusing on stablecoins',
        apy: 8.5,
        tvl: 2500000,
        risk: 'Low',
        chains: ['Aleo', 'Ethereum'],
        protocols: ['Aave', 'Compound'],
        minDeposit: 100,
        features: ['Auto-compound', 'Cross-chain', 'Insured'],
    },
    {
        id: 'balanced_growth',
        name: 'Balanced Growth',
        description: 'Diversified strategy across DeFi protocols',
        apy: 15.2,
        tvl: 1800000,
        risk: 'Medium',
        chains: ['Aleo', 'Solana', 'Ethereum'],
        protocols: ['Uniswap', 'Raydium', 'Curve'],
        minDeposit: 250,
        features: ['Auto-compound', 'Cross-chain', 'Rebalancing'],
    },
    {
        id: 'high_yield',
        name: 'High Yield',
        description: 'Aggressive strategy maximizing returns',
        apy: 28.7,
        tvl: 950000,
        risk: 'High',
        chains: ['Aleo', 'Solana', 'Osmosis'],
        protocols: ['GMX', 'Drift', 'Osmosis'],
        minDeposit: 500,
        features: ['Auto-compound', 'Cross-chain', 'Leverage'],
    },
    {
        id: 'privacy_first',
        name: 'Privacy First',
        description: 'Maximum privacy with ZK proofs',
        apy: 12.3,
        tvl: 1200000,
        risk: 'Medium',
        chains: ['Aleo', 'Zcash'],
        protocols: ['Aleo DeFi', 'Zcash Shielded'],
        minDeposit: 200,
        features: ['Auto-compound', 'Full Privacy', 'ZK Proofs'],
    },
]);

/**
 * Vault Earnings Atom
 * Total earnings from all vault positions
 */
export const vaultEarningsAtom = atom((get) => {
    const positions = get(vaultPositionsAtom);
    return positions.reduce((total, pos) => total + (pos.earnings || 0), 0);
});

/**
 * Total Vault Value Atom
 * Total value across all vault positions
 */
export const totalVaultValueAtom = atom((get) => {
    const positions = get(vaultPositionsAtom);
    return positions.reduce((total, pos) => total + (pos.currentValue || 0), 0);
});

// ============================================================================
// TREASURY STATE
// ============================================================================

/**
 * Treasury Data Atom
 * Institutional treasury management data
 */
export const treasuryDataAtom = atomWithStorage('aleo-treasury-data', {
    totalAssets: 0,
    totalLiabilities: 0,
    netWorth: 0,
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    cashReserves: 0,
    investments: 0,
    signers: 5,
    requiredSignatures: 3,
    pendingTransactions: 0,
    allocations: [],
    recentActivity: [],
});

/**
 * Treasury Transactions Atom
 * Pending and completed treasury transactions
 */
export const treasuryTransactionsAtom = atomWithStorage('aleo-treasury-transactions', []);

/**
 * Multi-Sig Signers Atom
 * List of authorized signers for multi-sig wallet
 */
export const multiSigSignersAtom = atomWithStorage('aleo-multisig-signers', []);

// ============================================================================
// GLOBAL ALEO STATE
// ============================================================================

/**
 * Aleo Network Status Atom
 * Current network status and block height
 */
export const aleoNetworkStatusAtom = atom({
    connected: false,
    blockHeight: 0,
    network: 'testnet',
    lastUpdated: null,
});

/**
 * Aleo Balances Atom
 * User's token balances on Aleo
 */
export const aleoBalancesAtom = atomWithStorage('aleo-balances', {
    ALEO: 0,
    USDC: 0,
    WETH: 0,
    WBTC: 0,
    lastUpdated: null,
});

/**
 * Aleo Transaction Queue Atom
 * Queue of pending transactions
 */
export const aleoTransactionQueueAtom = atom([]);

/**
 * Aleo Notifications Atom
 * In-app notifications for Aleo operations
 */
export const aleoNotificationsAtom = atomWithStorage('aleo-notifications', []);

/**
 * Privacy Settings Atom
 * Global privacy preferences
 */
export const privacySettingsAtom = atomWithStorage('aleo-privacy-settings', {
    defaultPrivacyMode: true,
    showBalances: false,
    enableViewKeys: false,
    autoGenerateProofs: true,
});

/**
 * View Keys Atom
 * Generated view keys for selective disclosure
 */
export const viewKeysAtom = atomWithStorage('aleo-view-keys', []);

// ============================================================================
// DERIVED ATOMS (Computed State)
// ============================================================================

/**
 * Total Portfolio Value Atom
 * Combined value across all Aleo positions
 */
export const totalPortfolioValueAtom = atom((get) => {
    const vaultValue = get(totalVaultValueAtom);
    const lendingPositions = get(lendingPositionsAtom);
    const borrowPositions = get(borrowPositionsAtom);

    const lendingValue = lendingPositions.reduce((sum, pos) => sum + (pos.amount || 0), 0);
    const borrowValue = borrowPositions.reduce((sum, pos) => sum + (pos.amount || 0), 0);

    return vaultValue + lendingValue - borrowValue;
});

/**
 * Active Positions Count Atom
 * Total number of active positions across all products
 */
export const activePositionsCountAtom = atom((get) => {
    const vaultPositions = get(vaultPositionsAtom);
    const lendingPositions = get(lendingPositionsAtom);
    const borrowPositions = get(borrowPositionsAtom);
    const darkPoolOrders = get(darkPoolOrdersAtom);

    return (
        vaultPositions.length +
        lendingPositions.length +
        borrowPositions.length +
        darkPoolOrders.filter(o => o.status === 'open').length
    );
});

/**
 * Pending Transactions Count Atom
 * Number of pending transactions
 */
export const pendingTransactionsCountAtom = atom((get) => {
    const queue = get(aleoTransactionQueueAtom);
    return queue.filter(tx => tx.status === 'pending').length;
});

/**
 * Unread Notifications Count Atom
 * Number of unread notifications
 */
export const unreadNotificationsCountAtom = atom((get) => {
    const notifications = get(aleoNotificationsAtom);
    return notifications.filter(n => !n.read).length;
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Add notification helper
 */
export const addNotification = (set, notification) => {
    set(aleoNotificationsAtom, (prev) => [
        {
            id: Date.now().toString(),
            timestamp: Date.now(),
            read: false,
            ...notification,
        },
        ...prev,
    ].slice(0, 50)); // Keep last 50 notifications
};

/**
 * Mark notification as read helper
 */
export const markNotificationRead = (set, notificationId) => {
    set(aleoNotificationsAtom, (prev) =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
};

/**
 * Clear all notifications helper
 */
export const clearNotifications = (set) => {
    set(aleoNotificationsAtom, []);
};

/**
 * Add transaction to queue helper
 */
export const addTransactionToQueue = (set, transaction) => {
    set(aleoTransactionQueueAtom, (prev) => [
        {
            id: Date.now().toString(),
            timestamp: Date.now(),
            status: 'pending',
            ...transaction,
        },
        ...prev,
    ]);
};

/**
 * Update transaction status helper
 */
export const updateTransactionStatus = (set, txId, status, result = null) => {
    set(aleoTransactionQueueAtom, (prev) =>
        prev.map(tx =>
            tx.id === txId
                ? { ...tx, status, result, completedAt: Date.now() }
                : tx
        )
    );
};

/**
 * Remove completed transactions helper
 */
export const removeCompletedTransactions = (set) => {
    set(aleoTransactionQueueAtom, (prev) =>
        prev.filter(tx => tx.status === 'pending')
    );
};
