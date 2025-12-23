import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import dotenv from 'dotenv';
dotenv.config();

/**
 * Script to pre-fund bridge contract with TUSDC on destination chain
 * This is required for custom token transfers (tokens not in gateway)
 * 
 * Usage:
 *   npx hardhat run scripts/prefundBridgeTUSDC.ts --network base-sepolia
 *   npx hardhat run scripts/prefundBridgeTUSDC.ts --network arbitrum-sepolia
 */

const TUSDC_ADDRESSES = {
  "base-sepolia": process.env.VITE_AXELAR_TUSDC_ADDRESS_BASE_SEPOLIA || "0x2823Af7e1F2F50703eD9f81Ac4B23DC1E78B9E53",
  "arbitrum-sepolia": process.env.VITE_AXELAR_TUSDC_ADDRESS_ARBITRUM_SEPOLIA || "0xd17beb0fE91B2aE5a57cE39D1c3D15AF1a968817",
};

async function main() {
  const networkName = network.name;
  console.log(`\n💰 Pre-funding bridge contract with TUSDC on ${networkName}...\n`);

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log(`Signer: ${signerAddress}`);

  // Get TUSDC address
  const tusdcAddress = TUSDC_ADDRESSES[networkName as keyof typeof TUSDC_ADDRESSES];
  if (!tusdcAddress) {
    throw new Error(`TUSDC address not configured for network: ${networkName}`);
  }
  console.log(`TUSDC Address: ${tusdcAddress}`);

  // Get bridge address from deployment file
  const deploymentsPath = path.join(__dirname, "../deployments/axelar-bridge.json");
  let bridgeAddress: string;
  
  if (fs.existsSync(deploymentsPath)) {
    const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
    const deployment = deployments[networkName];
    if (deployment && deployment.contractAddress) {
      bridgeAddress = deployment.contractAddress;
    } else {
      throw new Error(`Bridge deployment not found for network: ${networkName}`);
    }
  } else {
    // Fallback to env variable
    bridgeAddress = process.env[`VITE_AXELAR_BRIDGE_ADDRESS_${networkName.toUpperCase().replace("-", "_")}`] || "";
    if (!bridgeAddress) {
      throw new Error(`Bridge address not found. Deploy bridge contract first or set VITE_AXELAR_BRIDGE_ADDRESS_${networkName.toUpperCase().replace("-", "_")}`);
    }
  }
  console.log(`Bridge Address: ${bridgeAddress}`);

  const ERC20_ABI = [
    "function balanceOf(address account) external view returns (uint256)",
    "function decimals() external view returns (uint8)",
    "function symbol() external view returns (string)",
    "function transfer(address to, uint256 amount) external returns (bool)",
  ];

  const tusdc = new ethers.Contract(tusdcAddress, ERC20_ABI, signer);

  try {
    const symbol = await tusdc.symbol();
    const decimals = await tusdc.decimals();
    console.log(`Token: ${symbol}`);
    console.log(`Decimals: ${decimals}\n`);

    // Check signer balance
    const signerBalance = await tusdc.balanceOf(signerAddress);
    console.log(`Signer TUSDC balance: ${ethers.formatUnits(signerBalance, decimals)} ${symbol}`);

    // Check bridge balance
    const bridgeBalance = await tusdc.balanceOf(bridgeAddress);
    console.log(`Bridge TUSDC balance: ${ethers.formatUnits(bridgeBalance, decimals)} ${symbol}\n`);

    // Amount to transfer (10,000 TUSDC)
    const transferAmount = ethers.parseUnits("10000", decimals);
    
    if (signerBalance < transferAmount) {
      console.log(`❌ Insufficient balance. Need ${ethers.formatUnits(transferAmount, decimals)} ${symbol}, have ${ethers.formatUnits(signerBalance, decimals)} ${symbol}`);
      console.log(`\nPlease mint or transfer TUSDC to ${signerAddress} first.`);
      return;
    }

    // Transfer TUSDC to bridge
    console.log(`Transferring ${ethers.formatUnits(transferAmount, decimals)} ${symbol} to bridge...`);
    const tx = await tusdc.transfer(bridgeAddress, transferAmount);
    console.log(`Transaction hash: ${tx.hash}`);
    await tx.wait();
    console.log("✅ Transfer successful!");

    // Check new bridge balance (wait a bit for state to update)
    await new Promise(resolve => setTimeout(resolve, 2000));
    const newBridgeBalance = await tusdc.balanceOf(bridgeAddress);
    console.log(`\n✅ Bridge now has ${ethers.formatUnits(newBridgeBalance, decimals)} ${symbol}`);
    console.log(`Bridge is ready to handle custom token transfers!`);

  } catch (error: any) {
    console.error("Error pre-funding bridge:", error.message);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Pre-fund failed:", error);
    process.exit(1);
  });

