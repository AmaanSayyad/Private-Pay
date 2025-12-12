/**
 * Zcash RPC Client
 * 
 * Handles communication with Zcash node via RPC API
 * Supports shielded transactions, viewing keys, and note scanning
 */

import axios from 'axios';

/**
 * Zcash RPC Client Class
 * Manages connection to Zcash node and RPC calls
 */
export class ZcashRPCClient {
  constructor(rpcUrl, rpcUser = '', rpcPassword = '') {
    this.rpcUrl = rpcUrl;
    this.rpcUser = rpcUser;
    this.rpcPassword = rpcPassword;
    this.requestId = 0;
  }

  /**
   * Make RPC call to Zcash node
   * @param {string} method - RPC method name
   * @param {Array} params - Method parameters
   * @returns {Promise<any>} RPC response
   */
  async call(method, params = []) {
    try {
      const response = await axios.post(
        this.rpcUrl,
        {
          jsonrpc: '2.0',
          id: this.requestId++,
          method,
          params,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          auth: this.rpcUser && this.rpcPassword
            ? {
                username: this.rpcUser,
                password: this.rpcPassword,
              }
            : undefined,
        }
      );

      if (response.data.error) {
        throw new Error(`Zcash RPC Error: ${response.data.error.message}`);
      }

      return response.data.result;
    } catch (error) {
      console.error('Zcash RPC call failed:', error);
      throw error;
    }
  }

  /**
   * Get new shielded address (z-address)
   * @param {string} type - Address type: 'sapling' or 'orchard'
   * @returns {Promise<string>} New shielded address
   */
  async getNewShieldedAddress(type = 'sapling') {
    return this.call('z_getnewaddress', [type]);
  }

  /**
   * Get new transparent address (t-address)
   * @returns {Promise<string>} New transparent address
   */
  async getNewAddress() {
    return this.call('getnewaddress');
  }

  /**
   * List all addresses for the wallet
   * @returns {Promise<Array>} List of addresses
   */
  async listAddresses() {
    return this.call('z_listaddresses');
  }

  /**
   * Get balance for an address
   * @param {string} address - Zcash address
   * @param {number} minConf - Minimum confirmations
   * @returns {Promise<Object>} Balance information
   */
  async getBalance(address, minConf = 1) {
    return this.call('z_getbalance', [address, minConf]);
  }

  /**
   * Send shielded transaction
   * @param {string} fromAddress - Source address
   * @param {Array} recipients - Array of {address, amount}
   * @param {number} minConf - Minimum confirmations
   * @param {number} fee - Transaction fee
   * @returns {Promise<string>} Transaction ID
   */
  async sendShieldedTransaction(fromAddress, recipients, minConf = 1, fee = 0.0001) {
    return this.call('z_sendmany', [fromAddress, recipients, minConf, fee]);
  }

  /**
   * Get transaction details
   * @param {string} txid - Transaction ID
   * @returns {Promise<Object>} Transaction details
   */
  async getTransaction(txid) {
    return this.call('gettransaction', [txid]);
  }

  /**
   * Get shielded transaction details
   * @param {string} txid - Transaction ID
   * @returns {Promise<Object>} Shielded transaction details
   */
  async getShieldedTransaction(txid) {
    return this.call('z_viewtransaction', [txid]);
  }

  /**
   * Export viewing key for an address
   * @param {string} address - Shielded address
   * @returns {Promise<string>} Viewing key
   */
  async exportViewingKey(address) {
    return this.call('z_exportviewingkey', [address]);
  }

  /**
   * Import viewing key
   * @param {string} viewingKey - Viewing key to import
   * @param {string} label - Label for the address
   * @param {boolean} rescan - Whether to rescan blockchain
   * @returns {Promise<string>} Imported address
   */
  async importViewingKey(viewingKey, label = '', rescan = true) {
    return this.call('z_importviewingkey', [viewingKey, label, rescan]);
  }

  /**
   * List unspent notes for an address
   * @param {string} address - Shielded address
   * @param {number} minConf - Minimum confirmations
   * @returns {Promise<Array>} List of unspent notes
   */
  async listUnspentNotes(address, minConf = 1) {
    return this.call('z_listunspent', [minConf, 9999999, false, [address]]);
  }

  /**
   * Get block count
   * @returns {Promise<number>} Current block height
   */
  async getBlockCount() {
    return this.call('getblockcount');
  }

  /**
   * Get block hash at height
   * @param {number} height - Block height
   * @returns {Promise<string>} Block hash
   */
  async getBlockHash(height) {
    return this.call('getblockhash', [height]);
  }

  /**
   * Get block information
   * @param {string} hash - Block hash
   * @returns {Promise<Object>} Block information
   */
  async getBlock(hash) {
    return this.call('getblock', [hash, 2]);
  }
}

/**
 * Create Zcash RPC client instance
 * @param {string} rpcUrl - Zcash RPC URL
 * @param {string} rpcUser - RPC username (optional)
 * @param {string} rpcPassword - RPC password (optional)
 * @returns {ZcashRPCClient} RPC client instance
 */
export function createZcashRPCClient(rpcUrl, rpcUser = '', rpcPassword = '') {
  return new ZcashRPCClient(rpcUrl, rpcUser, rpcPassword);
}




