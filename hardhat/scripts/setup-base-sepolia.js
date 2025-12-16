/**
 * Deploy AxelarStealthBridge to Base Sepolia and set up trusted remotes
 * 
 * Run: npx hardhat run scripts/setup-base-sepolia.js --network base-sepolia
 * Then: npx hardhat run scripts/setup-base-sepolia.js --network ethereum-sepolia
 */

const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

const DEPLOYMENTS_FILE = path.join(__dirname, "../deployments/axelar-bridge.json");

// Axelar contract addresses
const AXELAR_CONTRACTS = {
  "base-sepolia": {
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    axelarName: "base-sepolia",
  },
  "ethereum-sepolia": {
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    axelarName: "ethereum-sepolia",
  },
};

async function main() {
  const networkName = network.name;
  console.log(`\n🔧 Setting up AxelarStealthBridge on ${networkName}\n`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  // Load existing deployments
  let deployments = {};
  try {
    deployments = JSON.parse(fs.readFileSync(DEPLOYMENTS_FILE, "utf8"));
  } catch (e) {
    console.log("No existing deployments found, starting fresh");
  }

  const axelarConfig = AXELAR_CONTRACTS[networkName];
  if (!axelarConfig) {
    throw new Error(`Network ${networkName} not configured`);
  }

  let bridgeAddress;
  
  // Check if already deployed on this network
  if (deployments[networkName]?.contractAddress) {
    bridgeAddress = deployments[networkName].contractAddress;
    console.log(`✅ Bridge already deployed at: ${bridgeAddress}`);
  } else {
    // Deploy new bridge
    console.log("📦 Deploying AxelarStealthBridge...");
    
    const Bridge = await ethers.getContractFactory("AxelarStealthBridge");
    const bridge = await Bridge.deploy(
      axelarConfig.gateway,
      axelarConfig.gasService,
      deployer.address
    );
    await bridge.waitForDeployment();
    
    bridgeAddress = await bridge.getAddress();
    console.log(`✅ Deployed to: ${bridgeAddress}`);

    // Save deployment
    deployments[networkName] = {
      network: networkName,
      chainId: (await ethers.provider.getNetwork()).chainId.toString(),
      axelarChainName: axelarConfig.axelarName,
      contractAddress: bridgeAddress,
      gateway: axelarConfig.gateway,
      gasService: axelarConfig.gasService,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
    };
    
    fs.writeFileSync(DEPLOYMENTS_FILE, JSON.stringify(deployments, null, 2));
    console.log("💾 Deployment saved\n");
  }

  // Set up trusted remotes
  console.log("🔗 Setting up trusted remotes...\n");
  
  const bridge = await ethers.getContractAt("AxelarStealthBridge", bridgeAddress);

  // For each other deployed chain, set up trusted remote
  for (const [chainKey, deployment] of Object.entries(deployments)) {
    if (chainKey === networkName) continue;
    
    const remoteAxelarName = deployment.axelarChainName;
    const remoteAddress = deployment.contractAddress;
    
    // Check if already set
    const currentRemote = await bridge.trustedRemotes(remoteAxelarName);
    
    if (currentRemote.toLowerCase() === remoteAddress.toLowerCase()) {
      console.log(`  ✅ ${remoteAxelarName}: Already configured`);
    } else {
      console.log(`  📝 Setting ${remoteAxelarName} -> ${remoteAddress}`);
      const tx = await bridge.setTrustedRemote(remoteAxelarName, remoteAddress);
      await tx.wait();
      console.log(`  ✅ ${remoteAxelarName}: Set successfully`);
    }
  }

  console.log("\n✅ Setup complete!\n");
  
  // Show summary
  console.log("📋 Deployment Summary:");
  console.log("=".repeat(50));
  for (const [chainKey, deployment] of Object.entries(deployments)) {
    console.log(`  ${chainKey}: ${deployment.contractAddress}`);
  }
  console.log("=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
