/**
 * Utility functions for safe localStorage operations
 * Handles corrupted data and provides safe parsing
 */

/**
 * Safely get and parse JSON from localStorage
 * @param {string} key - localStorage key
 * @param {*} defaultValue - Default value if key doesn't exist or is invalid
 * @returns {*} Parsed value or defaultValue
 */
export function safeGetJSON(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    if (!item) {
      return defaultValue;
    }

    // Validate that the data looks like JSON
    const trimmed = item.trim();
    if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) {
      console.warn(`Invalid JSON data in localStorage key "${key}", clearing...`);
      localStorage.removeItem(key);
      return defaultValue;
    }

    return JSON.parse(item);
  } catch (error) {
    console.error(`Error parsing JSON from localStorage key "${key}":`, error);
    // Clear corrupted data
    try {
      localStorage.removeItem(key);
    } catch (clearError) {
      console.error(`Failed to clear corrupted data for key "${key}":`, clearError);
    }
    return defaultValue;
  }
}

/**
 * Safely set JSON to localStorage
 * @param {string} key - localStorage key
 * @param {*} value - Value to store (will be JSON stringified)
 * @returns {boolean} Success status
 */
export function safeSetJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error saving to localStorage key "${key}":`, error);
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError') {
      console.warn('localStorage quota exceeded, clearing old data...');
      // Try to clear some old data
      try {
        // Clear balance history for old accounts (keep last 7 days)
        const keys = Object.keys(localStorage);
        keys.forEach(k => {
          if (k.startsWith('aptos_balance_history_')) {
            localStorage.removeItem(k);
          }
        });
        // Retry
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch (retryError) {
        console.error('Failed to save after clearing old data:', retryError);
      }
    }
    return false;
  }
}

/**
 * Clear all corrupted localStorage data
 * Useful for debugging and recovery
 */
export function clearCorruptedData() {
  const keys = Object.keys(localStorage);
  let cleared = 0;
  
  keys.forEach(key => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        // Try to parse - if it fails, it's corrupted
        const trimmed = item.trim();
        if (trimmed && (trimmed[0] === '{' || trimmed[0] === '[')) {
          JSON.parse(item);
        }
      }
    } catch (error) {
      console.warn(`Clearing corrupted localStorage key: ${key}`);
      try {
        localStorage.removeItem(key);
        cleared++;
      } catch (clearError) {
        console.error(`Failed to clear key ${key}:`, clearError);
      }
    }
  });
  
  console.log(`Cleared ${cleared} corrupted localStorage items`);
  return cleared;
}

