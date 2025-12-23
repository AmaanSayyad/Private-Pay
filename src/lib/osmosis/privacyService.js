import { generateStealthAddress, generateMetaAddress, scanForPayments, computeStealthPrivateKey } from './stealthAddress.js';
import { SigningStargateClient } from '@cosmjs/stargate';
import { coins } from '@cosmjs/amino';
import axios from 'axios';

/**
 * Frontend-only Privacy Payment Service for Osmosis
 * Implements stealth addresses and unlinkable payments
 */
export class OsmosisPrivacyService {
  constructor() {
    this.websiteHost = import.meta.env.VITE_WEBSITE_HOST || 'privatepay.me';
    this.storageKey = 'osmosis_privacy_payments';
    this.accountKey = 'osmosis_privacy_account';
  }

  /**
   * Create a new privacy account
   * @returns {Object} Privacy account with meta address
   */
  createPrivacyAccount() {
    const account = generateMetaAddress();
    
    // Store encrypted keys locally
    this.storePrivacyAccount(account);
    
    return {
      metaAddress: account.metaAddress,
      spendPublicKey: account.spendPublicKey,
      viewingPublicKey: account.viewingPublicKey
    };
  }

  /**
   * Generate stealth payment link
   * @param {string} metaAddress - Recipient's meta address
   * @param {string} amount - Payment amount (optional)
   * @param {string} message - Payment message (optional)
   * @returns {Object} Payment link data
   */
  async generatePaymentLink(metaAddress, amount = null, message = null) {
    try {
      // Generate stealth address for this payment
      const stealthData = generateStealthAddress(metaAddress);
      
      // Create unique payment ID
      const paymentId = this.generatePaymentId();
      
      // Store payment data locally
      const paymentData = {
        id: paymentId,
        metaAddress,
        stealthAddress: stealthData.stealthAddress,
        ephemeralPublicKey: stealthData.ephemeralPublicKey,
        viewHint: stealthData.viewHint,
        k: stealthData.k,
        amount,
        message,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      this.storePaymentData(paymentData);

      // Generate payment link
      const paymentLink = `https://${this.websiteHost}/pay/${paymentId}`;

      return {
        paymentId,
        paymentLink,
        stealthAddress: stealthData.stealthAddress,
        qrCode: this.generateQRCodeDataUrl(paymentLink)
      };
    } catch (error) {
      console.error('Error generating payment link:', error);
      throw error;
    }
  }

  /**
   * Process stealth payment
   * @param {string} paymentId - Payment ID
   * @param {string} senderAddress - Sender's Osmosis address
   * @param {string} amount - Payment amount
   * @param {Function} getSigningClient - Function to get signing client
   * @returns {Object} Transaction result
   */
  async processStealthPayment(paymentId, senderAddress, amount, getSigningClient) {
    try {
      // Get payment data
      const paymentData = this.getPaymentData(paymentId);
      if (!paymentData) {
        throw new Error('Payment not found');
      }

      const client = await getSigningClient();
      
      // Convert amount to microOSMO
      const microAmount = Math.floor(parseFloat(amount) * 1_000_000).toString();
      
      const fee = {
        amount: coins(5000, 'uosmo'),
        gas: '200000'
      };

      // Create stealth payment memo
      const memo = JSON.stringify({
        type: 'stealth_payment',
        paymentId,
        ephemeralPublicKey: paymentData.ephemeralPublicKey,
        viewHint: paymentData.viewHint,
        k: paymentData.k,
        version: '1.0'
      });

      // Send to stealth address
      const result = await client.sendTokens(
        senderAddress,
        paymentData.stealthAddress,
        coins(microAmount, 'uosmo'),
        fee,
        memo
      );

      if (result.code === 0) {
        // Update payment status
        this.updatePaymentStatus(paymentId, 'completed', {
          txHash: result.transactionHash,
          sender: senderAddress,
          amount: amount
        });
      }

      return result;
    } catch (error) {
      console.error('Stealth payment error:', error);
      throw error;
    }
  }

  /**
   * Scan for received payments using Osmosis LCD API
   * @param {Uint8Array} viewingPrivateKey - Viewing private key
   * @param {string} osmosisAddress - User's Osmosis address for querying
   * @returns {Array} Found payments
   */
  async scanForReceivedPayments(viewingPrivateKey, osmosisAddress) {
    try {
      // Get recent transactions from Osmosis LCD
      const transactions = await this.getRecentTransactions(osmosisAddress);
      
      // Scan for stealth payments
      const stealthPayments = scanForPayments(viewingPrivateKey, transactions);
      
      // Get additional details for each payment
      const detailedPayments = await Promise.all(
        stealthPayments.map(async (payment) => {
          const txDetails = await this.getTransactionDetails(payment.txHash);
          return {
            ...payment,
            timestamp: txDetails.timestamp,
            blockHeight: txDetails.height,
            confirmations: txDetails.confirmations || 1
          };
        })
      );

      return detailedPayments;
    } catch (error) {
      console.error('Error scanning for payments:', error);
      return [];
    }
  }

  /**
   * Generate unique payment ID
   * @returns {string} Payment ID
   */
  generatePaymentId() {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Store payment data in localStorage
   * @param {Object} paymentData - Payment data to store
   */
  storePaymentData(paymentData) {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      stored.push(paymentData);
      localStorage.setItem(this.storageKey, JSON.stringify(stored));
    } catch (error) {
      console.error('Failed to store payment data:', error);
    }
  }

  /**
   * Get payment data from localStorage
   * @param {string} paymentId - Payment ID
   * @returns {Object} Payment data
   */
  getPaymentData(paymentId) {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return stored.find(payment => payment.id === paymentId);
    } catch (error) {
      console.error('Failed to get payment data:', error);
      return null;
    }
  }

