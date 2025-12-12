import { PublicKey } from "@solana/web3.js";

// Private Pay Program ID (from Anchor.toml)
// Default: 3tFjfuwwpWkEJfo5JYTFyozc4rEa8ysksgWJUcUq3qTx (devnet)
export const PRIVATE_PAY_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_PRIVATE_PAY_PROGRAM_ID ||
  "3tFjfuwwpWkEJfo5JYTFyozc4rEa8ysksgWJUcUq3qTx"
);

// Arcium Program ID
// This is the standard Arcium program ID for devnet
// Can be overridden via environment variable
export const ARCIUM_PROGRAM_ID = new PublicKey(
  import.meta.env.VITE_ARCIUM_PROGRAM_ID ||
  "Arcium1111111111111111111111111111111111111" // Placeholder - replace with actual Arcium program ID
);

