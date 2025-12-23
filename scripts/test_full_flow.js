/**
 * Test full cross-chain flow on Arbitrum Sepolia
 */
import { ethers } from "ethers";
import { readFileSync } from "fs";

// Read .env manually
const envContent = readFileSync(".env", "utf-8");
const envVars = {};
envContent.split("\n").forEach((line) => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join("=").trim();
  }
});

const ARBITRUM_SEPOLIA_RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const TUSDC_ADDRESS = "0xd17beb0fE91B2aE5a57cE39D1c3D15AF1a968817";
const BRIDGE_ADDRESS = "0x5FC2646D45355EC01B8F56fD2284FD4A7e616357";
const BASE_TUSDC_ADDRESS = "0x2823Af7e1F2F50703eD9f81Ac4B23DC1E78B9E53";
const TEST_WALLET = "0xcc78505fe8707a1d85229ba0e7177ae26ce0f17d";

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
];

const BRIDGE_ABI = [
  "function sendCrossChainStealthPaymentCustomToken(string destinationChain, address stealthAddress, bytes ephemeralPubKey, bytes1 viewHint, uint32 k, address sourceTokenAddress, address destinationTokenAddress, uint256 amount) external payable",
  "function gateway() external view returns (address)",
  "function gasService() external view returns (address)",
];

async function main() {
  console.log("=== Testing Full Cross-Chain Flow ===\n");

  const provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC);
  const token = new ethers.Contract(TUSDC_ADDRESS, ERC20_ABI, provider);
  const bridge = new ethers.Contract(BRIDGE_ADDRESS, BRIDGE_ABI, provider);

  const decimals = await token.decimals();
  const amount = ethers.parseUnits("1", decimals);

  console.log("1. Checking user's token balance...");
  const balance = await token.balanceOf(TEST_WALLET);
  console.log(`   Balance: ${ethers.formatUnits(balance, decimals)} TUSDC`);

  console.log("\n2. Checking user's ETH balance...");
  const ethBalance = await provider.getBalance(TEST_WALLET);
  console.log(`   ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

  console.log("\n3. Checking allowance to bridge...");
  const allowance = await token.allowance(TEST_WALLET, BRIDGE_ADDRESS);
  console.log(`   Allowance: ${ethers.formatUnits(allowance, decimals)} TUSDC`);

  if (allowance < amount) {
    console.log("   ❌ Insufficient allowance! User needs to approve first.");
  } else {
    console.log("   ✅ Sufficient allowance");
  }

  console.log("\n4. Checking bridge contract...");
  const gateway = await bridge.gateway();
  console.log(`   Gateway: ${gateway}`);

  try {
    const gasService = await bridge.gasService();
    console.log(`   Gas Service: ${gasService}`);
  } catch {
    console.log("   Gas Service: Not available");
  }

  console.log("\n5. Simulating transferFrom (bridge pulling tokens)...");
  try {
    // Simulate bridge calling transferFrom
    const result = await token.transferFrom.staticCall(
      TEST_WALLET,
      BRIDGE_ADDRESS,
      amount,
      { from: BRIDGE_ADDRESS }
    );
    console.log(`   ✅ transferFrom would succeed: ${result}`);
  } catch (error) {
    console.log(`   ❌ transferFrom would fail: ${error.message}`);
  }

  console.log("\n6. Simulating full bridge call...");
  const testParams = {
    destinationChain: "base-sepolia",
    stealthAddress: "0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123",
    ephemeralPubKey: "0x" + "00".repeat(33),
    viewHint: "0x00",
    k: 0,
    sourceTokenAddress: TUSDC_ADDRESS,
    destinationTokenAddress: BASE_TUSDC_ADDRESS,
    amount: amount,
  };

  try {
    const iface = new ethers.Interface(BRIDGE_ABI);
    const data = iface.encodeFunctionData(
      "sendCrossChainStealthPaymentCustomToken",
      [
        testParams.destinationChain,
        testParams.stealthAddress,
        testParams.ephemeralPubKey,
        testParams.viewHint,
        testParams.k,
        testParams.sourceTokenAddress,
        testParams.destinationTokenAddress,
        testParams.amount,
      ]
    );

    // Estimate gas
    const gasEstimate = await provider.estimateGas({
      to: BRIDGE_ADDRESS,
      data: data,
      value: ethers.parseEther("0.001"),
      from: TEST_WALLET,
    });

    console.log(`   ✅ Gas estimate: ${gasEstimate.toString()}`);
  } catch (error) {
    console.log(`   ❌ Simulation failed: ${error.message}`);

    // Try to decode the error
    if (error.data) {
      console.log(`   Error data: ${error.data}`);
    }
  }

  console.log("\n7. Checking if bridge has the custom token function...");
  const bridgeCode = await provider.getCode(BRIDGE_ADDRESS);
  const selector = "0xa7ae31d3"; // sendCrossChainStealthPaymentCustomToken
  const hasFunction = bridgeCode.toLowerCase().includes(selector.slice(2));
  console.log(`   Function exists: ${hasFunction ? "✅ Yes" : "❌ No"}`);
}

main().catch(console.error);