  /**
   * Update payment status
   * @param {string} paymentId - Payment ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data
   */
  updatePaymentStatus(paymentId, status, additionalData = {}) {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      const index = stored.findIndex(payment => payment.id === paymentId);
      
      if (index !== -1) {
        stored[index].status = status;
        stored[index].updatedAt = new Date().toISOString();
        Object.assign(stored[index], additionalData);
        
        localStorage.setItem(this.storageKey, JSON.stringify(stored));
      }
    } catch (error) {
      console.error('Failed to update payment status:', error);
    }
  }

  /**
   * Get recent transactions for scanning
   * @param {string} address - Address to query
   * @returns {Array} Transactions
   */
  async getRecentTransactions(address) {
    try {
      const lcdUrl = import.meta.env.VITE_OSMOSIS_LCD_URL || 'https://lcd.osmosis.zone';
      const response = await axios.get(
        `${lcdUrl}/cosmos/tx/v1beta1/txs`,
        {
          params: {
            'events': `transfer.recipient='${address}'`,
            'pagination.limit': 100,
            'order_by': 'ORDER_BY_DESC'
          }
        }
      );

      return response.data.tx_responses?.map(tx => ({
        hash: tx.txhash,
        height: tx.height,
        timestamp: tx.timestamp,
        memo: tx.tx.body.memo,
        // Extract stealth payment data from memo
        ...this.parseStealthMemo(tx.tx.body.memo)
      })) || [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  /**
   * Parse stealth payment data from memo
   * @param {string} memo - Transaction memo
   * @returns {Object} Parsed stealth data
   */
  parseStealthMemo(memo) {
    try {
      const data = JSON.parse(memo);
      if (data.type === 'stealth_payment') {
        return {
          ephemeralPublicKey: data.ephemeralPublicKey,
          viewHint: data.viewHint,
          k: data.k
        };
      }
    } catch (error) {
      // Not a stealth payment memo
    }
    return {};
  }

  /**
   * Store privacy account locally (encrypted)
   * @param {Object} account - Privacy account
   */
  storePrivacyAccount(account) {
    // In a real implementation, this should be encrypted with user password
    const accountData = {
      metaAddress: account.metaAddress,
      // Store private keys encrypted (simple base64 for demo)
      encryptedSpendKey: this.encryptKey(account.spendPrivateKey),
      encryptedViewingKey: this.encryptKey(account.viewingPrivateKey),
      createdAt: new Date().toISOString()
    };

    localStorage.setItem(this.accountKey, JSON.stringify(accountData));
  }

  /**
   * Get stored privacy account
   * @returns {Object} Privacy account
   */
  getStoredPrivacyAccount() {
    try {
      const stored = localStorage.getItem(this.accountKey);
      if (stored) {
        const accountData = JSON.parse(stored);
        return {
          metaAddress: accountData.metaAddress,
          spendPrivateKey: this.decryptKey(accountData.encryptedSpendKey),
          viewingPrivateKey: this.decryptKey(accountData.encryptedViewingKey)
        };
      }
    } catch (error) {
      console.error('Error getting stored privacy account:', error);
    }
    return null;
  }

  /**
   * Simple key encryption (use proper encryption in production)
   * @param {Array} key - Key to encrypt
   * @returns {string} Encrypted key
   */
  encryptKey(key) {
    // This is a placeholder - use proper encryption like AES-GCM with user password
    return btoa(JSON.stringify(key));
  }

  /**
   * Simple key decryption
   * @param {string} encryptedKey - Encrypted key
   * @returns {Array} Decrypted key
   */
  decryptKey(encryptedKey) {
    // This is a placeholder - use proper decryption
    return JSON.parse(atob(encryptedKey));
  }

  /**
   * Generate QR code data URL (simple SVG for demo)
   * @param {string} paymentLink - Payment link
   * @returns {string} QR code data URL
   */
  generateQRCodeDataUrl(paymentLink) {
    // Simple placeholder QR code SVG
    const svg = `
      <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="200" fill="white"/>
        <rect x="20" y="20" width="160" height="160" fill="black"/>
        <rect x="40" y="40" width="120" height="120" fill="white"/>
        <text x="100" y="105" text-anchor="middle" font-size="12" fill="black">QR Code</text>
        <text x="100" y="125" text-anchor="middle" font-size="8" fill="black">Payment Link</text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }

  /**
   * Get transaction details
   * @param {string} txHash - Transaction hash
   * @returns {Object} Transaction details
   */
  async getTransactionDetails(txHash) {
    try {
      const lcdUrl = import.meta.env.VITE_OSMOSIS_LCD_URL || 'https://lcd.osmosis.zone';
      const response = await axios.get(
        `${lcdUrl}/cosmos/tx/v1beta1/txs/${txHash}`
      );
      
      const tx = response.data.tx_response;
      return {
        height: tx.height,
        timestamp: tx.timestamp,
        confirmations: 1 // Calculate based on current height if needed
      };
    } catch (error) {
      console.error('Error getting transaction details:', error);
      return {};
    }
  }

  /**
   * Get all stored payments
   * @returns {Array} All payments
   */
  getAllPayments() {
    try {
      return JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    } catch (error) {
      console.error('Error getting all payments:', error);
      return [];
    }
  }

  /**
   * Clear all stored data (for testing)
   */
  clearAllData() {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.accountKey);
  }
}

export const privacyService = new OsmosisPrivacyService();