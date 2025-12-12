/**
 * Arcium Constants
 * 
 * Program IDs and configuration constants for Arcium integration
 */

import { PublicKey } from "@solana/web3.js";

// Private Pay Program ID
// Set via environment variable or use placeholder
export const PRIVATE_PAY_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PRIVATE_PAY_PROGRAM_ID || 
  "11111111111111111111111111111111"
);

// Arcium Program ID
export const ARCIUM_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_ARCIUM_PROGRAM_ID || 
  "11111111111111111111111111111111"
);

// Arcium Environment (testnet/mainnet)
export const ARCIUM_ENV = import.meta.env.VITE_ARCIUM_ENV || "testnet";

// Arcium Cluster Offset
export const ARCIUM_CLUSTER_OFFSET = parseInt(
  import.meta.env.VITE_ARCIUM_CLUSTER_OFFSET || "0",
  10
);

