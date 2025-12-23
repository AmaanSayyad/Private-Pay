import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Axelar Gateway and Gas Service addresses for testnets
 * Reference: https://docs.axelar.dev/resources/contract-addresses/testnet/
 */
const AXELAR_CONTRACTS: Record<string, { gateway: string; gasService: string }> = {
  "ethereum-sepolia": {
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
  },
  "polygon-amoy": {
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
  },
  "polygon-sepolia": {
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
  },
  "avalanche-fuji": {
    gateway: "0xC249632c2D40b9001FE907806902f63038B737Ab",
    gasService: "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
  },
  "arbitrum-sepolia": {
    gateway: "0xe1cE95479C84e9809269227C7F8524aE051Ae77a", // ✅ Correct Arbitrum Sepolia gateway
    gasService: "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
  },
  "optimism-sepolia": {
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
  },
  "base-sepolia": {
    gateway: "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
  },
  "bnb-testnet": {
    gateway: "0x4D147dCb984e6affEEC47e44293DA442580A3Ec0",
    gasService: "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
  },
  "sapphire-testnet": {
    gateway: "0x9B36f165baB9ebe611d491180418d8De4b8f3a1f",
    gasService: "0x2d5d7d31F671F86C782533cc367F14109a082712",
  },
};

/**
 * Chain names used by Axelar for cross-chain communication
 * These must match the "axelarId" field from:
 * https://github.com/axelarnetwork/axelar-contract-deployments/blob/main/axelar-chains-config/info/testnet.json
 * 
 * NOTE: Some chains use capitalized names (Avalanche, Fantom) while others use lowercase with suffix
 */
const AXELAR_CHAIN_NAMES: Record<string, string> = {
  "ethereum-sepolia": "ethereum-sepolia",
  "polygon-amoy": "polygon-sepolia", // Axelar uses "polygon-sepolia" not "polygon-amoy"
  "polygon-sepolia": "polygon-sepolia",
  "avalanche-fuji": "Avalanche", // Capitalized per Axelar config
  "arbitrum-sepolia": "arbitrum-sepolia",
  "optimism-sepolia": "optimism-sepolia",
  "base-sepolia": "base-sepolia",
  "bnb-testnet": "binance",
  "sapphire-testnet": "oasis",
};

interface DeploymentInfo {
  network: string;
  chainId: number;
  axelarChainName: string;
  contractAddress: string;
  gateway: string;
  gasService: string;
  deployer: string;
  timestamp: string;
  txHash: string;
}

async function main() {
  const networkName = network.name;
  console.log(`\n🚀 Deploying AxelarStealthBridge to ${networkName}...\n`);

  // Get Axelar contracts for this network
  const axelarContracts = AXELAR_CONTRACTS[networkName];
  if (!axelarContracts) {
    throw new Error(`Axelar contracts not configured for network: ${networkName}`);
  }

  const axelarChainName = AXELAR_CHAIN_NAMES[networkName];
  if (!axelarChainName) {
    throw new Error(`Axelar chain name not configured for network: ${networkName}`);
  }

  console.log(`Gateway: ${axelarContracts.gateway}`);
  console.log(`Gas Service: ${axelarContracts.gasService}`);
  console.log(`Axelar Chain Name: ${axelarChainName}\n`);

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error("Deployer has no balance. Please fund the account first.");
  }

  // Deploy AxelarStealthBridge
  console.log("Deploying AxelarStealthBridge...");
  const AxelarStealthBridge = await ethers.getContractFactory("AxelarStealthBridge");
  
  const bridge = await AxelarStealthBridge.deploy(
    axelarContracts.gateway,
    axelarContracts.gasService,
    "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C", // ITS Address (same on all chains)
    deployer.address // initial owner
  );

  await bridge.waitForDeployment();
  const bridgeAddress = await bridge.getAddress();
  const deployTx = bridge.deploymentTransaction();

  console.log(`\n✅ AxelarStealthBridge deployed to: ${bridgeAddress}`);
  console.log(`Transaction hash: ${deployTx?.hash}\n`);

  // Save deployment info
  const deploymentInfo: DeploymentInfo = {
    network: networkName,
    chainId: Number((await ethers.provider.getNetwork()).chainId),
    axelarChainName: axelarChainName,
    contractAddress: bridgeAddress,
    gateway: axelarContracts.gateway,
    gasService: axelarContracts.gasService,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    txHash: deployTx?.hash || "",
  };

  // Load existing deployments or create new file
  const deploymentsPath = path.join(__dirname, "../deployments/axelar-bridge.json");
  let deployments: Record<string, DeploymentInfo> = {};
  
  try {
    if (fs.existsSync(deploymentsPath)) {
      deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
    }
  } catch (e) {
    console.log("Creating new deployments file...");
  }

  deployments[networkName] = deploymentInfo;

  // Ensure deployments directory exists
  const deploymentsDir = path.dirname(deploymentsPath);
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  fs.writeFileSync(deploymentsPath, JSON.stringify(deployments, null, 2));
  console.log(`📝 Deployment info saved to ${deploymentsPath}`);

  // Print next steps
  console.log("\n" + "=".repeat(60));
  console.log("📋 NEXT STEPS:");
  console.log("=".repeat(60));
  console.log("\n1. Deploy to other chains using:");
  console.log("   npx hardhat run scripts/deployAxelarBridge.ts --network <network>");
  console.log("\n2. After deploying to all chains, set trusted remotes:");
  console.log("   npx hardhat run scripts/setTrustedRemotes.ts --network <network>");
  console.log("\n3. Update frontend .env with contract address:");
  console.log(`   VITE_AXELAR_BRIDGE_ADDRESS=${bridgeAddress}`);
  console.log("\n" + "=".repeat(60) + "\n");

  return deploymentInfo;
}

main()
  .then((info) => {
    console.log("Deployment complete:", info.contractAddress);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
