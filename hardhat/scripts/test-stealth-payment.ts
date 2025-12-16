/**
 * Test Stealth Payment via Axelar
 * 
 * This script:
 * 1. Creates or uses existing wallet
 * 2. Checks aUSDC balance
 * 3. Executes a cross-chain stealth payment
 */

import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// Deployed contract addresses
const DEPLOYMENTS_FILE = path.join(__dirname, "../deployments/axelar-bridge.json");

// aUSDC token address on testnets (from Axelar docs)
const AUSDC_ADDRESSES: Record<string, string> = {
  "ethereum-sepolia": "0x254d06f33bDc5b8ee05b2ea472107E300226659A",
  "polygon-amoy": "0x254d06f33bDc5b8ee05b2ea472107E300226659A",
  "avalanche-fuji": "0x57F1c63497AEe0bE305B8852b354CEc793da43bB",
  "optimism-sepolia": "0x254d06f33bDc5b8ee05b2ea472107E300226659A",
  "base-sepolia": "0x254d06f33bDc5b8ee05b2ea472107E300226659A",
};

// ERC20 ABI for token interactions
const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

// Axelar Stealth Bridge ABI
const BRIDGE_ABI = [
  "function sendCrossChainStealthPayment(string calldata destinationChain, bytes32 stealthAddress, bytes calldata ephemeralPubKey, uint8 viewTag, string calldata tokenSymbol, uint256 amount) external payable",
  "function trustedRemotes(string calldata chainName) view returns (address)",
];

async function main() {
  console.log("\n🔐 Axelar Stealth Payment Test\n");
  console.log("=".repeat(50));

  // Get network info
  const network = await ethers.provider.getNetwork();
  const networkName = getNetworkName(Number(network.chainId));
  console.log(`📡 Network: ${networkName} (chainId: ${network.chainId})`);

  // Get signer
  const [signer] = await ethers.getSigners();
  console.log(`👛 Wallet: ${signer.address}`);

  // Check ETH balance for gas
  const ethBalance = await ethers.provider.getBalance(signer.address);
  console.log(`⛽ ETH Balance: ${ethers.formatEther(ethBalance)} ETH`);

  if (ethBalance === 0n) {
    console.log("\n❌ No ETH for gas! Get testnet ETH from:");
    console.log("   - Sepolia: https://sepoliafaucet.com/");
    console.log("   - Polygon Amoy: https://faucet.polygon.technology/");
    return;
  }

  // Load deployments
  let deployments: Record<string, any>;
  try {
    deployments = JSON.parse(fs.readFileSync(DEPLOYMENTS_FILE, "utf8"));
  } catch (e) {
    console.log("\n❌ No deployments found. Run deploy script first.");
    return;
  }

  const deployment = deployments[networkName];
  if (!deployment) {
    console.log(`\n❌ No deployment found for ${networkName}`);
    return;
  }

  console.log(`📜 Bridge Contract: ${deployment.contractAddress}`);

  // Check aUSDC balance
  const ausdcAddress = AUSDC_ADDRESSES[networkName];
  if (!ausdcAddress) {
    console.log(`\n❌ aUSDC not configured for ${networkName}`);
    return;
  }

  const ausdc = new ethers.Contract(ausdcAddress, ERC20_ABI, signer);
  const ausdcBalance = await ausdc.balanceOf(signer.address);
  const decimals = await ausdc.decimals();
  const symbol = await ausdc.symbol();
  
  console.log(`💵 ${symbol} Balance: ${ethers.formatUnits(ausdcBalance, decimals)} ${symbol}`);

  if (ausdcBalance === 0n) {
    console.log("\n❌ No aUSDC tokens!");
    console.log("\n📋 How to get aUSDC:");
    console.log("   1. Join Axelar Discord: https://discord.gg/axelarnetwork");
    console.log("   2. Go to #faucet channel");
    console.log("   3. Request tokens for your address");
    console.log("   4. Bridge to EVM via https://testnet.satellite.money/");
    return;
  }

  // Generate stealth address (simplified for demo)
  console.log("\n🎭 Generating Stealth Address...");
  const recipientWallet = ethers.Wallet.createRandom();
  const stealthAddress = ethers.keccak256(recipientWallet.address);
  const ephemeralPubKey = ethers.randomBytes(33); // Simplified for demo
  const viewTag = 0x01;
  
  console.log(`   Stealth Address Hash: ${stealthAddress.slice(0, 20)}...`);
  console.log(`   Recipient (for demo): ${recipientWallet.address}`);

  // Prepare payment
  const destinationChain = networkName === "ethereum-sepolia" ? "Polygon" : "ethereum-sepolia";
  const amount = ethers.parseUnits("1", decimals); // 1 aUSDC

  console.log(`\n📤 Preparing Cross-Chain Payment:`);
  console.log(`   From: ${networkName}`);
  console.log(`   To: ${destinationChain}`);
  console.log(`   Amount: 1 ${symbol}`);

  // Connect to bridge contract
  const bridge = new ethers.Contract(deployment.contractAddress, BRIDGE_ABI, signer);

  // Check if trusted remote is set
  const trustedRemote = await bridge.trustedRemotes(destinationChain);
  console.log(`   Trusted Remote: ${trustedRemote}`);
  
  if (trustedRemote === ethers.ZeroAddress) {
    console.log("\n⚠️  Trusted remote not set for destination chain!");
    console.log("   Run: npx hardhat run scripts/set-trusted-remotes.ts --network <network>");
    return;
  }

  // Approve token spending
  console.log("\n📝 Approving token spending...");
  const currentAllowance = await ausdc.allowance(signer.address, deployment.contractAddress);
  if (currentAllowance < amount) {
    const approveTx = await ausdc.approve(deployment.contractAddress, ethers.MaxUint256);
    await approveTx.wait();
    console.log(`   ✅ Approved: ${approveTx.hash}`);
  } else {
    console.log("   ✅ Already approved");
  }

  // Estimate gas for cross-chain
  console.log("\n⛽ Estimating Axelar gas...");
  const gasValue = ethers.parseEther("0.01"); // 0.01 ETH for cross-chain gas

  // Execute stealth payment
  console.log("\n🚀 Sending Cross-Chain Stealth Payment...");
  try {
    const tx = await bridge.sendCrossChainStealthPayment(
      destinationChain,
      stealthAddress,
      ephemeralPubKey,
      viewTag,
      symbol,
      amount,
      { value: gasValue }
    );

    console.log(`   📨 TX Hash: ${tx.hash}`);
    console.log("   ⏳ Waiting for confirmation...");

    const receipt = await tx.wait();
    console.log(`   ✅ Confirmed in block ${receipt?.blockNumber}`);

    console.log("\n🔍 Track on Axelarscan:");
    console.log(`   https://testnet.axelarscan.io/gmp/${tx.hash}`);

    console.log("\n✅ Stealth payment sent successfully!");
    console.log("   The payment will arrive on the destination chain in ~2-5 minutes.");

  } catch (error: any) {
    console.log(`\n❌ Transaction failed: ${error.message}`);
    if (error.data) {
      console.log(`   Error data: ${error.data}`);
    }
  }
}

function getNetworkName(chainId: number): string {
  const networks: Record<number, string> = {
    11155111: "ethereum-sepolia",
    80002: "polygon-amoy",
    43113: "avalanche-fuji",
    421614: "arbitrum-sepolia",
    11155420: "optimism-sepolia",
    84532: "base-sepolia",
  };
  return networks[chainId] || "unknown";
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
