// Aleo SDK Wrapper Library
// Comprehensive JavaScript wrapper for all Leo program interactions

import { CURRENT_NETWORK, ALEO_ENDPOINTS, TX_CONFIG, PROGRAM_IDS } from './constants.js';
import {
    createTransaction,
    waitForTransaction,
    retryWithBackoff,
    parseProgramOutput,
    creditsToMicrocredits,
} from './utils.js';

/**
 * ProofProgress - Tracks ZK proof generation progress
 */
export class ProofProgress {
    constructor() {
        this.progress = 0;
        this.status = 'idle'; // idle, generating, complete, error
        this.message = '';
        this.listeners = [];
    }

    update(progress, status, message = '') {
        this.progress = progress;
        this.status = status;
        this.message = message;
        this.notifyListeners();
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notifyListeners() {
        this.listeners.forEach(listener => {
            listener({
                progress: this.progress,
                status: this.status,
                message: this.message,
            });
        });
    }

    reset() {
        this.update(0, 'idle', '');
    }
}

/**
 * RecordManager - Manages encrypted records for privacy
 */
export class RecordManager {
    constructor() {
        this.records = new Map();
        this.encryptedRecords = new Map();
    }

    /**
     * Store a record with encryption
     * @param {string} recordId - Unique record identifier
     * @param {Object} recordData - Record data to store
     * @param {boolean} encrypted - Whether the record is encrypted
     */
    storeRecord(recordId, recordData, encrypted = true) {
        if (encrypted) {
            this.encryptedRecords.set(recordId, recordData);
        } else {
            this.records.set(recordId, recordData);
        }
    }

    /**
     * Retrieve a record
     * @param {string} recordId - Record identifier
     * @returns {Object|null} Record data or null if not found
     */
    getRecord(recordId) {
        return this.records.get(recordId) || this.encryptedRecords.get(recordId) || null;
    }

    /**
     * Get all records for a specific program
     * @param {string} programId - Program identifier
     * @returns {Array} Array of records
     */
    getRecordsByProgram(programId) {
        const allRecords = [...this.records.values(), ...this.encryptedRecords.values()];
        return allRecords.filter(record => record.programId === programId);
    }

    /**
     * Clear all records
     */
    clearRecords() {
        this.records.clear();
        this.encryptedRecords.clear();
    }

    /**
     * Get record count
     * @returns {number} Total number of records
     */
    getRecordCount() {
        return this.records.size + this.encryptedRecords.size;
    }
}

/**
 * ViewKeyManager - Manages view keys for selective disclosure
 */
export class ViewKeyManager {
    constructor() {
        this.viewKeys = new Map();
        this.authorizedAuditors = new Set();
    }

