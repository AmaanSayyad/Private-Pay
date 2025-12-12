import { useMemo, useState, useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
import { PRIVATE_PAY_PROGRAM_ID } from "./constants.js";

// Dynamic import for Anchor program type
let PrivatePayProgram = null;

/**
 * Hook to get Arcium client with provider and accounts
 */
export function useArciumClient() {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const [mxeAccount, setMxeAccount] = useState(null);
  const [clusterAccount, setClusterAccount] = useState(null);

  const provider = useMemo(() => {
    if (!connection || !publicKey || !signTransaction) return null;
    
    return new AnchorProvider(
      connection,
      {
        publicKey,
        signTransaction,
        signAllTransactions,
      },
      { commitment: "confirmed" }
    );
  }, [connection, publicKey, signTransaction, signAllTransactions]);

  useEffect(() => {
    if (!provider || !PRIVATE_PAY_PROGRAM_ID) return;

    // Initialize Arcium accounts
    const initializeAccounts = async () => {
      try {
        // Dynamically import Arcium client
        const arciumLib = await import("@arcium-hq/client").catch(() => null);
        if (!arciumLib) {
          console.warn("@arcium-hq/client not available");
          return;
        }

        // Get MXE account address
        const mxeAddr = arciumLib.getMXEAccAddress(PRIVATE_PAY_PROGRAM_ID);
        setMxeAccount(mxeAddr);

        // Get cluster account (will be set when env is available)
        const env = arciumLib.getArciumEnv?.();
        if (env?.arciumClusterOffset) {
          const clusterAddr = arciumLib.getClusterAccAddress?.(env.arciumClusterOffset);
          if (clusterAddr) {
            setClusterAccount(clusterAddr);
          }
        }
      } catch (error) {
        console.error("Failed to initialize Arcium accounts:", error);
      }
    };

    initializeAccounts();
  }, [provider]);

  return useMemo(() => {
    if (!provider) return null;

    return {
      provider,
      mxeAccount,
      clusterAccount,
      connection: provider.connection,
    };
  }, [provider, mxeAccount, clusterAccount]);
}

// Initialize program loader
let programLoadPromise = null;

/**
 * Initialize the Private Pay program (call this once on app startup)
 */
export async function initializePrivatePayProgram() {
  if (PrivatePayProgram) return PrivatePayProgram;
  if (programLoadPromise) return programLoadPromise;

  programLoadPromise = (async () => {
    try {
      // Dynamic import Anchor
      const anchor = await import("@coral-xyz/anchor");
      
      // Try to load from Anchor workspace (if program has been built)
      if (anchor.workspace?.PrivatePay) {
        PrivatePayProgram = anchor.workspace.PrivatePay;
        return PrivatePayProgram;
      } else {
        // Fallback: try to fetch IDL from on-chain or use a placeholder
        console.warn("PrivatePay program types not found in workspace. You may need to build the Anchor program.");
        // Return null to indicate program is not available
        return null;
      }
    } catch (error) {
      console.error("Failed to load PrivatePay program:", error);
      return null;
    }
  })();

  return programLoadPromise;
}

/**
 * Get Private Pay Anchor program instance
 * Note: This function is synchronous but requires the program to be initialized first.
 * Call initializePrivatePayProgram() on app startup.
 */
export function getPrivatePayProgram(provider) {
  if (!provider) {
    throw new Error("Provider is required");
  }

  if (!PRIVATE_PAY_PROGRAM_ID) {
    throw new Error("PRIVATE_PAY_PROGRAM_ID is not configured");
  }

  if (!PrivatePayProgram) {
    // Program not initialized yet - return null and let the caller handle it
    console.warn("PrivatePay program not initialized. Call initializePrivatePayProgram() first.");
    return null;
  }

  // Return program instance
  // Note: The program from workspace should already be configured with a provider
  // If you need a new instance with a different provider, you may need to recreate it
  return PrivatePayProgram;
}

