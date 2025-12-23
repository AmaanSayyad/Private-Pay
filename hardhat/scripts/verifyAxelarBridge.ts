import { network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import { run } from "hardhat";

/**
 * Script to verify deployed AxelarStealthBridge contracts on Etherscan/Basescan
 * Run this after deploying contracts
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
  console.log(`\n🔍 Verifying AxelarStealthBridge on ${networkName}...\n`);

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

  console.log(`Contract address: ${currentDeployment.contractAddress}`);
  console.log(`Gateway: ${currentDeployment.gateway}`);
  console.log(`Gas Service: ${currentDeployment.gasService}`);
  console.log(`ITS: 0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C`);
  console.log(`Owner: ${currentDeployment.deployer}\n`);

  try {
    await run("verify:verify", {
      address: currentDeployment.contractAddress,
      constructorArguments: [
        currentDeployment.gateway,
        currentDeployment.gasService,
        "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C", // ITS Address
        currentDeployment.deployer, // Owner
      ],
    });
    console.log("✅ Contract verified successfully!");
  } catch (error: any) {
    if (error.message?.includes("Already Verified")) {
      console.log("✅ Contract already verified");
    } else {
      console.error("❌ Verification failed:", error.message);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  });

