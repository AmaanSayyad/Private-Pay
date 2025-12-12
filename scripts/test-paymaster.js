/**
 * Test Paymaster Wallet Setup
 * 
 * This script verifies that the paymaster private key is correctly configured
 * and can be used to create a wallet on Sapphire network.
 * 
 * Usage: node scripts/test-paymaster.js
 * 
 * Make sure VITE_PAYMASTER_PK is set in your .env file
 */

import { ethers } from "ethers";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Read .env file manually
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
let PAYMASTER_PK = null;

try {
  const envPath = join(__dirname, "..", ".env");
  const envContent = readFileSync(envPath, "utf-8");
  const match = envContent.match(/VITE_PAYMASTER_PK=(.+)/);
  if (match) {
    PAYMASTER_PK = match[1].trim();
  }
} catch (error) {
  console.error("Could not read .env file:", error.message);
}
const SAPPHIRE_TESTNET_RPC = "https://testnet.sapphire.oasis.io";

async function testPaymaster() {
  console.log("🔍 Testing Paymaster Configuration...\n");

  // Check if private key is set
  if (!PAYMASTER_PK) {
    console.error("❌ VITE_PAYMASTER_PK is not set in environment variables");
    console.log("\n💡 To fix:");
    console.log("   1. Add VITE_PAYMASTER_PK to your .env file");
    console.log("   2. Format: VITE_PAYMASTER_PK=0x...");
    process.exit(1);
  }

  // Validate format
  if (!PAYMASTER_PK.startsWith("0x") || PAYMASTER_PK.length !== 66) {
    console.error("❌ Invalid private key format");
    console.log("   Expected: 66 characters starting with 0x");
    console.log(`   Got: ${PAYMASTER_PK.length} characters`);
    process.exit(1);
  }

  console.log("✅ Private key format is valid");

  // Create wallet
  let wallet;
  try {
    const provider = new ethers.JsonRpcProvider(SAPPHIRE_TESTNET_RPC);
    wallet = new ethers.Wallet(PAYMASTER_PK, provider);
    console.log("✅ Wallet created successfully");
  } catch (error) {
    console.error("❌ Failed to create wallet:", error.message);
    process.exit(1);
  }

  // Get wallet info
  const address = wallet.address;
  console.log(`\n📋 Paymaster Wallet Info:`);
  console.log(`   Address: ${address}`);
  console.log(`   Network: Sapphire Testnet`);

  // Check balance
  try {
    const provider = new ethers.JsonRpcProvider(SAPPHIRE_TESTNET_RPC);
    const balance = await provider.getBalance(address);
    const balanceInRose = ethers.formatEther(balance);
    
    console.log(`   Balance: ${balanceInRose} ROSE`);
    
    if (balance === 0n) {
      console.log("\n⚠️  Wallet has no ROSE tokens!");
      console.log("   To fund the wallet:");
      console.log(`   1. Visit: https://faucet.sapphire.oasis.dev/`);
      console.log(`   2. Enter address: ${address}`);
      console.log(`   3. Request testnet tokens`);
    } else {
      console.log("\n✅ Wallet is funded and ready to use!");
    }
  } catch (error) {
    console.error("❌ Failed to check balance:", error.message);
    console.log("   This might be a network issue. Wallet is still valid.");
  }

  // Test network connection
  try {
    const provider = new ethers.JsonRpcProvider(SAPPHIRE_TESTNET_RPC);
    const network = await provider.getNetwork();
    console.log(`\n🌐 Network Connection:`);
    console.log(`   Chain ID: ${network.chainId}`);
    console.log(`   Name: ${network.name}`);
    console.log("✅ Connected to Sapphire Testnet");
  } catch (error) {
    console.error("❌ Failed to connect to network:", error.message);
  }

  console.log("\n✨ Paymaster setup complete!");
  console.log("\n📝 Next steps:");
  console.log("   1. Fund the wallet with ROSE tokens (if not already done)");
  console.log("   2. Restart your dev server");
  console.log("   3. Test meta address registration in the app");
}

testPaymaster().catch(console.error);

