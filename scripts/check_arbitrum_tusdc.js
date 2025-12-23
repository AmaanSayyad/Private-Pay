/**
 * Script to verify TUSDC token on Arbitrum Sepolia
 */
import { ethers } from "ethers";

const ARBITRUM_SEPOLIA_RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const TUSDC_ADDRESS = "0xd17beb0fE91B2aE5a57cE39D1c3D15AF1a968817";
const BRIDGE_ADDRESS = "0x5FC2646D45355EC01B8F56fD2284FD4A7e616357";
const TEST_WALLET = "0xcc78505fe8707a1d85229ba0e7177ae26ce0f17d"; // From error log

const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

async function main() {
  console.log("=== Checking Arbitrum Sepolia TUSDC ===\n");
  
  const provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC);
  
  // 1. Check if token contract exists
  console.log("1. Checking token contract at:", TUSDC_ADDRESS);
  const tokenCode = await provider.getCode(TUSDC_ADDRESS);
  if (tokenCode === "0x" || tokenCode === "0x0") {
    console.log("❌ TOKEN CONTRACT DOES NOT EXIST!");
    console.log("   This is the root cause of the error.");
    return;
  }
  console.log("✅ Token contract exists (bytecode length:", tokenCode.length, ")\n");
  
  // 2. Check if bridge contract exists
  console.log("2. Checking bridge contract at:", BRIDGE_ADDRESS);
  const bridgeCode = await provider.getCode(BRIDGE_ADDRESS);
  if (bridgeCode === "0x" || bridgeCode === "0x0") {
    console.log("❌ BRIDGE CONTRACT DOES NOT EXIST!");
    return;
  }
  console.log("✅ Bridge contract exists (bytecode length:", bridgeCode.length, ")\n");
  
  // 3. Try to read token info
  console.log("3. Reading token info...");
  try {
    const token = new ethers.Contract(TUSDC_ADDRESS, ERC20_ABI, provider);
    
    const [name, symbol, decimals, totalSupply] = await Promise.all([
      token.name().catch(() => "N/A"),
      token.symbol().catch(() => "N/A"),
      token.decimals().catch(() => "N/A"),
      token.totalSupply().catch(() => "N/A"),
    ]);
    
    console.log("   Name:", name);
    console.log("   Symbol:", symbol);
    console.log("   Decimals:", decimals.toString());
    console.log("   Total Supply:", totalSupply.toString());
    console.log("");
    
    // 4. Check test wallet balance
    console.log("4. Checking test wallet balance...");
    const balance = await token.balanceOf(TEST_WALLET);
    console.log("   Wallet:", TEST_WALLET);
    console.log("   TUSDC Balance:", ethers.formatUnits(balance, decimals), symbol);
    
    // 5. Check ETH balance
    const ethBalance = await provider.getBalance(TEST_WALLET);
    console.log("   ETH Balance:", ethers.formatEther(ethBalance), "ETH\n");
    
    // 6. Check current allowance
    console.log("5. Checking current allowance to bridge...");
    const allowance = await token.allowance(TEST_WALLET, BRIDGE_ADDRESS);
    console.log("   Current allowance:", ethers.formatUnits(allowance, decimals), symbol);
    
  } catch (error) {
    console.log("❌ Error reading token:", error.message);
  }
}

main().catch(console.error);
