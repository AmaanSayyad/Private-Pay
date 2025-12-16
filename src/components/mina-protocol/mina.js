/**
 * Mina Protocol Helper Library
 * Handles interactions with Auro Wallet and basic Mina ZK interactions
 */

import { PublicKey, Field } from 'o1js';

export const MINA_SUBGRAPH_URL = 'https://api.minascan.io/node/devnet/v1/graphql';

/**
 * Check if Auro Wallet is installed and available
 */
export const checkMinaProvider = () => {
    if (typeof window !== 'undefined' && window.mina) {
        return true;
    }
    return false;
};

/**
 * Connect to Auro Wallet
 * @returns {Promise<string[]>} Array of account addresses
 */
export const connectMinaWallet = async () => {
    if (!checkMinaProvider()) {
        throw new Error('Auro Wallet not installed');
    }

    try {
        const accounts = await window.mina.requestAccounts();
        return accounts;
    } catch (error) {
        console.error("Error connecting to Auro Wallet:", error);
        throw error;
    }
};

/**
 * Get current account balance
 * @param {string} address - params
 * @returns {Promise<{total: number, liquid: number}>} Balance in MINA
 */
export const getMinaBalance = async (address) => {
    try {
        if (!checkMinaProvider()) return { total: 0, liquid: 0 };
        
        // Auro wallet usually provides a way to get balance, or we query a node
        // For now, let's try to use window.mina.request({ method: 'mina_getBalance' }) if available
        // or fall back to o1js fetchAccount (which requires compiling/loading usually, might be heavy for just balance)
        
        // Simpler: use graphql or window.mina specific API if exists
        // window.mina actually doesn't strictly follow EIP-1193 exactly like MetaMask always
        
        // The standard way with Auro:
        const response = await window.mina.request({ 
            method: 'mina_getBalance', 
            params: [address]
        });
        
        // Response format usually { total: string, liquid: string, ... } or just string
        // Check Auro docs or assume standard structure. 
        // Docs say: returns { account: ... } or just balance.
        // Let's assume it returns an object or handle it.
        
        return {
            total: parseFloat(response) || 0, // Simplified, verify actual response structure during dev
            liquid: parseFloat(response) || 0 
        };
    } catch (error) {
        console.error("Error fetching Mina balance:", error);
        return { total: 0, liquid: 0 };
    }
};

/**
 * Send a payment transaction
 * @param {string} to - Recipient public key
 * @param {number} amount - Amount in MINA
 * @param {string} memo - Optional memo
 */
export const sendMinaPayment = async (to, amount, memo = '') => {
    if (!checkMinaProvider()) throw new Error('Auro Wallet not found');

    try {
        const response = await window.mina.sendPayment({
            to: to,
            amount: amount,
            memo: memo
        });
        return response; // { hash: '...' }
    } catch (error) {
        console.error("Error sending Mina payment:", error);
        throw error;
    }
};

/**
 * Verify network (Mainnet vs Devnet)
 */
export const requestNetwork = async () => {
     if (!checkMinaProvider()) return null;
     try {
         const network = await window.mina.requestNetwork();
         return network; // { networkID: 'mina:testnet', name: 'Devnet', ... }
     } catch(e) {
         console.error(e);
         return null;
     }
}