    /**
     * Generate a view key for selective disclosure
     * @param {string} recordId - Record to create view key for
     * @param {Array<string>} permissions - Permissions to grant
     * @returns {string} View key
     */
    generateViewKey(recordId, permissions = []) {
        const viewKey = {
            id: `vk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            recordId,
            permissions,
            createdAt: Date.now(),
            expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
        };

        this.viewKeys.set(viewKey.id, viewKey);
        return viewKey.id;
    }

    /**
     * Verify a view key
     * @param {string} viewKeyId - View key to verify
     * @returns {boolean} True if valid
     */
    verifyViewKey(viewKeyId) {
        const viewKey = this.viewKeys.get(viewKeyId);
        if (!viewKey) return false;
        if (viewKey.expiresAt < Date.now()) {
            this.viewKeys.delete(viewKeyId);
            return false;
        }
        return true;
    }

    /**
     * Authorize an auditor
     * @param {string} auditorAddress - Auditor's Aleo address
     */
    authorizeAuditor(auditorAddress) {
        this.authorizedAuditors.add(auditorAddress);
    }

    /**
     * Revoke auditor authorization
     * @param {string} auditorAddress - Auditor's Aleo address
     */
    revokeAuditor(auditorAddress) {
        this.authorizedAuditors.delete(auditorAddress);
    }

    /**
     * Check if an auditor is authorized
     * @param {string} auditorAddress - Auditor's Aleo address
     * @returns {boolean} True if authorized
     */
    isAuditorAuthorized(auditorAddress) {
        return this.authorizedAuditors.has(auditorAddress);
    }

    /**
     * Get view key details
     * @param {string} viewKeyId - View key identifier
     * @returns {Object|null} View key details
     */
    getViewKeyDetails(viewKeyId) {
        return this.viewKeys.get(viewKeyId) || null;
    }
}

/**
 * AleoSDK - Main SDK class for Aleo blockchain interactions
 */
export class AleoSDK {
    constructor(wallet = null) {
        this.wallet = wallet;
        this.network = CURRENT_NETWORK;
        this.endpoint = ALEO_ENDPOINTS[CURRENT_NETWORK.toUpperCase()];
        this.proofProgress = new ProofProgress();
        this.recordManager = new RecordManager();
        this.viewKeyManager = new ViewKeyManager();
        this.transactionHistory = [];
    }

    /**
     * Set wallet instance
     * @param {Object} wallet - Wallet instance from @demox-labs/aleo-wallet-adapter
     */
    setWallet(wallet) {
        this.wallet = wallet;
    }

    /**
     * Get wallet public key
     * @returns {string|null} Public key or null
     */
    getPublicKey() {
        return this.wallet?.publicKey || null;
    }

    /**
     * Check if wallet is connected
     * @returns {boolean} Connection status
     */
    isConnected() {
        return !!this.wallet?.connected;
    }

    /**
     * Execute a Leo program transition
     * @param {string} programId - Program identifier
     * @param {string} functionName - Function to call
     * @param {Array} inputs - Function inputs
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Transaction result
     */
    async executeTransition(programId, functionName, inputs, options = {}) {
        if (!this.isConnected()) {
            throw new Error('Wallet not connected');
        }

        try {
            // Update proof progress
            this.proofProgress.update(0, 'generating', 'Preparing transaction...');

            const transaction = createTransaction(
                programId,
                functionName,
                inputs,
                options.fee || TX_CONFIG.DEFAULT_FEE
            );

            this.proofProgress.update(25, 'generating', 'Generating ZK proof...');

            // Simulate proof generation delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            this.proofProgress.update(50, 'generating', 'Signing transaction...');

            // Execute transaction through wallet
            const txId = await this.wallet.signAndSendTransaction(transaction);

            this.proofProgress.update(75, 'generating', 'Broadcasting transaction...');

            // Wait for confirmation if requested
            let result = { txId, status: 'pending' };
            if (options.waitForConfirmation) {
                result = await waitForTransaction(txId);
            }

            this.proofProgress.update(100, 'complete', 'Transaction complete!');

            // Store in history
            this.transactionHistory.push({
                ...transaction,
                txId,
                result,
                timestamp: Date.now(),
            });

            // Reset progress after a delay
            setTimeout(() => this.proofProgress.reset(), 2000);

            return result;
        } catch (error) {
            this.proofProgress.update(0, 'error', error.message);
            throw error;
        }
    }

    /**
     * Deploy a Leo program
     * @param {string} programSource - Leo program source code
     * @param {Object} options - Deployment options
     * @returns {Promise<Object>} Deployment result
     */
    async deployProgram(programSource, options = {}) {
        if (!this.isConnected()) {
            throw new Error('Wallet not connected');
        }

        try {
            this.proofProgress.update(0, 'generating', 'Compiling program...');

            // Simulate compilation
            await new Promise(resolve => setTimeout(resolve, 2000));

            this.proofProgress.update(50, 'generating', 'Deploying to network...');

            // This would use the actual wallet deployment method
            const deployment = {
                program: programSource,
                fee: options.fee || TX_CONFIG.DEFAULT_FEE * 10,
            };

            const txId = await this.wallet.requestDeploy(deployment);

            this.proofProgress.update(100, 'complete', 'Program deployed!');

            setTimeout(() => this.proofProgress.reset(), 2000);

            return { txId, status: 'deployed' };
        } catch (error) {
            this.proofProgress.update(0, 'error', error.message);
            throw error;
        }
    }

    /**
     * Query program state
     * @param {string} programId - Program identifier
     * @param {string} mappingName - Mapping name to query
     * @param {string} key - Key to look up
     * @returns {Promise<any>} Mapping value
     */
    async queryProgramState(programId, mappingName, key) {
        try {
            const url = `${this.endpoint.api}/program/${programId}/mapping/${mappingName}/${key}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to query program state: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[AleoSDK] Query error:', error);
            throw error;
        }
    }

    /**
     * Get transaction status
     * @param {string} txId - Transaction ID
     * @returns {Promise<Object>} Transaction status
     */
    async getTransactionStatus(txId) {
        try {
            const url = `${this.endpoint.api}/transaction/${txId}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to get transaction status: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error('[AleoSDK] Transaction status error:', error);
            throw error;
        }
    }

    /**
     * Get block height
     * @returns {Promise<number>} Current block height
     */
    async getBlockHeight() {
        try {
            const response = await fetch(`${this.endpoint.api}/latest/height`);
            if (!response.ok) {
                throw new Error(`Failed to get block height: ${response.statusText}`);
            }
            return await response.json();
        } catch (error) {
            console.error('[AleoSDK] Block height error:', error);
            throw error;
        }
    }

    /**
     * Get transaction history
     * @param {number} limit - Maximum number of transactions to return
     * @returns {Array} Transaction history
     */
    getTransactionHistory(limit = 10) {
        return this.transactionHistory.slice(-limit).reverse();
    }

    /**
     * Clear transaction history
     */
    clearTransactionHistory() {
        this.transactionHistory = [];
    }

    /**
     * Subscribe to proof progress updates
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    onProofProgress(callback) {
        return this.proofProgress.subscribe(callback);
    }

    /**
     * Get network info
     * @returns {Object} Network information
     */
    getNetworkInfo() {
        return {
            network: this.network,
            endpoint: this.endpoint,
            connected: this.isConnected(),
            publicKey: this.getPublicKey(),
        };
    }
}

// Export singleton instance
export const aleoSDK = new AleoSDK();

// Export utility function to initialize SDK with wallet
export const initializeAleoSDK = (wallet) => {
    aleoSDK.setWallet(wallet);
    return aleoSDK;
};
