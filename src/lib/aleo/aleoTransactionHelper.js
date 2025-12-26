// Aleo Transaction Helper
// Unified transaction handling for all Aleo DeFi operations
// All operations execute real Credits transfers to demonstrate on-chain activity

import { WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';

const TREASURY_ADDRESS = 'aleo1lnvreh0hvs8celqfndmp7sjezz0fl588cadrrtakgxxzdmr6euyq60funr';

/**
 * Create a standard Aleo transaction for Leo Wallet
 * Using the exact format that works with manual transfers
 * @param {string} senderAddress - Sender's Aleo address
 * @param {string} recipientAddress - Recipient's Aleo address
 * @param {number} amount - Amount in credits (will be converted to microcredits)
 * @returns {Object} Transaction object for Leo Wallet
 */
export function createAleoTransaction(senderAddress, recipientAddress = TREASURY_ADDRESS, amount = 0.1) {
    // Convert to microcredits (1 credit = 1,000,000 microcredits)
    const microcredits = Math.max(Math.floor(amount * 1_000_000), 100000);
    
    // Fee: 287500 microcredits (standard fee for transfer_public)
    const fee = 287500;
    
    console.log(`[Aleo] Creating transfer_public transaction:`, {
        sender: senderAddress,
        receiver: recipientAddress,
        amount: `${microcredits} microcredits (${microcredits / 1_000_000} ALEO)`,
        fee: `${fee} microcredits (${fee / 1_000_000} ALEO)`,
        total: `${(microcredits + fee) / 1_000_000} ALEO`,
        network: 'TestnetBeta',
        privateFee: false
    });
    
    // Create transaction object directly (matching Leo Wallet's expected format)
    // Based on: https://docs.leo.app/aleo-wallet-adapter/#requesting-transactions
    const transaction = {
        address: senderAddress,
        chainId: WalletAdapterNetwork.TestnetBeta,
        transitions: [
            {
                program: 'credits.aleo',
                functionName: 'transfer_public',
                inputs: [recipientAddress, `${microcredits}u64`]
            }
        ],
        fee: fee,
        privateFee: false  // CRITICAL: Pay fee from PUBLIC balance
    };
    
    return transaction;
}

/**
 * Poll for transaction status and get the real on-chain transaction ID
 * @param {Function} transactionStatus - Leo Wallet's transactionStatus function
 * @param {string} requestId - The request ID returned by requestTransaction
 * @param {number} maxAttempts - Maximum polling attempts
 * @param {number} interval - Polling interval in ms
 * @returns {Promise<Object>} Transaction status with on-chain txId
 */
async function pollTransactionStatus(transactionStatus, requestId, maxAttempts = 20, interval = 2000) {
    let lastStatus = null;
    let failedCount = 0;
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const status = await transactionStatus(requestId);
            lastStatus = status;
            console.log(`[Aleo] Transaction status (attempt ${i + 1}):`, status);
            
            // Handle different status formats (string or object)
            const statusStr = typeof status === 'string' ? status : status?.status;
            
            // Check if we have a finalized transaction
            if (statusStr === 'Finalized') {
                const txId = typeof status === 'object' ? status.transactionId : null;
                return {
                    success: true,
                    status: 'Finalized',
                    transactionId: txId, // Real on-chain tx ID (at1...)
                };
            }
            
            // Check for failure - stop polling immediately
            if (statusStr === 'Failed' || statusStr === 'Rejected') {
                failedCount++;
                // If failed 3 times in a row, stop polling
                if (failedCount >= 3) {
                    console.log(`[Aleo] Transaction failed after ${i + 1} attempts`);
                    return {
                        success: false,
                        status: statusStr,
                        error: typeof status === 'object' ? status.error : 'Transaction failed on network',
                    };
                }
            } else {
                failedCount = 0; // Reset if not failed
            }
            
            // Still pending/generating, wait and retry
            await new Promise(resolve => setTimeout(resolve, interval));
        } catch (error) {
            console.debug(`[Aleo] Status check error (attempt ${i + 1}):`, error);
            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }
    
    // Timeout - return the last known status
    return {
        success: lastStatus !== 'Failed' && lastStatus !== 'Rejected',
        status: lastStatus || 'Timeout',
        transactionId: null,
        requestId,
    };
}

/**
 * Execute an Aleo DeFi operation
 * @param {Function} requestTransaction - Leo Wallet's requestTransaction function
 * @param {string} publicKey - User's public key
 * @param {string} operationType - Type of operation
 * @param {Object} params - Operation parameters
 * @param {Function} transactionStatus - Optional: Leo Wallet's transactionStatus function for polling
 * @returns {Promise<Object>} Transaction result
 */
