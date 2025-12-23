/**
 * Check Bridge contract on Arbitrum Sepolia
 */
import { ethers } from "ethers";

const ARBITRUM_SEPOLIA_RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const BRIDGE_ADDRESS = "0x5FC2646D45355EC01B8F56fD2284FD4A7e616357";

// Bridge ABI - check what functions exist
const BRIDGE_ABI = [
  "function sendCrossChainStealthPayment(string destinationChain, address stealthAddress, bytes ephemeralPubKey, bytes1 viewHint, uint32 k, string symbol, uint256 amount) external payable",
  "function sendCrossChainStealthPaymentITS(string destinationChain, address stealthAddress, bytes ephemeralPubKey, bytes1 viewHint, uint32 k, bytes32 tokenId, uint256 amount) external payable",
  "function sendCrossChainStealthPaymentCustomToken(string destinationChain, address stealthAddress, bytes ephemeralPubKey, bytes1 viewHint, uint32 k, address sourceTokenAddress, address destinationTokenAddress, uint256 amount) external payable",
  "function gateway() external view returns (address)",
];

async function main() {
  console.log("=== Checking Bridge Contract on Arbitrum Sepolia ===\n");
  
  const provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC);
  
  // Check if bridge exists
  const code = await provider.getCode(BRIDGE_ADDRESS);
  console.log("Bridge contract exists:", code !== "0x" && code !== "0x0");
  console.log("Bytecode length:", code.length);
  
  // Try to call gateway() to verify contract is working
  const bridge = new ethers.Contract(BRIDGE_ADDRESS, BRIDGE_ABI, provider);
  
  try {
    const gateway = await bridge.gateway();
    console.log("Gateway address:", gateway);
  } catch (error) {
    console.log("Error calling gateway():", error.message);
  }
  
  // Check function selectors in bytecode
  console.log("\nChecking function selectors...");
  
  const selectors = {
    "sendCrossChainStealthPayment": "0x" + ethers.id("sendCrossChainStealthPayment(string,address,bytes,bytes1,uint32,string,uint256)").slice(2, 10),
    "sendCrossChainStealthPaymentITS": "0x" + ethers.id("sendCrossChainStealthPaymentITS(string,address,bytes,bytes1,uint32,bytes32,uint256)").slice(2, 10),
    "sendCrossChainStealthPaymentCustomToken": "0x" + ethers.id("sendCrossChainStealthPaymentCustomToken(string,address,bytes,bytes1,uint32,address,address,uint256)").slice(2, 10),
  };
  
  for (const [name, selector] of Object.entries(selectors)) {
    const exists = code.toLowerCase().includes(selector.slice(2).toLowerCase());
    console.log(`${name}: ${selector} - ${exists ? "✅ Found" : "❌ Not found"}`);
  }
  
  // Try to simulate the call
  console.log("\nSimulating sendCrossChainStealthPaymentCustomToken...");
  
  const testParams = {
    destinationChain: "base-sepolia",
    stealthAddress: "0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123",
    ephemeralPubKey: "0x" + "00".repeat(33),
    viewHint: "0x00",
    k: 0,
    sourceTokenAddress: "0xd17beb0fE91B2aE5a57cE39D1c3D15AF1a968817",
    destinationTokenAddress: "0x2823Af7e1F2F50703eD9f81Ac4B23DC1E78B9E53",
    amount: ethers.parseUnits("1", 6),
  };
  
  try {
    const iface = new ethers.Interface(BRIDGE_ABI);
    const data = iface.encodeFunctionData("sendCrossChainStealthPaymentCustomToken", [
      testParams.destinationChain,
      testParams.stealthAddress,
      testParams.ephemeralPubKey,
      testParams.viewHint,
      testParams.k,
      testParams.sourceTokenAddress,
      testParams.destinationTokenAddress,
      testParams.amount,
    ]);
    
    console.log("Encoded data:", data.slice(0, 100) + "...");
    console.log("Function selector:", data.slice(0, 10));
    
    // Try eth_call
    const result = await provider.call({
      to: BRIDGE_ADDRESS,
      data: data,
      value: ethers.parseEther("0.001"),
      from: "0xcc78505fe8707a1d85229ba0e7177ae26ce0f17d",
    });
    
    console.log("Simulation result:", result);
  } catch (error) {
    console.log("Simulation error:", error.message);
    if (error.data) {
      console.log("Error data:", error.data);
    }
  }
}

main().catch(console.error);
