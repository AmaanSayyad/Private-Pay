/**
 * Standalone Test Script for Axelar Stealth Payment
 * Doesn't require hardhat compilation - uses ethers directly
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// RPC endpoints
const RPC_URLS = {
  "ethereum-sepolia": "https://ethereum-sepolia-rpc.publicnode.com",
  "polygon-amoy": "https://rpc-amoy.polygon.technology",
};

// aUSDC addresses on testnets
const AUSDC_ADDRESSES = {
  "ethereum-sepolia": "0x254d06f33bDc5b8ee05b2ea472107E300226659A",
  "polygon-amoy": "0x254d06f33bDc5b8ee05b2ea472107E300226659A",
};

// ABIs
const ERC20_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function approve(address, uint256) returns (bool)",
  "function allowance(address, address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const BRIDGE_ABI = [
  "function sendCrossChainStealthPayment(string destinationChain, bytes32 stealthAddress, bytes ephemeralPubKey, uint8 viewTag, string tokenSymbol, uint256 amount) payable",
  "function trustedRemotes(string) view returns (address)",
];

async function main() {
  const network = process.argv[2] || "ethereum-sepolia";
  
  console.log("\n🔐 Axelar Stealth Payment Test (Standalone)\n");
  console.log("=".repeat(50));
  console.log(`📡 Network: ${network}`);

  // Setup provider and wallet
  const rpcUrl = RPC_URLS[network];
  if (!rpcUrl) {
    console.log(`❌ Unknown network: ${network}`);
    return;
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  
  if (!process.env.PRIVATE_KEY) {
    console.log("❌ PRIVATE_KEY not set in .env");
    return;
  }

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log(`👛 Wallet: ${wallet.address}`);

  // Check ETH balance
  const ethBalance = await provider.getBalance(wallet.address);
  console.log(`⛽ ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

  if (ethBalance === 0n) {
    console.log("\n❌ No ETH for gas! Get testnet ETH from:");
    console.log(`   Sepolia: https://sepoliafaucet.com/`);
    console.log(`   Polygon: https://faucet.polygon.technology/`);
    console.log(`\n   Your address: ${wallet.address}`);
    return;
  }

  // Load deployment
  const deploymentsPath = path.join(__dirname, "../deployments/axelar-bridge.json");
  let deployments;
  try {
    deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  } catch (e) {
    console.log("❌ No deployments found");
    return;
  }

  const deployment = deployments[network];
  if (!deployment) {
    console.log(`❌ No deployment for ${network}`);
    return;
  }

  console.log(`📜 Bridge: ${deployment.contractAddress}`);

  // Check aUSDC balance
  const ausdcAddress = AUSDC_ADDRESSES[network];
  const ausdc = new ethers.Contract(ausdcAddress, ERC20_ABI, wallet);
  
  const balance = await ausdc.balanceOf(wallet.address);
  const decimals = await ausdc.decimals();
  const symbol = await ausdc.symbol();
  
  console.log(`💵 ${symbol} Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);

  if (balance === 0n) {
    console.log("\n❌ No aUSDC tokens!");
    console.log("\n📋 How to get aUSDC:");
    console.log("   1. Join Axelar Discord: https://discord.gg/axelarnetwork");
    console.log("   2. Go to #faucet channel");
    console.log(`   3. Type: !faucet ${wallet.address}`);
    console.log("   4. Bridge via: https://testnet.satellite.money/");
    return;
  }

  // Connect to bridge
  const bridge = new ethers.Contract(deployment.contractAddress, BRIDGE_ABI, wallet);

  // Check trusted remote
  const destChain = network === "ethereum-sepolia" ? "Polygon" : "ethereum-sepolia";
  const trustedRemote = await bridge.trustedRemotes(destChain);
  console.log(`🔗 Trusted Remote (${destChain}): ${trustedRemote}`);

  if (trustedRemote === ethers.ZeroAddress) {
    console.log("\n⚠️  Trusted remote not configured!");
    return;
  }

  // Generate stealth address (demo)
  console.log("\n🎭 Generating Stealth Address...");
  const stealthAddress = ethers.keccak256(ethers.randomBytes(32));
  const ephemeralPubKey = ethers.hexlify(ethers.randomBytes(33));
  const viewTag = 0x01;
  const amount = ethers.parseUnits("1", decimals);

  console.log(`   Stealth: ${stealthAddress.slice(0, 20)}...`);
  console.log(`   Amount: 1 ${symbol}`);
  console.log(`   To: ${destChain}`);

  // Approve tokens
  console.log("\n📝 Approving tokens...");
  const allowance = await ausdc.allowance(wallet.address, deployment.contractAddress);
  if (allowance < amount) {
    const tx = await ausdc.approve(deployment.contractAddress, ethers.MaxUint256);
    await tx.wait();
    console.log(`   ✅ Approved: ${tx.hash}`);
  } else {
    console.log("   ✅ Already approved");
  }

  // Send payment
  console.log("\n🚀 Sending Cross-Chain Stealth Payment...");
  const gasValue = ethers.parseEther("0.01");

  try {
    const tx = await bridge.sendCrossChainStealthPayment(
      destChain,
      stealthAddress,
      ephemeralPubKey,
      viewTag,
      symbol,
      amount,
      { value: gasValue }
    );

    console.log(`   📨 TX: ${tx.hash}`);
    console.log("   ⏳ Waiting...");

    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed: Block ${receipt.blockNumber}`);

    console.log("\n🔍 Track on Axelarscan:");
    console.log(`   https://testnet.axelarscan.io/gmp/${tx.hash}`);

    console.log("\n✅ Payment sent! Will arrive in ~2-5 minutes.");

  } catch (error) {
    console.log(`\n❌ Failed: ${error.message}`);
    if (error.data) {
      console.log(`   Data: ${error.data}`);
    }
  }
}

main().catch(console.error);