export async function executeAleoOperation(requestTransaction, publicKey, operationType, params = {}, transactionStatus = null) {
    if (!requestTransaction) {
        throw new Error('Wallet not connected');
    }
    
    if (!publicKey) {
        throw new Error('Public key not available');
    }

    // Determine amount based on operation type
    // Minimum: 0.1 ALEO for reliable transactions
    let amount = 0.1; // 100,000 microcredits - minimum for testing
    if (params.amount) {
        // Use the actual amount, minimum 0.1 ALEO
        amount = Math.max(parseFloat(params.amount), 0.1);
    }

    // Get recipient address (default to treasury)
    const recipient = params.recipient || TREASURY_ADDRESS;

    const transaction = createAleoTransaction(publicKey, recipient, amount);
    const submitTimestamp = Date.now();
    
    console.log(`[Aleo] Executing ${operationType}:`, JSON.stringify(transaction, null, 2));
    console.log(`[Aleo] Transaction object type:`, typeof transaction);
    console.log(`[Aleo] Transaction keys:`, Object.keys(transaction));
    
    // requestTransaction returns a request ID (UUID), not the on-chain tx ID
    const requestId = await requestTransaction(transaction);
    console.log(`[Aleo] Request ID received:`, requestId);
    
    let finalTxId = requestId;
    let txStatus = 'Submitted';
    let txError = null;
    
    // If transactionStatus function is available, poll for the real tx ID
    if (transactionStatus && typeof transactionStatus === 'function') {
        const statusResult = await pollTransactionStatus(transactionStatus, requestId);
        if (statusResult.transactionId) {
            finalTxId = statusResult.transactionId;
        }
        txStatus = statusResult.status;
        if (!statusResult.success) {
            txError = statusResult.error;
        }
    }
    
    // Validate if we have a real Aleo transaction ID (starts with 'at1')
    const isRealTxId = finalTxId && typeof finalTxId === 'string' && finalTxId.startsWith('at1');
    
    const result = {
        success: txStatus !== 'Failed' && txStatus !== 'Rejected',
        txHash: finalTxId,
        transactionId: finalTxId,
        requestId: requestId, // Keep the original request ID
        isRealTxId,
        status: txStatus,
        error: txError,
        // Use provable explorer (same as user's manual transaction)
        explorerLink: isRealTxId 
            ? `https://testnet.explorer.provable.com/transaction/${finalTxId}`
            : `https://testnet.explorer.provable.com/address/${publicKey}`, // Fallback to address page
        operationType,
        timestamp: submitTimestamp,
        params
    };
    
    // Store in transaction history
    storeTransaction(result);
    
    // If transaction failed, throw error so UI can handle it
    if (!result.success) {
        const error = new Error(txError || 'Transaction failed on network');
        error.result = result;
        throw error;
    }
    
    return result;
}

/**
 * Store transaction in localStorage
 */
function storeTransaction(tx) {
    try {
        const key = 'aleo_tx_history';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.unshift(tx);
        // Keep last 50 transactions
        localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
    } catch (e) {
        console.debug('[Aleo] Could not store transaction:', e);
    }
}

/**
 * Get transaction history from localStorage
 */
export function getTransactionHistory() {
    try {
        return JSON.parse(localStorage.getItem('aleo_tx_history') || '[]');
    } catch (e) {
        return [];
    }
}

/**
 * Operation types for metadata
 */
export const OPERATION_TYPES = {
    // Dark Pool
    PLACE_ORDER: 'dark_pool_place_order',
    CANCEL_ORDER: 'dark_pool_cancel_order',
    
    // AMM
    SWAP: 'amm_swap',
    ADD_LIQUIDITY: 'amm_add_liquidity',
    REMOVE_LIQUIDITY: 'amm_remove_liquidity',
    
    // Credit
    GENERATE_PROOF: 'credit_generate_proof',
    UPDATE_SCORE: 'credit_update_score',
    
    // Lending
    SUPPLY: 'lending_supply',
    BORROW: 'lending_borrow',
    REPAY: 'lending_repay',
    WITHDRAW: 'lending_withdraw',
    
    // Treasury
    DEPOSIT: 'treasury_deposit',
    WITHDRAW_TREASURY: 'treasury_withdraw',
    APPROVE_TX: 'treasury_approve',
    
    // Transfer
    TRANSFER: 'transfer',
};

export default {
    createAleoTransaction,
    executeAleoOperation,
    getTransactionHistory,
    OPERATION_TYPES,
    TREASURY_ADDRESS
};
