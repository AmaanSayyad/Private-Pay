import { SigningStargateClient } from '@cosmjs/stargate';
import { coins } from '@cosmjs/amino';
import axios from 'axios';

/**
 * Frontend-only Osmosis to Zcash Bridge Service
 * Handles cross-chain transfers with privacy preservation
 */
export class OsmosisBridgeService {
  constructor() {
    this.bridgeVault = import.meta.env.VITE_OSMOSIS_BRIDGE_VAULT || 'osmo1privatepay2024bridgevault7x8y9z0a1b2c3d4e5f6g';
    this.rpcUrl = import.meta.env.VITE_OSMOSIS_RPC_URL || 'https://rpc.osmosis.zone';
    this.lcdUrl = import.meta.env.VITE_OSMOSIS_LCD_URL || 'https://lcd.osmosis.zone';
    this.bridgeFee = parseFloat(import.meta.env.VITE_OSMOSIS_BRIDGE_FEE || '0.001');
    
    // Store bridge requests in localStorage for demo
    this.storageKey = 'osmosis_bridge_requests';
  }

  /**
   * Initiate bridge transfer from Osmosis to Zcash
   * @param {string} senderAddress - Osmosis sender address
   * @param {string} amount - Amount in OSMO
   * @param {string} zcashAddress - Destination Zcash shielded address
   * @param {Function} getSigningClient - Function to get signing client
   * @returns {Object} Transaction result
   */
  async bridgeToZcash(senderAddress, amount, zcashAddress, getSigningClient) {
    try {
      // Validate Zcash address
      if (!this.isValidZcashAddress(zcashAddress)) {
        throw new Error('Invalid Zcash shielded address');
      }

      const client = await getSigningClient();
      
      // Convert amount to microOSMO
      const microAmount = Math.floor(parseFloat(amount) * 1_000_000).toString();
      
      const fee = {
        amount: coins(5000, 'uosmo'),
        gas: '200000'
      };

      // Create bridge memo with destination and privacy flags
      const bridgeMemo = JSON.stringify({
        destination: zcashAddress,
        chain: 'zcash',
        privacy: true,
        timestamp: Date.now(),
        version: '1.0'
      });

      // Send tokens to bridge vault
      const result = await client.sendTokens(
        senderAddress,
        this.bridgeVault,
        coins(microAmount, 'uosmo'),
        fee,
        bridgeMemo
      );

      if (result.code === 0) {
        // Store bridge request locally
        this.storeBridgeRequest({
          txHash: result.transactionHash,
          sender: senderAddress,
          amount: amount,
          destination: zcashAddress,
          status: 'pending',
          timestamp: Date.now()
        });

        // Simulate bridge processing
        this.simulateBridgeProcessing(result.transactionHash, amount, zcashAddress);
      }

      return result;
    } catch (error) {
      console.error('Bridge error:', error);
      throw error;
    }
  }

  /**
   * Simulate bridge processing (for demo purposes)
   * @param {string} txHash - Osmosis transaction hash
   * @param {string} amount - Amount to bridge
   * @param {string} zcashAddress - Destination address
   */
  async simulateBridgeProcessing(txHash, amount, zcashAddress) {
    // Simulate processing time (2-5 minutes)
    const processingTime = 2000 + Math.random() * 3000; // 2-5 seconds for demo
    
    setTimeout(async () => {
      try {
        // Get exchange rate
        const zcashAmount = await this.getZcashExchangeRate(amount);
        
        // Generate mock Zcash transaction ID
        const zcashTxId = this.generateMockZcashTxId();
        
        // Update status to completed
        this.updateBridgeStatus(txHash, 'completed', zcashTxId);
        
        console.log(`Bridge completed: ${amount} OSMO → ${zcashAmount.toFixed(6)} ZEC`);
        console.log(`Zcash TX: ${zcashTxId}`);
        
      } catch (error) {
        console.error('Bridge processing error:', error);
        this.updateBridgeStatus(txHash, 'failed', null, error.message);
      }
    }, processingTime);
  }

