/**
 * Standalone script to deploy AxelarStealthBridge to Base Sepolia
 * Run with: node scripts/deploy-base-sepolia-standalone.js
 */

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Axelar contracts for Base Sepolia
const GATEWAY_ADDRESS = "0xe432150cce91c13a887f7D836923d5597adD8E31";
const GAS_SERVICE_ADDRESS = "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6";
const RPC_URL = "https://sepolia.base.org";

// Contract ABI (minimal for deployment)
const BRIDGE_ABI = [
  "constructor(address gateway_, address gasService_, address initialOwner)",
  "function setTrustedRemote(string calldata chainName, string calldata address_) external"
];

async function main() {
  console.log("\n🚀 Deploying AxelarStealthBridge to Base Sepolia...\n");
  
  // Check private key
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in environment variables");
  }
  
  // Setup provider and wallet
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  
  console.log(`Deployer: ${wallet.address}`);
  
  // Check balance
  const balance = await provider.getBalance(wallet.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);
  
  if (balance < ethers.parseEther("0.001")) {
    throw new Error("Insufficient ETH balance. Need at least 0.001 ETH for deployment");
  }
  
  // Load existing deployments
  const deploymentsPath = path.join(__dirname, "../deployments/axelar-bridge.json");
  let deployments = {};
  try {
    deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  } catch (e) {
    console.log("No existing deployments found");
  }
  
  // Check if already deployed
  if (deployments["base-sepolia"]?.contractAddress) {
    console.log(`✅ Bridge already deployed at: ${deployments["base-sepolia"].contractAddress}`);
    return;
  }
  
  // Deploy contract
  console.log("📦 Deploying AxelarStealthBridge...");
  
  const factory = new ethers.ContractFactory(BRIDGE_ABI, [], wallet);
  const deployTx = await factory.deploy(
    GATEWAY_ADDRESS,
    GAS_SERVICE_ADDRESS,
    wallet.address
  );
  
  console.log(`Transaction hash: ${deployTx.deploymentTransaction().hash}`);
  console.log("Waiting for deployment confirmation...");
  
  const contract = await deployTx.waitForDeployment();
  const contractAddress = await contract.getAddress();
  
  console.log(`✅ Deployed to: ${contractAddress}\n`);
  
  // Save deployment
  deployments["base-sepolia"] = {
    network: "base-sepolia",
    chainId: "84532",
    axelarChainName: "base-sepolia",
    contractAddress: contractAddress,
    gateway: GATEWAY_ADDRESS,
    gasService: GAS_SERVICE_ADDRESS,
    deployer: wallet.address,
    timestamp: new Date().toISOString(),
    txHash: deployTx.deploymentTransaction().hash
  };
  
  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log("💾 Deployment saved to deployments/axelar-bridge.json\n");
  
  console.log("📋 Next steps:");
  console.log("1. Run this script on Ethereum Sepolia to set trusted remote:");
  console.log("   node scripts/set-trusted-remote.js --network ethereum-sepolia --target base-sepolia");
  console.log("2. Test TUSDC stealth transfers between Ethereum and Base Sepolia!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Error:", error.message);
    process.exit(1);
  });
