// Aleo Transaction Helper
// Unified transaction handling for all Aleo DeFi operations
// All operations execute real Credits transfers to demonstrate on-chain activity

import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';

export const TREASURY_ADDRESS = 'aleo1lnvreh0hvs8celqfndmp7sjezz0fl588cadrrtakgxxzdmr6euyq60funr';

/**
 * Create a standard Aleo transaction for Leo Wallet
 * Using Transaction.createTransaction for proper format compatibility
 * @param {string} senderAddress - Sender's Aleo address
 * @param {string} recipientAddress - Recipient's Aleo address
 * @param {number} amount - Amount in credits (will be converted to microcredits)
 * @returns {Object} Transaction object for Leo Wallet
 */
export function createAleoTransaction(senderAddress, recipientAddress = TREASURY_ADDRESS, amount = 0.1) {
    // Convert to microcredits (1 credit = 1,000,000 microcredits)
    const microcredits = Math.max(Math.floor(amount * 1_000_000), 100000);
    
    // Fee in microcredits
    const fee = 300000; // 0.3 ALEO
    
    // Total required: amount + fee
    const totalRequired = (microcredits + fee) / 1_000_000;
    
    console.log(`[Aleo] Creating transfer_public transaction:`, {
        sender: senderAddress,
        receiver: recipientAddress,
        amount: `${microcredits} microcredits (${microcredits / 1_000_000} ALEO)`,
        fee: `${fee} microcredits (${fee / 1_000_000} ALEO)`,
        totalRequired: `${totalRequired} ALEO`,
        network: 'TestnetBeta'
    });
    
    // Build transaction object manually to ensure correct format
    // Based on wallet adapter Transaction class structure
    const transaction = {
        address: senderAddress,
        chainId: 'testnetbeta',
        transitions: [
            {
                program: 'credits.aleo',
                functionName: 'transfer_public',
                inputs: [
                    recipientAddress,
                    `${microcredits}u64`
                ]
            }
        ],
        fee: fee,
        feePrivate: false
    };
    
    console.log(`[Aleo] Transaction created:`, JSON.stringify(transaction, null, 2));
    
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
async function pollTransactionStatus(transactionStatus, requestId, maxAttempts = 30, interval = 2000) {
    let lastStatus = null;
    let lastStatusObj = null;
    let failedCount = 0;
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const status = await transactionStatus(requestId);
            lastStatusObj = status;
            console.log(`[Aleo] Transaction status (attempt ${i + 1}):`, JSON.stringify(status));
            
            // Handle different status formats (string or object)
            const statusStr = typeof status === 'string' ? status : status?.status;
            lastStatus = statusStr;
            
            // Check if we have a finalized transaction
            if (statusStr === 'Finalized') {
                const txId = typeof status === 'object' ? status.transactionId : null;
                return {
                    success: true,
                    status: 'Finalized',
                    transactionId: txId, // Real on-chain tx ID (at1...)
                };
            }
            
            // Check for failure - get detailed error
            if (statusStr === 'Failed' || statusStr === 'Rejected') {
                failedCount++;
                const errorMsg = typeof status === 'object' 
                    ? (status.error || status.message || status.reason || JSON.stringify(status))
                    : 'Transaction failed';
                console.error(`[Aleo] Transaction failed (attempt ${i + 1}):`, errorMsg);
                
                // If failed 3 times in a row, stop polling
                if (failedCount >= 3) {
                    console.log(`[Aleo] Transaction failed after ${i + 1} attempts. Error:`, errorMsg);
                    return {
                        success: false,
                        status: statusStr,
                        error: errorMsg,
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
        lastStatusObj,
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
    
    // Validate recipient address format
    if (!recipient.startsWith('aleo1') || recipient.length !== 63) {
        throw new Error(`Invalid recipient address format. Expected aleo1... (63 chars), got: ${recipient.substring(0, 20)}...`);
    }

    const transaction = createAleoTransaction(publicKey, recipient, amount);
    const submitTimestamp = Date.now();
    
    console.log(`[Aleo] Executing ${operationType}:`, JSON.stringify(transaction, null, 2));
    console.log(`[Aleo] Transaction object type:`, typeof transaction);
    console.log(`[Aleo] Transaction keys:`, Object.keys(transaction));
    console.log(`[Aleo] IMPORTANT: Make sure you have at least ${amount + 0.5} ALEO in PUBLIC balance!`);
    
    // requestTransaction returns a request ID (UUID), not the on-chain tx ID
    let requestId;
    try {
        requestId = await requestTransaction(transaction);
        console.log(`[Aleo] Request ID received:`, requestId);
    } catch (error) {
        console.error(`[Aleo] requestTransaction failed:`, error);
        if (error.message?.includes('insufficient') || error.message?.includes('balance')) {
            throw new Error('Insufficient public balance. Please make sure you have enough ALEO in your PUBLIC balance (not private records).');
        }
        throw error;
    }
    
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
        let errorMessage = txError || 'Transaction failed on network';
        
        // Add helpful context for common errors
        if (errorMessage.includes('Failed') || errorMessage === 'Transaction failed on network') {
            errorMessage = `Transaction failed. This usually means:\n` +
                `1. Insufficient PUBLIC balance (you need ${amount + 0.5} ALEO minimum)\n` +
                `2. Network congestion - try again later\n` +
                `3. Invalid transaction parameters\n\n` +
                `Make sure your ALEO is in PUBLIC balance, not private records.`;
        }
        
        const error = new Error(errorMessage);
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
