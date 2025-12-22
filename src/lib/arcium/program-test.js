/**
 * Test file to debug Anchor Program creation
 * Run this in browser console to test different approaches
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

// Minimal test IDL
const testIdl = {
  version: "0.1.0",
  name: "private_pay",
  instructions: [
    {
      name: "test_instruction",
      accounts: [],
      args: []
    }
  ]
};

export function testProgramCreation(provider, programIdString) {
  console.log("=== Testing Anchor Program Creation ===");
  console.log("Provider:", provider);
  console.log("Program ID String:", programIdString);
  
  const programId = new PublicKey(programIdString);
  console.log("Program ID PublicKey:", programId);
  console.log("Program ID has _bn:", !!programId._bn);
  
  // Test 1: 3-parameter constructor
  try {
    const program1 = new anchor.Program(testIdl, programId, provider);
    console.log("✓ Test 1 PASSED: 3-parameter constructor works");
    return program1;
  } catch (e) {
    console.error("✗ Test 1 FAILED:", e.message);
  }
  
  // Test 2: 2-parameter with address in IDL
  try {
    const idlWithAddress = { ...testIdl, address: programIdString };
    const program2 = new anchor.Program(idlWithAddress, provider);
    console.log("✓ Test 2 PASSED: 2-parameter constructor with address works");
    return program2;
  } catch (e) {
    console.error("✗ Test 2 FAILED:", e.message);
  }
  
  // Test 3: Check if it's a provider issue
  try {
    console.log("Provider type:", provider.constructor.name);
    console.log("Provider has connection:", !!provider.connection);
    console.log("Provider has wallet:", !!provider.wallet);
    console.log("Provider wallet type:", provider.wallet?.constructor?.name);
  } catch (e) {
    console.error("Provider inspection failed:", e);
  }
  
  return null;
}
