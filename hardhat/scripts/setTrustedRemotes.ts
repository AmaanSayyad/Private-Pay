import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

/**
 * Script to set trusted remotes on AxelarStealthBridge
 * Run this after deploying to all chains
 */

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
  console.log(`\n🔗 Setting trusted remotes on ${networkName}...\n`);

  // Load deployments
  const deploymentsPath = path.join(__dirname, "../deployments/axelar-bridge.json");
  
  if (!fs.existsSync(deploymentsPath)) {
    throw new Error("Deployments file not found. Deploy contracts first.");
  }

  const deployments: Record<string, DeploymentInfo> = JSON.parse(
    fs.readFileSync(deploymentsPath, "utf8")
  );

  // Get current network deployment
  const currentDeployment = deployments[networkName];
  if (!currentDeployment) {
    throw new Error(`No deployment found for network: ${networkName}`);
  }

  console.log(`Current contract: ${currentDeployment.contractAddress}`);
  console.log(`Axelar chain name: ${currentDeployment.axelarChainName}\n`);

  // Get contract instance
  const [deployer] = await ethers.getSigners();
  const bridge = await ethers.getContractAt(
    "AxelarStealthBridge",
    currentDeployment.contractAddress,
    deployer
  );

  // Set trusted remotes for all other deployed chains
  const chainNames: string[] = [];
  const contractAddresses: string[] = [];

  for (const [chainNetwork, deployment] of Object.entries(deployments)) {
    if (chainNetwork === networkName) continue; // Skip current network

    console.log(`Adding trusted remote for ${deployment.axelarChainName}:`);
    console.log(`  Contract: ${deployment.contractAddress}`);

    chainNames.push(deployment.axelarChainName);
    contractAddresses.push(deployment.contractAddress);
  }

  if (chainNames.length === 0) {
    console.log("No other chains deployed yet. Deploy to more chains first.");
    return;
  }

  console.log(`\nSetting ${chainNames.length} trusted remotes...`);

  // Set all trusted remotes in one transaction
  const tx = await bridge.setTrustedRemotes(chainNames, contractAddresses);
  console.log(`Transaction hash: ${tx.hash}`);
  
  await tx.wait();
  console.log("✅ Trusted remotes set successfully!\n");

  // Verify the settings
  console.log("Verifying trusted remotes:");
  for (let i = 0; i < chainNames.length; i++) {
    const storedAddress = await bridge.trustedRemotes(chainNames[i]);
    const isMatch = storedAddress.toLowerCase() === contractAddresses[i].toLowerCase();
    console.log(`  ${chainNames[i]}: ${isMatch ? "✅" : "❌"} ${storedAddress}`);
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 Cross-chain configuration complete!");
  console.log("=".repeat(60) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Failed to set trusted remotes:", error);
    process.exit(1);
  });