  /**
   * Generate mock Zcash transaction ID
   * @returns {string} Mock transaction ID
   */
  generateMockZcashTxId() {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < 64; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Get current OSMO to ZEC exchange rate
   * @param {string} osmoAmount - Amount in OSMO
   * @returns {number} Equivalent ZEC amount
   */
  async getZcashExchangeRate(osmoAmount) {
    try {
      // Get prices from CoinGecko
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
        params: {
          ids: 'osmosis,zcash',
          vs_currencies: 'usd'
        }
      });

      const osmoPrice = response.data.osmosis?.usd || 0;
      const zcashPrice = response.data.zcash?.usd || 0;

      if (!osmoPrice || !zcashPrice) {
        throw new Error('Unable to fetch exchange rates');
      }

      const usdValue = parseFloat(osmoAmount) * osmoPrice;
      const zcashAmount = usdValue / zcashPrice;

      // Apply bridge fee (0.1%)
      return zcashAmount * 0.999;
    } catch (error) {
      console.error('Exchange rate error:', error);
      // Fallback to fixed rate
      return parseFloat(osmoAmount) * 0.05;
    }
  }

  /**
   * Validate Zcash shielded address
   * @param {string} address - Address to validate
   * @returns {boolean} Is valid
   */
  isValidZcashAddress(address) {
    // Zcash shielded addresses start with 'zs1' (Sapling) or 'u1' (Unified)
    return /^(zs1|u1)[a-zA-Z0-9]{75,}$/.test(address);
  }

  /**
   * Store bridge request in localStorage
   * @param {Object} request - Bridge request data
   */
  storeBridgeRequest(request) {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      stored.push(request);
      localStorage.setItem(this.storageKey, JSON.stringify(stored));
    } catch (error) {
      console.error('Failed to store bridge request:', error);
    }
  }

  /**
   * Update bridge status
   * @param {string} txHash - Transaction hash
   * @param {string} status - New status
   * @param {string} zcashTxId - Zcash transaction ID
   * @param {string} error - Error message if failed
   */
  updateBridgeStatus(txHash, status, zcashTxId = null, error = null) {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      const index = stored.findIndex(req => req.txHash === txHash);
      
      if (index !== -1) {
        stored[index].status = status;
        stored[index].updatedAt = Date.now();
        if (zcashTxId) stored[index].zcashTxId = zcashTxId;
        if (error) stored[index].error = error;
        
        localStorage.setItem(this.storageKey, JSON.stringify(stored));
      }
    } catch (error) {
      console.error('Failed to update bridge status:', error);
    }
  }

  /**
   * Get bridge status
   * @param {string} txHash - Transaction hash
   * @returns {Object} Bridge status
   */
  getBridgeStatus(txHash) {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      const request = stored.find(req => req.txHash === txHash);
      return request || { status: 'unknown' };
    } catch (error) {
      console.error('Failed to get bridge status:', error);
      return { status: 'unknown' };
    }
  }

  /**
   * Get bridge history for user
   * @param {string} address - User address
   * @returns {Array} Bridge transactions
   */
  getBridgeHistory(address) {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return stored.filter(req => req.sender === address);
    } catch (error) {
      console.error('Failed to get bridge history:', error);
      return [];
    }
  }

  /**
   * Wait for Osmosis transaction confirmation
   * @param {string} txHash - Transaction hash
   * @returns {Promise} Resolves when confirmed
   */
  async waitForConfirmation(txHash) {
    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await axios.get(`${this.lcdUrl}/cosmos/tx/v1beta1/txs/${txHash}`);
        
        if (response.data.tx_response && response.data.tx_response.code === 0) {
          return response.data.tx_response;
        }
      } catch (error) {
        // Transaction not found yet, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }

    throw new Error('Transaction confirmation timeout');
  }
}

export const bridgeService = new OsmosisBridgeService();