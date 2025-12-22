/**
 * Zcash Wallet Manager
 * 
 * Manages shielded addresses, viewing keys, and note tracking
 * Inspired by Unstoppable Wallet's ZcashAdapter implementation
 */

import { createZcashRPCClient } from './zcashRPC.js';
import { detectAddressType, isShieldedAddress, AddressType } from '../zcash.js';

/**
 * Zcash Wallet Class
 * Manages wallet operations including shielded transactions
 */
export class ZcashWallet {
  constructor(rpcClient) {
    this.rpc = rpcClient;
    this.addresses = new Map(); // address -> {type, viewingKey, label}
    this.notes = new Map(); // address -> [notes]
    this.viewingKeys = new Map(); // address -> viewingKey
    this.balances = new Map(); // address -> {confirmed, unconfirmed}
    
    // Transaction tracking
    this.transactions = [];
    this.shieldingTransactions = new Map(); // txid -> {direction, amount}
    
    // Configuration
    this.minShieldThreshold = 0.0004; // Minimum balance for auto-shielding (from Unstoppable)
    this.defaultFee = 0.0001;
  }

  /**
   * Initialize wallet - load existing addresses
   */
  async initialize() {
    try {
      const addresses = await this.rpc.listAddresses();
      for (const addr of addresses) {
        const addrType = detectAddressType(addr);
        this.addresses.set(addr, {
          type: addrType,
          isShielded: isShieldedAddress(addr),
          label: '',
        });
      }
      console.log(`Initialized Zcash wallet with ${addresses.length} addresses`);
    } catch (error) {
      console.error('Failed to initialize wallet:', error);
      // Don't throw - allow wallet to work in offline mode
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
      if (!isShieldedAddress(address)) {
        throw new Error('Viewing keys only available for shielded addresses');
      }

      // Return cached if available
      if (this.viewingKeys.has(address)) {
        return this.viewingKeys.get(address);
      }

      const viewingKey = await this.rpc.exportViewingKey(address);
      
      // Cache viewing key
      this.viewingKeys.set(address, viewingKey);
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
   * Import viewing key
   * Allows monitoring shielded transactions without spending capability
   * @param {string} viewingKey - Viewing key to import
   * @param {string} label - Optional label
   * @param {boolean} rescan - Whether to rescan blockchain
   * @returns {Promise<string>} Imported address
   */
  async importViewingKey(viewingKey, label = '', rescan = false) {
    try {
      const address = await this.rpc.importViewingKey(viewingKey, label, rescan);
      
      // Add to tracked addresses
      this.addresses.set(address, {
        type: detectAddressType(address),
        isShielded: true,
        viewingOnly: true,
        label,
      });
      
      this.viewingKeys.set(address, viewingKey);
      
      console.log(`Imported viewing key for address: ${address}`);
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
   * Shield funds (move from transparent to shielded address)
   * Inspired by Unstoppable Wallet's proposeShielding implementation
   * @param {string} fromTransparentAddress - Source transparent address
   * @param {string} toShieldedAddress - Destination shielded address
   * @param {number} amount - Amount to shield (if null, shields all available)
   * @param {string} memo - Optional memo
   * @returns {Promise<string>} Transaction ID
   */
  async shieldFunds(fromTransparentAddress, toShieldedAddress, amount = null, memo = '') {
    try {
      // Validate addresses
      if (!fromTransparentAddress.startsWith('t')) {
        throw new Error('Source must be a transparent address');
      }
      if (!isShieldedAddress(toShieldedAddress)) {
        throw new Error('Destination must be a shielded address');
      }
      
      // Get transparent balance
      const balance = await this.rpc.getBalance(fromTransparentAddress);
      
      // If amount not specified, shield all (minus fee)
      const amountToShield = amount || (balance - this.defaultFee);
      
      // Check minimum threshold (from Unstoppable: 0.0004 ZEC)
      if (amountToShield < this.minShieldThreshold) {
        throw new Error(`Amount must be at least ${this.minShieldThreshold} ZEC`);
      }
      
      // Create shielding transaction
      const recipients = [{
        address: toShieldedAddress,
        amount: amountToShield,
        memo: memo || ''
      }];
      
      const txid = await this.rpc.sendShieldedTransaction(
        fromTransparentAddress,
        recipients,
        1, // minConf
        this.defaultFee
      );
      
      // Track as shielding transaction
      this.shieldingTransactions.set(txid, {
        direction: 'shield',
        from: fromTransparentAddress,
        to: toShieldedAddress,
        amount: amountToShield,
        timestamp: Date.now()
      });
      
      console.log(`Shielding ${amountToShield} ZEC: ${txid}`);
      return txid;
    } catch (error) {
      console.error('Failed to shield funds:', error);
      throw error;
    }
  }
  
  /**
   * Unshield funds (move from shielded to transparent address)
   * @param {string} fromShieldedAddress - Source shielded address
   * @param {string} toTransparentAddress - Destination transparent address
   * @param {number} amount - Amount to unshield
   * @param {string} memo - Optional memo
   * @returns {Promise<string>} Transaction ID
   */
  async unshieldFunds(fromShieldedAddress, toTransparentAddress, amount, memo = '') {
    try {
      // Validate addresses
      if (!isShieldedAddress(fromShieldedAddress)) {
        throw new Error('Source must be a shielded address');
      }
      if (!toTransparentAddress.startsWith('t')) {
        throw new Error('Destination must be a transparent address');
      }
      
      if (!amount || amount <= 0) {
        throw new Error('Amount must be greater than 0');
      }
      
      // Create unshielding transaction
      const recipients = [{
        address: toTransparentAddress,
        amount: amount,
        memo: memo || ''
      }];
      
      const txid = await this.rpc.sendShieldedTransaction(
        fromShieldedAddress,
        recipients,
        1, // minConf
        this.defaultFee
      );
      
      // Track as unshielding transaction
      this.shieldingTransactions.set(txid, {
        direction: 'unshield',
        from: fromShieldedAddress,
        to: toTransparentAddress,
        amount: amount,
        timestamp: Date.now()
      });
      
      console.log(`Unshielding ${amount} ZEC: ${txid}`);
      return txid;
    } catch (error) {
      console.error('Failed to unshield funds:', error);
      throw error;
    }
  }
  
  /**
   * Get shielding transaction fee estimate
   * @param {number} amount - Amount to shield
   * @returns {Promise<number>} Estimated fee
   */
  async getShieldingFeeEstimate(amount) {
    // Zcash has fixed fees typically
    return this.defaultFee;
  }
  
  /**
   * Check if address has sufficient balance for shielding
   * @param {string} address - Transparent address
   * @returns {Promise<Object>} Shielding info
   */
  async canShield(address) {
    try {
      const balance = await this.rpc.getBalance(address);
      const canShield = balance >= (this.minShieldThreshold + this.defaultFee);
      
      return {
        canShield,
        balance,
        minThreshold: this.minShieldThreshold,
        maxShieldable: Math.max(0, balance - this.defaultFee),
        fee: this.defaultFee
      };
    } catch (error) {
      return {
        canShield: false,
        balance: 0,
        error: error.message
      };
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






