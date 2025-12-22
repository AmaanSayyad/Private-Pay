/**
 * React hooks for Arcium integration
 */

import { useMemo } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import * as anchor from "@coral-xyz/anchor";
import { ARCIUM_PROGRAM_ID, PRIVATE_PAY_PROGRAM_ID } from "./constants.js";
import {
  getArciumEnvSafe,
  getMXEAccAddressSafe,
  getClusterAccAddressSafe,
} from "./env.js";

/**
 * Hook to get Arcium client instance with provider and accounts
 */
export function useArciumClient() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const arciumClient = useMemo(() => {
    // Check prerequisites
    if (!connection) {
      console.warn("useArciumClient: Connection not available");
      return null;
    }
    
    if (!wallet.publicKey) {
      console.warn("useArciumClient: Wallet not connected");
      return null;
    }

    if (!wallet.signTransaction || !wallet.signAllTransactions) {
      console.warn("useArciumClient: Wallet sign functions not available");
      return null;
    }

    if (!PRIVATE_PAY_PROGRAM_ID) {
      console.error("useArciumClient: PRIVATE_PAY_PROGRAM_ID is not configured");
      return null;
    }

    try {
      // Create Anchor provider
      const provider = new anchor.AnchorProvider(
        connection,
        {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction,
          signAllTransactions: wallet.signAllTransactions,
        },
        { commitment: "confirmed" }
      );

      // Get Arcium environment (browser-safe)
      const env = getArciumEnvSafe();

      // Derive Arcium accounts using browser-safe functions
      const mxeAccount = getMXEAccAddressSafe();
      const clusterAccount = getClusterAccAddressSafe(env.arciumClusterOffset);

      return {
        provider,
        connection,
        wallet,
        mxeAccount,
        clusterAccount,
        clusterOffset: env.arciumClusterOffset,
        arciumProgramId: ARCIUM_PROGRAM_ID,
        programId: PRIVATE_PAY_PROGRAM_ID,
      };
    } catch (error) {
      console.error("Failed to create Arcium client:", error);
      return null;
    }
  }, [connection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions]);

  return arciumClient;
}
