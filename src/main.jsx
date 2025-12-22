import { Buffer } from "buffer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import activityLogger from "./lib/activityLogger.js";

// Ensure Buffer is available globally
if (typeof window !== "undefined") {
  window.Buffer = window.Buffer || Buffer;
  globalThis.Buffer = globalThis.Buffer || Buffer;
}
import ErrorBoundary from "./ErrorBoundary.jsx";
import "./index.css";

// Polyfill for require in browser (for CommonJS modules)
if (typeof window !== "undefined" && typeof window.require === "undefined") {
  window.require = (id) => {
    throw new Error(`require('${id}') is not supported in browser. Use ES modules instead.`);
  };
}

// Global error handler for uncaught promise rejections
window.addEventListener('unhandledrejection', (event) => {
  // Ignore WalletConnect connection errors (non-critical)
  const reason = event.reason?.message || String(event.reason || '');
  const reasonStr = typeof event.reason === 'object' ? JSON.stringify(event.reason) : String(event.reason || '');
  
  if (reason.includes('Socket stalled') || 
      reason.includes('WalletConnect') ||
      reason.includes('relay.walletconnect') ||
      reasonStr.includes('Socket stalled') ||
      reasonStr.includes('WalletConnect') ||
      reasonStr.includes('relay.walletconnect')) {
    // Suppress these warnings - they're non-critical
    // WalletConnect will fall back to other connection methods
    event.preventDefault();
    return;
  }
  
  console.error('[Global] Unhandled promise rejection:', event.reason);
  
  // Check if it's a JSON parse error
  if (event.reason?.message?.includes('JSON') || event.reason?.message?.includes('Unexpected token')) {
    console.error('[Global] JSON parsing error detected. This may indicate corrupted data or HTML error pages.');
    event.preventDefault(); // Prevent the error from crashing the app
  }
});

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
  // Suppress WalletConnect WebSocket errors (non-critical)
  const errorMessage = event.error?.message || event.message || '';
  if (errorMessage.includes('Socket stalled') || 
      errorMessage.includes('WalletConnect') ||
      errorMessage.includes('relay.walletconnect') ||
      errorMessage.includes('WebSocket connection')) {
    // Suppress these - they're non-critical connection attempts
    event.preventDefault();
    return;
  }
  
  console.error('[Global] Uncaught error:', event.error);
  
  // Check if it's a JSON parse error
  if (event.error?.message?.includes('JSON') || event.error?.message?.includes('Unexpected token')) {
    console.error('[Global] JSON parsing error detected. Clearing potentially corrupted localStorage...');
    
    // Try to identify and clear corrupted localStorage items
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        try {
          const item = localStorage.getItem(key);
          if (item && item.trim().startsWith('<')) {
            console.warn(`[Global] Removing HTML content from localStorage key: ${key}`);
            localStorage.removeItem(key);
          }
        } catch (err) {
          // Ignore errors for individual keys
        }
      });
    } catch (err) {
      console.error('[Global] Error while cleaning localStorage:', err);
    }
    
    event.preventDefault(); // Prevent the error from crashing the app
  }
});

// Clean up corrupted localStorage data on app initialization
try {
  const keys = Object.keys(localStorage);
  let cleanedCount = 0;
  
  keys.forEach(key => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const trimmed = item.trim();
        
        // Check for HTML content
        if (trimmed.startsWith('<')) {
          console.warn(`[Init] Removing HTML content from localStorage key: ${key}`);
          localStorage.removeItem(key);
          cleanedCount++;
          return;
        }
        
        // Validate JSON
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
          JSON.parse(item);
        }
      }
    } catch (error) {
      console.warn(`[Init] Cleaning corrupted localStorage key: ${key}`);
      try {
        localStorage.removeItem(key);
        cleanedCount++;
      } catch (removeError) {
        console.error(`[Init] Failed to remove corrupted key ${key}:`, removeError);
      }
    }
  });
  
  if (cleanedCount > 0) {
    console.log(`[Init] Cleaned ${cleanedCount} corrupted localStorage items`);
  }
} catch (error) {
  console.error('[Init] Error cleaning localStorage:', error);
}

console.log("[Main] Starting app initialization...");
console.log("[Main] Environment variables:", {
  VITE_DYNAMIC_ENV_ID: import.meta.env.VITE_DYNAMIC_ENV_ID ? "Set" : "Not set",
  VITE_WEBSITE_HOST: import.meta.env.VITE_WEBSITE_HOST || "Not set",
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? "Set" : "Not set",
  VITE_APP_ENVIRONMENT: import.meta.env.VITE_APP_ENVIRONMENT || "Not set",
});

// ============================================
// GLOBAL ACTIVITY LOGGING SETUP
// ============================================

// Check if verbose logging is enabled (only in dev mode)
const ENABLE_VERBOSE_LOGGING = import.meta.env.DEV;

if (ENABLE_VERBOSE_LOGGING) {
  activityLogger.info('AppInit', 'Initializing global activity logging...');
}

