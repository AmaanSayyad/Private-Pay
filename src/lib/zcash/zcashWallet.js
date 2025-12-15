/**
 * Zcash Wallet Manager
 * 
 * Manages shielded addresses, viewing keys, and note tracking
 */

import { createZcashRPCClient } from './zcashRPC.js';

/**
 * Zcash Wallet Class
 * Manages wallet operations including shielded transactions
 */
export class ZcashWallet {
  constructor(rpcClient) {
    this.rpc = rpcClient;
    this.addresses = new Map(); // address -> {type, viewingKey, label}
    this.notes = new Map(); // address -> [notes]
  }

  /**
   * Initialize wallet - load existing addresses
   */
  async initialize() {
    try {
      const addresses = await this.rpc.listAddresses();
      for (const addr of addresses) {
        this.addresses.set(addr, {
          type: addr.startsWith('z') ? 'shielded' : 'transparent',
          label: '',
        });
      }
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      throw error;
    }
  }

  /**
   * Generate new shielded address
   * @param {string} type - 'sapling' or 'orchard'
   * @param {string} label - Optional label
   * @returns {Promise<string>} New shielded address
   */
  async generateShieldedAddress(type = 'sapling', label = '') {
    try {
      const address = await this.rpc.getNewShieldedAddress(type);
      this.addresses.set(address, {
        type: 'shielded',
        subtype: type,
        label,
      });
      return address;
    } catch (error) {
      console.error('Failed to generate shielded address:', error);
      throw error;
    }
  }

  /**
   * Generate new transparent address
   * @param {string} label - Optional label
   * @returns {Promise<string>} New transparent address
   */
  async generateTransparentAddress(label = '') {
    try {
      const address = await this.rpc.getNewAddress();
      this.addresses.set(address, {
        type: 'transparent',
        label,
      });
      return address;
    } catch (error) {
      console.error('Failed to generate transparent address:', error);
      throw error;
    }
  }

  /**
   * Get viewing key for an address
   * @param {string} address - Shielded address
   * @returns {Promise<string>} Viewing key
   */
  async getViewingKey(address) {
    try {
      if (!address.startsWith('z')) {
        throw new Error('Viewing keys only available for shielded addresses');
      }

      const viewingKey = await this.rpc.exportViewingKey(address);
      
      // Cache viewing key
      const addrInfo = this.addresses.get(address) || {};
      addrInfo.viewingKey = viewingKey;
      this.addresses.set(address, addrInfo);

      return viewingKey;
    } catch (error) {
      console.error('Failed to get viewing key:', error);
      throw error;
    }
  }

  /**
   * Import viewing key to monitor an address
   * @param {string} viewingKey - Viewing key to import
   * @param {string} label - Label for the address
   * @returns {Promise<string>} Imported address
   */
  async importViewingKey(viewingKey, label = '') {
    try {
      const address = await this.rpc.importViewingKey(viewingKey, label, true);
      
      this.addresses.set(address, {
        type: 'shielded',
        viewingKey,
        label,
        imported: true,
      });

      return address;
    } catch (error) {
      console.error('Failed to import viewing key:', error);
      throw error;
    }
  }

  /**
   * Get balance for an address
   * @param {string} address - Zcash address
   * @returns {Promise<Object>} Balance information
   */
  async getBalance(address) {
    try {
      return await this.rpc.getBalance(address);
    } catch (error) {
      console.error('Failed to get balance:', error);
      throw error;
    }
  }

  /**
   * Send shielded transaction
   * @param {string} fromAddress - Source shielded address
   * @param {Array} recipients - Array of {address, amount}
   * @param {number} fee - Transaction fee (default: 0.0001 ZEC)
   * @returns {Promise<string>} Transaction ID
   */
  async sendShieldedTransaction(fromAddress, recipients, fee = 0.0001) {
    try {
      // Validate recipients
      if (!Array.isArray(recipients) || recipients.length === 0) {
        throw new Error('Recipients must be a non-empty array');
      }

      for (const recipient of recipients) {
        if (!recipient.address || !recipient.amount) {
          throw new Error('Each recipient must have address and amount');
        }
        if (recipient.amount <= 0) {
          throw new Error('Amount must be greater than 0');
        }
      }

      const txid = await this.rpc.sendShieldedTransaction(
        fromAddress,
        recipients,
        1, // minConf
        fee
      );

      return txid;
    } catch (error) {
      console.error('Failed to send shielded transaction:', error);
      throw error;
    }
  }

  /**
   * Get unspent notes for an address
   * @param {string} address - Shielded address
   * @returns {Promise<Array>} List of unspent notes
   */
  async getUnspentNotes(address) {
    try {
      const notes = await this.rpc.listUnspentNotes(address);
      
      // Cache notes
      this.notes.set(address, notes);

      return notes;
    } catch (error) {
      console.error('Failed to get unspent notes:', error);
      throw error;
    }
  }

  /**
   * Get transaction details
   * @param {string} txid - Transaction ID
   * @param {boolean} shielded - Whether to get shielded transaction details
   * @returns {Promise<Object>} Transaction details
   */
  async getTransaction(txid, shielded = false) {
    try {
      if (shielded) {
        return await this.rpc.getShieldedTransaction(txid);
      }
      return await this.rpc.getTransaction(txid);
    } catch (error) {
      console.error('Failed to get transaction:', error);
      throw error;
    }
  }

  /**
   * Scan for new transactions using viewing key
   * @param {string} address - Shielded address with viewing key
   * @param {number} fromHeight - Block height to start scanning from
   * @returns {Promise<Array>} List of new transactions
   */
  async scanForTransactions(address, fromHeight = 0) {
    try {
      // Get current block height
      const currentHeight = await this.rpc.getBlockCount();
      
      // Get unspent notes (which includes transaction history)
      const notes = await this.getUnspentNotes(address);
      
      // Get all transactions involving this address
      const transactions = [];
      
      // Note: In a real implementation, we'd need to scan blocks
      // This is a simplified version - full implementation would
      // scan blocks and check note commitments
      
      return transactions;
    } catch (error) {
      console.error('Failed to scan for transactions:', error);
      throw error;
    }
  }

  /**
   * Get all addresses managed by this wallet
   * @returns {Array} List of addresses with metadata
   */
  getAddresses() {
    return Array.from(this.addresses.entries()).map(([address, info]) => ({
      address,
      ...info,
    }));
  }
}

/**
 * Create Zcash wallet instance
 * @param {ZcashRPCClient} rpcClient - Zcash RPC client
 * @returns {ZcashWallet} Wallet instance
 */
export function createZcashWallet(rpcClient) {
  return new ZcashWallet(rpcClient);
}






