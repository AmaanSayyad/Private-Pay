/**
 * Test direct approval on Arbitrum Sepolia using private key
 * This bypasses MetaMask to see if the issue is with MetaMask's RPC
 */
import { ethers } from "ethers";
import { readFileSync } from "fs";

// Read .env manually
const envContent = readFileSync(".env", "utf-8");
const envVars = {};
envContent.split("\n").forEach(line => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join("=").trim();
  }
});

const ARBITRUM_SEPOLIA_RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const TUSDC_ADDRESS = "0xd17beb0fE91B2aE5a57cE39D1c3D15AF1a968817";
const BRIDGE_ADDRESS = "0x5FC2646D45355EC01B8F56fD2284FD4A7e616357";

// Use deployer private key for testing
const PRIVATE_KEY = envVars.VITE_DEPLOYER_PRIVATE_KEY;

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
];

async function main() {
  if (!PRIVATE_KEY) {
    console.log("❌ VITE_DEPLOYER_PRIVATE_KEY not set in .env");
    return;
  }
  
  console.log("=== Testing Direct Approval on Arbitrum Sepolia ===\n");
  
  const provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  console.log("Wallet address:", wallet.address);
  
  const token = new ethers.Contract(TUSDC_ADDRESS, ERC20_ABI, wallet);
  const decimals = await token.decimals();
  
  // Check balance
  const balance = await token.balanceOf(wallet.address);
  console.log("TUSDC Balance:", ethers.formatUnits(balance, decimals));
  
  const ethBalance = await provider.getBalance(wallet.address);
  console.log("ETH Balance:", ethers.formatEther(ethBalance));
  
  // Check current allowance
  const currentAllowance = await token.allowance(wallet.address, BRIDGE_ADDRESS);
  console.log("Current allowance:", ethers.formatUnits(currentAllowance, decimals));
  
  if (balance === 0n) {
    console.log("\n❌ No TUSDC balance to test with");
    return;
  }
  
  // Try to approve
  const amount = ethers.parseUnits("1", decimals); // 1 TUSDC
  
  console.log("\nAttempting approval of", ethers.formatUnits(amount, decimals), "TUSDC...");
  
  try {
    // Estimate gas first
    const gasEstimate = await token.approve.estimateGas(BRIDGE_ADDRESS, amount);
    console.log("Gas estimate:", gasEstimate.toString());
    
    // Send transaction
    const tx = await token.approve(BRIDGE_ADDRESS, amount, {
      gasLimit: gasEstimate * 2n, // 2x buffer
    });
    
    console.log("Transaction hash:", tx.hash);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);
    
    // Check new allowance
    const newAllowance = await token.allowance(wallet.address, BRIDGE_ADDRESS);
    console.log("New allowance:", ethers.formatUnits(newAllowance, decimals));
    
  } catch (error) {
    console.log("❌ Transaction failed:", error.message);
    if (error.data) {
      console.log("Error data:", error.data);
    }
  }
}

main().catch(console.error);
