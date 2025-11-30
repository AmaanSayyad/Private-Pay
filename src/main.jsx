import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// Global error handler for uncaught promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Global] Unhandled promise rejection:', event.reason);
  
  // Check if it's a JSON parse error
  if (event.reason?.message?.includes('JSON') || event.reason?.message?.includes('Unexpected token')) {
    console.error('[Global] JSON parsing error detected. This may indicate corrupted data or HTML error pages.');
    event.preventDefault(); // Prevent the error from crashing the app
  }
});

// Global error handler for uncaught errors
window.addEventListener('error', (event) => {
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

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
