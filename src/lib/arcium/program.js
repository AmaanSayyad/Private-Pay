import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { PRIVATE_PAY_PROGRAM_ID } from "./constants.js";
import privatePayIdlRaw from "../arcium/idl/private_pay.json";

// Handle IDL import - Vite may wrap it in default export
let privatePayIdl = privatePayIdlRaw?.default || privatePayIdlRaw;

// Clean the IDL on import to remove any problematic fields
if (privatePayIdl) {
  const cleaned = JSON.parse(JSON.stringify(privatePayIdl));
  if (cleaned.metadata) delete cleaned.metadata;
  if (cleaned.address) delete cleaned.address;
  privatePayIdl = cleaned;
}

/**
 * Returns an Anchor Program client for the Private Pay MXE using the given provider.
 * Requires wallet connected + connection.
 */
export const getPrivatePayProgram = (provider) => {
  if (!provider) {
    console.error("[getPrivatePayProgram] Provider is null");
    return null;
  }
  
  if (!PRIVATE_PAY_PROGRAM_ID) {
    console.error("[getPrivatePayProgram] PRIVATE_PAY_PROGRAM_ID is not defined");
    return null;
  }
  
  if (!privatePayIdl) {
    console.error("[getPrivatePayProgram] privatePayIdl is not loaded");
    return null;
  }
  
  try {
    // Deep clone to avoid mutating the original
    const cleanIdl = JSON.parse(JSON.stringify(privatePayIdl));
    
    // Remove accounts field - Anchor 0.28 doesn't need it for instruction calls
    delete cleanIdl.accounts;
    delete cleanIdl.address;
    delete cleanIdl.metadata;
    
    // Use 3-parameter constructor (IDL, programId, provider)
    // This is more compatible across Anchor versions
    const program = new anchor.Program(cleanIdl, PRIVATE_PAY_PROGRAM_ID, provider);
    
    console.log("[getPrivatePayProgram] ✓ Program created successfully");
    console.log("Available methods:", Object.keys(program.methods));
    
    return program;
  } catch (error) {
    console.error("[getPrivatePayProgram] Failed to create program:", error.message);
    console.error("[getPrivatePayProgram] Full error:", error);
    console.error("[getPrivatePayProgram] Error stack:", error.stack);
    return null;
  }
};



