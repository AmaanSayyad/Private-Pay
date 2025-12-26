// Aleo Utility Functions
// Common utilities for Aleo blockchain interactions

import { CURRENT_NETWORK, ALEO_ENDPOINTS, TX_CONFIG } from './constants.js';

/**
 * Convert credits to microcredits
 * @param {number} credits - Amount in credits
 * @returns {number} Amount in microcredits
 */
export const creditsToMicrocredits = (credits) => {
  return Math.floor(credits * 1_000_000);
};

/**
 * Convert microcredits to credits
 * @param {number} microcredits - Amount in microcredits
 * @returns {number} Amount in credits
 */
export const microcreditsToCredits = (microcredits) => {
  return microcredits / 1_000_000;
};

/**
 * Format Aleo address for display
 * @param {string} address - Full Aleo address
 * @param {number} startChars - Number of characters to show at start
 * @param {number} endChars - Number of characters to show at end
 * @returns {string} Formatted address
 */
export const formatAleoAddress = (address, startChars = 8, endChars = 6) => {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  return `${address.substring(0, startChars)}...${address.substring(address.length - endChars)}`;
};

/**
 * Validate Aleo address format
 * @param {string} address - Address to validate
 * @returns {boolean} True if valid
 */
export const isValidAleoAddress = (address) => {
  if (!address || typeof address !== 'string') return false;
  // Aleo addresses start with 'aleo1' and are 63 characters long
  return /^aleo1[a-z0-9]{59}$/.test(address);
};

/**
 * Generate transaction ID from transaction data
 * @param {Object} transaction - Transaction object
 * @returns {string} Transaction ID
 */
export const generateTransactionId = (transaction) => {
  // This is a simplified implementation
  // Real implementation would use proper hashing
  const data = JSON.stringify(transaction);
  return `tx_${Date.now()}_${data.length}`;
};

/**
 * Get current network configuration
 * @returns {Object} Network configuration
 */
export const getCurrentNetworkConfig = () => {
  return ALEO_ENDPOINTS[CURRENT_NETWORK.toUpperCase()];
};

/**
 * Create transaction object for Leo program execution
 * @param {string} program - Program ID
 * @param {string} functionName - Function to call
 * @param {Array} inputs - Function inputs
 * @param {number} fee - Transaction fee in microcredits
 * @returns {Object} Transaction object
 */
export const createTransaction = (program, functionName, inputs, fee = TX_CONFIG.DEFAULT_FEE) => {
  return {
    program,
    function: functionName,
    inputs,
    fee,
    timestamp: Date.now(),
  };
};

/**
 * Wait for transaction confirmation
 * @param {string} txId - Transaction ID
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<Object>} Transaction result
 */
export const waitForTransaction = async (txId, timeout = TX_CONFIG.TIMEOUT) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkTransaction = async () => {
      try {
        // This would query the actual Aleo network
        // For now, we'll simulate a successful transaction
        if (Date.now() - startTime > timeout) {
          reject(new Error('Transaction timeout'));
          return;
        }
        
        // Simulate transaction confirmation after 2 seconds
        if (Date.now() - startTime > 2000) {
          resolve({
            id: txId,
            status: 'confirmed',
            blockHeight: Math.floor(Math.random() * 1000000),
            timestamp: Date.now(),
          });
          return;
        }
        
        setTimeout(checkTransaction, 1000);
      } catch (error) {
        reject(error);
      }
    };
    
    checkTransaction();
  });
};

/**
 * Calculate slippage for AMM swaps
 * @param {number} expectedAmount - Expected output amount
 * @param {number} actualAmount - Actual output amount
 * @returns {number} Slippage percentage
 */
export const calculateSlippage = (expectedAmount, actualAmount) => {
  if (expectedAmount === 0) return 0;
  return Math.abs((expectedAmount - actualAmount) / expectedAmount) * 100;
};

/**
 * Calculate price impact for large trades
 * @param {number} inputAmount - Input token amount
 * @param {number} inputReserve - Input token reserve
 * @param {number} outputReserve - Output token reserve
 * @returns {number} Price impact percentage
 */
export const calculatePriceImpact = (inputAmount, inputReserve, outputReserve) => {
  if (inputReserve === 0 || outputReserve === 0) return 0;
  
  const spotPrice = outputReserve / inputReserve;
  const newInputReserve = inputReserve + inputAmount;
  const newOutputReserve = outputReserve - (inputAmount * outputReserve) / newInputReserve;
  const newSpotPrice = newOutputReserve / newInputReserve;
  
  return Math.abs((spotPrice - newSpotPrice) / spotPrice) * 100;
};

/**
 * Retry function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxAttempts - Maximum retry attempts
 * @param {number} baseDelay - Base delay in milliseconds
 * @returns {Promise} Function result
 */
export const retryWithBackoff = async (fn, maxAttempts = TX_CONFIG.RETRY_ATTEMPTS, baseDelay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      if (attempt === maxAttempts) {
        throw lastError;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
};

/**
 * Parse Leo program output
 * @param {string} output - Raw program output
 * @returns {Object} Parsed output
 */
export const parseProgramOutput = (output) => {
  try {
    // This would parse actual Leo program output format
    // For now, we'll return a simplified structure
    return {
      success: true,
      data: output,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: Date.now(),
    };
  }
};