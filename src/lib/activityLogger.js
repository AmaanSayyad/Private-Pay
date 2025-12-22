/**
 * Comprehensive Activity Logger
 * Logs all user interactions, network requests, and state changes
 * Optimized for performance with throttling and async operations
 */

const LOG_PREFIX = '🔵 [ActivityLogger]';
const MAX_LOG_HISTORY = 1000;
let logHistory = [];

// Performance optimization: Only log to backend in dev mode
const ENABLE_BACKEND_LOGGING = import.meta.env.DEV && import.meta.env.VITE_ENABLE_BACKEND_LOGGING === 'true';
const ENABLE_VERBOSE_LOGGING = import.meta.env.DEV;

// Log levels
export const LogLevel = {
  INFO: 'info',
  WARN: 'warn',
  ERROR: 'error',
  SUCCESS: 'success',
  NETWORK: 'network',
  CLICK: 'click',
  NAVIGATION: 'navigation',
  STATE: 'state',
};

// Enhanced console logging with styling
function logWithStyle(level, category, message, data = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    category,
    message,
    data,
    url: window.location.href,
    pathname: window.location.pathname,
  };

  // Add to history
  logHistory.push(logEntry);
  if (logHistory.length > MAX_LOG_HISTORY) {
    logHistory.shift();
  }

  // Console styling
  const styles = {
    info: 'color: #3b82f6; font-weight: bold;',
    warn: 'color: #f59e0b; font-weight: bold;',
    error: 'color: #ef4444; font-weight: bold;',
    success: 'color: #10b981; font-weight: bold;',
    network: 'color: #8b5cf6; font-weight: bold;',
    click: 'color: #ec4899; font-weight: bold;',
    navigation: 'color: #06b6d4; font-weight: bold;',
    state: 'color: #14b8a6; font-weight: bold;',
  };

  const style = styles[level] || styles.info;
  const emoji = {
    info: 'ℹ️',
    warn: '⚠️',
    error: '❌',
    success: '✅',
    network: '🌐',
    click: '🖱️',
    navigation: '🧭',
    state: '🔄',
  }[level] || '📝';

  const logMessage = `${emoji} ${LOG_PREFIX} [${category}] ${message}`;
  
  // Log to console with appropriate method
  if (level === 'error') {
    console.error(`%c${logMessage}`, style, data || '');
  } else if (level === 'warn') {
    console.warn(`%c${logMessage}`, style, data || '');
  } else {
    console.log(`%c${logMessage}`, style, data || '');
  }

  // Also log to terminal via fetch (if backend available and enabled)
  // Use requestIdleCallback or setTimeout to avoid blocking
  if (ENABLE_BACKEND_LOGGING && import.meta.env.VITE_BACKEND_URL) {
    const sendLog = () => {
      try {
        fetch(`${import.meta.env.VITE_BACKEND_URL}/api/logs`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(logEntry),
          keepalive: true, // Don't block page unload
        }).catch(() => {
          // Silently fail if backend is not available
        });
      } catch (e) {
        // Ignore errors
      }
    };
    
    // Use requestIdleCallback if available, otherwise setTimeout
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(sendLog, { timeout: 1000 });
    } else {
      setTimeout(sendLog, 0);
    }
  }

  return logEntry;
}

// Public API
export const activityLogger = {
  // Button clicks and interactions (optimized)
  logClick: (element, details = {}) => {
    // Only get minimal info to avoid expensive DOM queries
    const elementInfo = {
      tag: element.tagName,
      id: element.id || undefined,
      text: element.textContent?.trim().substring(0, 30) || undefined,
      href: element.href || undefined,
      ...details,
    };
    // Remove undefined values to reduce log size
    Object.keys(elementInfo).forEach(key => {
      if (elementInfo[key] === undefined) delete elementInfo[key];
    });
    return logWithStyle(LogLevel.CLICK, 'ButtonClick', `Click: ${elementInfo.text || elementInfo.id || element.tagName}`, elementInfo);
  },

  // Navigation
  logNavigation: (from, to, method = 'unknown') => {
    return logWithStyle(LogLevel.NAVIGATION, 'Navigation', `Navigating from "${from}" to "${to}" (${method})`, { from, to, method });
  },

  // Network requests
  logNetworkRequest: (url, method, data = null) => {
    return logWithStyle(LogLevel.NETWORK, 'NetworkRequest', `${method} ${url}`, { url, method, data, timestamp: Date.now() });
  },

  logNetworkResponse: (url, method, status, duration, data = null) => {
    return logWithStyle(
      LogLevel.NETWORK,
      'NetworkResponse',
      `${method} ${url} → ${status} (${duration}ms)`,
      { url, method, status, duration, data, timestamp: Date.now() }
    );
  },

  logNetworkError: (url, method, error) => {
    return logWithStyle(LogLevel.ERROR, 'NetworkError', `${method} ${url} failed`, { url, method, error: error.message, timestamp: Date.now() });
  },

  // State changes
  logStateChange: (component, stateName, oldValue, newValue) => {
    return logWithStyle(LogLevel.STATE, 'StateChange', `${component}: ${stateName} changed`, { component, stateName, oldValue, newValue });
  },

  // General logging
  info: (category, message, data = null) => logWithStyle(LogLevel.INFO, category, message, data),
  warn: (category, message, data = null) => logWithStyle(LogLevel.WARN, category, message, data),
  error: (category, message, data = null) => logWithStyle(LogLevel.ERROR, category, message, data),
  success: (category, message, data = null) => logWithStyle(LogLevel.SUCCESS, category, message, data),

  // Get log history
  getHistory: () => [...logHistory],
  clearHistory: () => { logHistory = []; },
};

// Make it globally available
if (typeof window !== 'undefined') {
  window.activityLogger = activityLogger;
}

export default activityLogger;