// Intercept native fetch calls (optimized - non-blocking)
const originalFetch = window.fetch;
window.fetch = function(...args) {
  const [url, options = {}] = args;
  const method = options.method || 'GET';
  const startTime = Date.now();
  
  // Log request (async, non-blocking) - only in verbose mode
  if (ENABLE_VERBOSE_LOGGING) {
    setTimeout(() => {
      activityLogger.logNetworkRequest(url, method, {
        // Only log minimal info to avoid performance issues
        hasBody: !!options.body,
      });
    }, 0);
  }
  
  return originalFetch.apply(this, args)
    .then(response => {
      const duration = Date.now() - startTime;
      
      // Log response (async, non-blocking, no body reading) - only in verbose mode
      if (ENABLE_VERBOSE_LOGGING) {
        setTimeout(() => {
          activityLogger.logNetworkResponse(url, method, response.status, duration, {
            // Don't read body - too expensive
          });
        }, 0);
      }
      
      return response;
    })
    .catch(error => {
      const duration = Date.now() - startTime;
      // Only log errors (important)
      activityLogger.logNetworkError(url, method, error);
      throw error;
    });
};

// Global click listener for all buttons and interactive elements (throttled)
let lastClickTime = 0;
let clickThrottleTimeout;
const CLICK_THROTTLE_MS = 100; // Throttle clicks to max 10 per second

document.addEventListener('click', (event) => {
  const now = Date.now();
  const timeSinceLastClick = now - lastClickTime;
  
  // Throttle rapid clicks
  if (timeSinceLastClick < CLICK_THROTTLE_MS) {
    clearTimeout(clickThrottleTimeout);
    clickThrottleTimeout = setTimeout(() => {
      processClick(event);
    }, CLICK_THROTTLE_MS - timeSinceLastClick);
    return;
  }
  
  processClick(event);
  lastClickTime = now;
}, true);

function processClick(event) {
  const target = event.target;
  
  // Quick check - only process actual interactive elements
  if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.closest('button') || target.closest('a')) {
    const element = target.closest('button') || target.closest('a') || target;
    
    // Use requestIdleCallback to avoid blocking UI
    const logClick = () => {
      const buttonText = element.textContent?.trim() || element.getAttribute('aria-label') || '';
      activityLogger.logClick(element, {
        buttonText: buttonText.substring(0, 50),
        page: window.location.pathname,
      });
    };
    
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(logClick, { timeout: 50 });
    } else {
      setTimeout(logClick, 0);
    }
  }
}

// Log all navigation changes
let currentPath = window.location.pathname;
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function(...args) {
  const newPath = args[2] || window.location.pathname;
  if (newPath !== currentPath) {
    activityLogger.logNavigation(currentPath, newPath, 'pushState');
    currentPath = newPath;
  }
  return originalPushState.apply(history, args);
};

history.replaceState = function(...args) {
  const newPath = args[2] || window.location.pathname;
  if (newPath !== currentPath) {
    activityLogger.logNavigation(currentPath, newPath, 'replaceState');
    currentPath = newPath;
  }
  return originalReplaceState.apply(history, args);
};

window.addEventListener('popstate', () => {
  const newPath = window.location.pathname;
  if (newPath !== currentPath) {
    activityLogger.logNavigation(currentPath, newPath, 'popstate');
    currentPath = newPath;
  }
});

// Log page visibility changes
document.addEventListener('visibilitychange', () => {
  activityLogger.info('PageVisibility', `Page ${document.hidden ? 'hidden' : 'visible'}`);
});

// Log window focus/blur
window.addEventListener('focus', () => {
  activityLogger.info('WindowFocus', 'Window focused');
});

window.addEventListener('blur', () => {
  activityLogger.info('WindowBlur', 'Window blurred');
});

// Log form submissions
document.addEventListener('submit', (event) => {
  const form = event.target;
  activityLogger.info('FormSubmit', `Form submitted: ${form.id || form.className || 'unknown'}`, {
    formId: form.id,
    formAction: form.action,
    formMethod: form.method,
  });
});

// Log input changes (heavily throttled - only in verbose mode)
if (ENABLE_VERBOSE_LOGGING) {
  let inputChangeTimeout;
  document.addEventListener('input', (event) => {
    clearTimeout(inputChangeTimeout);
    inputChangeTimeout = setTimeout(() => {
      const target = event.target;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
        // Only log if it's a significant input (not every keystroke)
        if (target.value && target.value.length > 3) {
          activityLogger.info('InputChange', `Input: ${target.name || target.id || 'unknown'}`, {
            inputType: target.type,
            valueLength: target.value?.length || 0,
          });
        }
      }
    }, 1000); // Heavy throttle - only log after 1 second of inactivity
  });
}

if (ENABLE_VERBOSE_LOGGING) {
  activityLogger.success('AppInit', 'Global activity logging initialized successfully');
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  console.error("[Main] Root element not found!");
  document.body.innerHTML = '<div style="padding: 20px; text-align: center;"><h1>Error: Root element not found</h1><p>Please check the HTML structure.</p></div>';
} else {
  console.log("[Main] Root element found, creating React root...");
  try {
    const root = createRoot(rootElement);
    console.log("[Main] React root created, rendering app...");
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>
    );
    console.log("[Main] App rendered successfully");
  } catch (error) {
    console.error("[Main] Failed to render app:", error);
    console.error("[Main] Error stack:", error.stack);
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: system-ui;">
        <h1 style="color: #dc2626; margin-bottom: 10px;">Failed to Load App</h1>
        <p style="color: #666; margin-bottom: 20px;">${error.message}</p>
        <pre style="background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: left; overflow: auto; max-width: 600px; margin: 0 auto 20px; font-size: 12px;">${error.stack || String(error)}</pre>
        <button onclick="window.location.reload()" style="padding: 10px 20px; background: #0070f3; color: white; border: none; border-radius: 5px; cursor: pointer;">
          Reload Page
        </button>
      </div>
    `;
  }
}
