/**
 * Test approval transaction simulation on Arbitrum Sepolia
 */
import { ethers } from "ethers";

const ARBITRUM_SEPOLIA_RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const TUSDC_ADDRESS = "0xd17beb0fE91B2aE5a57cE39D1c3D15AF1a968817";
const BRIDGE_ADDRESS = "0x5FC2646D45355EC01B8F56fD2284FD4A7e616357";
const TEST_WALLET = "0xcc78505fe8707a1d85229ba0e7177ae26ce0f17d";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

async function main() {
  console.log("=== Testing Approval on Arbitrum Sepolia ===\n");
  
  const provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC);
  const token = new ethers.Contract(TUSDC_ADDRESS, ERC20_ABI, provider);
  
  const decimals = await token.decimals();
  const amount = ethers.parseUnits("1", decimals); // 1 TUSDC
  
  console.log("Token:", TUSDC_ADDRESS);
  console.log("Spender (Bridge):", BRIDGE_ADDRESS);
  console.log("Amount:", ethers.formatUnits(amount, decimals), "TUSDC");
  console.log("");
  
  // Try to estimate gas for approval
  console.log("1. Estimating gas for approval...");
  try {
    // Create the approval call data
    const iface = new ethers.Interface(ERC20_ABI);
    const data = iface.encodeFunctionData("approve", [BRIDGE_ADDRESS, amount]);
    
    console.log("   Call data:", data);
    
    // Estimate gas using eth_estimateGas
    const gasEstimate = await provider.estimateGas({
      from: TEST_WALLET,
      to: TUSDC_ADDRESS,
      data: data,
    });
    
    console.log("✅ Gas estimate:", gasEstimate.toString());
  } catch (error) {
    console.log("❌ Gas estimation failed:", error.message);
    
    // Try to get more details
    if (error.data) {
      console.log("   Error data:", error.data);
    }
    if (error.reason) {
      console.log("   Reason:", error.reason);
    }
  }
  
  // Try eth_call to simulate
  console.log("\n2. Simulating approval with eth_call...");
  try {
    const iface = new ethers.Interface(ERC20_ABI);
    const data = iface.encodeFunctionData("approve", [BRIDGE_ADDRESS, amount]);
    
    const result = await provider.call({
      from: TEST_WALLET,
      to: TUSDC_ADDRESS,
      data: data,
    });
    
    console.log("✅ Simulation result:", result);
    const decoded = iface.decodeFunctionResult("approve", result);
    console.log("   Decoded:", decoded[0] ? "true (success)" : "false (failed)");
  } catch (error) {
    console.log("❌ Simulation failed:", error.message);
  }
  
  // Check if there's any issue with the token contract
  console.log("\n3. Checking token contract owner/paused state...");
  try {
    // Try common pausable/ownable functions
    const pausableABI = [
      "function paused() view returns (bool)",
      "function owner() view returns (address)",
    ];
    const pausableToken = new ethers.Contract(TUSDC_ADDRESS, pausableABI, provider);
    
    try {
      const paused = await pausableToken.paused();
      console.log("   Paused:", paused);
    } catch {
      console.log("   No paused() function");
    }
    
    try {
      const owner = await pausableToken.owner();
      console.log("   Owner:", owner);
    } catch {
      console.log("   No owner() function");
    }
  } catch (error) {
    console.log("   Error:", error.message);
  }
}

main().catch(console.error);
