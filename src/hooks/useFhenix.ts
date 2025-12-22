import { useCallback, useEffect, useState } from "react";
import { BrowserProvider } from "ethers";
import { encryptAmount, initFhenixFhe, isFhenixFheInitialized, reinitFhenixFhe } from "../lib/fhenixFhe";
import type { FhenixEncryptionResult } from "../lib/fhenixTypes";

export function useFhenix() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      setError(null);

      try {
        // First, try to load cofhejs module (doesn't require wallet)
        let success = await initFhenixFhe();
        
        // If wallet is available, initialize with provider/signer
        if (typeof window !== "undefined" && window.ethereum) {
          try {
            // Check if wallet is connected
            const accounts = await window.ethereum.request({ method: "eth_accounts" });
            if (accounts.length > 0) {
              const provider = new BrowserProvider(window.ethereum);
              const signer = await provider.getSigner();
              success = await initFhenixFhe(provider, signer);
            } else {
              console.log("Wallet not connected, CoFHE module loaded but not initialized with provider");
            }
          } catch (walletError) {
            // Wallet not connected or error, but module might still be loaded
            console.warn("Wallet not available for CoFHE initialization:", walletError);
          }
        }
        
        setIsInitialized(success || isFhenixFheInitialized());
      } catch (err) {
        console.error("Fhenix FHE initialization error:", err);
        setError(err instanceof Error ? err.message : "Failed to initialize Fhenix FHE");
        setIsInitialized(isFhenixFheInitialized());
      } finally {
        setIsInitializing(false);
      }
    };

    void initialize();
  }, []);

  // Reinitialize when wallet connects
  useEffect(() => {
    const reinitialize = async () => {
      if (typeof window === "undefined" || !window.ethereum) {
        return;
      }
      
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0 && isFhenixFheInitialized()) {
          const provider = new BrowserProvider(window.ethereum);
          const signer = await provider.getSigner();
          const success = await reinitFhenixFhe(provider, signer);
          if (success) {
            setIsInitialized(true);
          }
        }
      } catch (err) {
        console.error("Fhenix FHE re-initialization error:", err);
      }
    };

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", async () => {
        await reinitialize();
      });
    }

    void reinitialize();
    
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", reinitialize);
      }
    };
  }, []);

  const encrypt = useCallback(async (amount: number): Promise<FhenixEncryptionResult> => {
    return encryptAmount(amount);
  }, []);

  return {
    isInitialized: isInitialized || isFhenixFheInitialized(),
    isInitializing,
    error,
    encrypt,
    isFallbackMode: !isFhenixFheInitialized(),
  };
}


