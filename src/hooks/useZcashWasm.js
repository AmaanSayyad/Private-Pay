import { useEffect, useState, useRef } from 'react';

/**
 * React hook to initialize Zcash WebAssembly modules (WebZjs SDK)
 * This hook ensures WASM is initialized once at the app level to avoid memory leaks
 * 
 * Usage:
 * - Call this hook at the root level of your app (e.g., in App.jsx or RootProvider)
 * - The hook will automatically initialize initWasm and initThreadPool
 * - Returns initialization status and any errors
 */
export const useZcashWasm = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const initRef = useRef(false);

  useEffect(() => {
    // Prevent multiple initializations
    if (initRef.current) {
      return;
    }
    
    initRef.current = true;

    const initializeWasm = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Dynamic import to ensure WebZjs is only loaded when needed
        // This will work once WebZjs is built and linked to the project
        const { initWasm, initThreadPool } = await import('@/lib/zcash/webzjs-wrapper');

        console.log('[useZcashWasm] Initializing WASM module...');
        await initWasm();
        
        console.log('[useZcashWasm] Initializing thread pool...');
        // Use hardware concurrency or fallback to 4 threads
        const threadCount = navigator.hardwareConcurrency || 4;
        await initThreadPool(threadCount);
        
        console.log(`[useZcashWasm] Successfully initialized with ${threadCount} threads`);
        setIsInitialized(true);
      } catch (err) {
        console.error('[useZcashWasm] Initialization failed:', err);
        setError(err.message || 'Failed to initialize Zcash WASM');
        
        // If WebZjs is not available, provide helpful error message
        if (err.message?.includes('Cannot find module')) {
          setError('WebZjs SDK not found. Please build and link the SDK first. See WEBZJS_SETUP.md for instructions.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeWasm();

    // Cleanup function
    return () => {
      // Note: WebZjs may not support explicit cleanup
      // The WASM module will be garbage collected when the page unloads
      console.log('[useZcashWasm] Component unmounting - WASM will persist');
    };
  }, []);

  return {
    isInitialized,
    isLoading,
    error,
  };
};

export default useZcashWasm;

