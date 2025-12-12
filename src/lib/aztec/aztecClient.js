/**
 * Aztec Client
 * 
 * Handles connection to Aztec PXE (Private eXecution Environment)
 * Manages encrypted notes and private state
 */

/**
 * Aztec PXE Client Class
 * Manages connection to Aztec Private eXecution Environment
 */
export class AztecPXEClient {
  constructor(pxeUrl) {
    this.pxeUrl = pxeUrl;
    this.isConnected = false;
  }

  /**
   * Connect to Aztec PXE
   * @returns {Promise<boolean>} True if connected successfully
   */
  async connect() {
    try {
      // In production, this would use the Aztec SDK
      // For now, this is a placeholder structure
      const response = await fetch(`${this.pxeUrl}/status`);
      
      if (response.ok) {
        this.isConnected = true;
        return true;
      }
      
      throw new Error('Failed to connect to Aztec PXE');
    } catch (error) {
      console.error('Aztec PXE connection failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Get account information
   * @param {string} address - Aztec account address
   * @returns {Promise<Object>} Account information
   */
  async getAccount(address) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const response = await fetch(`${this.pxeUrl}/accounts/${address}`);
      if (!response.ok) {
        throw new Error(`Failed to get account: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get account:', error);
      throw error;
    }
  }

  /**
   * Get encrypted notes for an account
   * @param {string} address - Aztec account address
   * @returns {Promise<Array>} List of encrypted notes
   */
  async getNotes(address) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const response = await fetch(`${this.pxeUrl}/accounts/${address}/notes`);
      if (!response.ok) {
        throw new Error(`Failed to get notes: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get notes:', error);
      throw error;
    }
  }

  /**
   * Send private transaction
   * @param {Object} transaction - Transaction object
   * @returns {Promise<string>} Transaction hash
   */
  async sendTransaction(transaction) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const response = await fetch(`${this.pxeUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });

      if (!response.ok) {
        throw new Error(`Transaction failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.txHash;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    }
  }

  /**
   * Get transaction status
   * @param {string} txHash - Transaction hash
   * @returns {Promise<Object>} Transaction status
   */
  async getTransactionStatus(txHash) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const response = await fetch(`${this.pxeUrl}/transactions/${txHash}`);
      if (!response.ok) {
        throw new Error(`Failed to get transaction: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Failed to get transaction status:', error);
      throw error;
    }
  }
}

/**
 * Create Aztec PXE client instance
 * @param {string} pxeUrl - Aztec PXE URL
 * @returns {AztecPXEClient} PXE client instance
 */
export function createAztecPXEClient(pxeUrl) {
  return new AztecPXEClient(pxeUrl);
}



