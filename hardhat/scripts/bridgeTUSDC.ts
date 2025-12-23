import { ethers, network } from "hardhat";

/**
 * Script to bridge TUSDC from Ethereum Sepolia to Arbitrum/Base Sepolia using ITS
 * 
 * TUSDC Address: 0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B
 * Token Manager: 0x1e2f2E68ea65212Ec6F3D91f39E6B644fE41e29B
 * ITS Address: 0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C
 */

const TUSDC_ADDRESS = "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B";
const TOKEN_MANAGER_ADDRESS = "0x1e2f2E68ea65212Ec6F3D91f39E6B644fE41e29B";
const ITS_ADDRESS = "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C";

// ERC20 ABI
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
];

// Token Manager ABI
const TOKEN_MANAGER_ABI = [
  "function interchainTokenId() external view returns (bytes32)",
];

// ITS ABI
const ITS_ABI = [
  "function interchainTransfer(bytes32 tokenId, string calldata destinationChain, bytes calldata destinationAddress, uint256 amount, bytes calldata metadata, uint256 gasValue) external payable",
];

async function main() {
  const networkName = network.name;
  console.log(`\n🌉 Bridging TUSDC from ${networkName}...\n`);

  // Destination chain (Arbitrum or Base)
  const destinationChain = process.argv[2] || "arbitrum-sepolia";
  const destinationAddress = process.argv[3]; // Recipient address on destination chain

  if (!destinationAddress) {
    console.log("Usage: npx hardhat run scripts/bridgeTUSDC.ts --network <source-chain> <destination-chain> <recipient-address>");
    console.log("Example: npx hardhat run scripts/bridgeTUSDC.ts --network ethereum-sepolia arbitrum-sepolia 0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123");
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log(`Signer: ${signerAddress}`);
  console.log(`Destination Chain: ${destinationChain}`);
  console.log(`Recipient: ${destinationAddress}\n`);

  // Check balance
  const balance = await ethers.provider.getBalance(signerAddress);
  console.log(`ETH Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther("0.01")) {
    throw new Error("Insufficient ETH for gas. Need at least 0.01 ETH");
  }

  // Connect to TUSDC
  const tusdc = new ethers.Contract(TUSDC_ADDRESS, ERC20_ABI, signer);
  
  try {
    const symbol = await tusdc.symbol();
    const decimals = await tusdc.decimals();
    console.log(`Token: ${symbol}`);
    console.log(`Decimals: ${decimals}`);

    // Check TUSDC balance
    const tusdcBalance = await tusdc.balanceOf(signerAddress);
    console.log(`TUSDC Balance: ${ethers.formatUnits(tusdcBalance, decimals)} ${symbol}\n`);

    if (tusdcBalance === 0n) {
      console.log("❌ No TUSDC balance!");
      console.log("\nTo get TUSDC:");
      console.log("1. Request from someone who has TUSDC");
      console.log("2. Or deploy TUSDC on this chain first");
      process.exit(1);
    }

    // Get token ID from Token Manager
    const tokenManager = new ethers.Contract(TOKEN_MANAGER_ADDRESS, TOKEN_MANAGER_ABI, signer);
    const tokenId = await tokenManager.interchainTokenId();
    console.log(`Token ID: ${tokenId}`);

    // Amount to bridge (use 10% of balance or minimum 10 TUSDC)
    const bridgeAmount = tusdcBalance > ethers.parseUnits("100", decimals) 
      ? tusdcBalance / 10n 
      : ethers.parseUnits("10", decimals);
    
    console.log(`\nBridging ${ethers.formatUnits(bridgeAmount, decimals)} ${symbol}...`);

    // Approve ITS
    const its = new ethers.Contract(ITS_ADDRESS, ITS_ABI, signer);
    const currentAllowance = await tusdc.allowance(signerAddress, ITS_ADDRESS);
    
    if (currentAllowance < bridgeAmount) {
      console.log("Approving ITS to spend TUSDC...");
      const approveTx = await tusdc.approve(ITS_ADDRESS, bridgeAmount);
      await approveTx.wait();
      console.log("✅ Approval confirmed");
    }

    // Estimate gas for destination
    const estimatedGas = ethers.parseEther("0.001"); // Small amount for testnet

    // Bridge via ITS
    console.log("Bridging via ITS...");
    const tx = await its.interchainTransfer(
      tokenId,
      destinationChain,
      ethers.getBytes(destinationAddress),
      bridgeAmount,
      "0x", // No metadata
      estimatedGas,
      { value: estimatedGas }
    );

    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`\n🌉 TUSDC bridged! Check ${destinationChain} for tokens.`);

  } catch (error: any) {
    console.error("Error:", error.message);
    if (error.message?.includes("contract does not exist")) {
      console.log(`\n❌ TUSDC not deployed on ${networkName}`);
      console.log("TUSDC needs to be deployed via Axelar ITS first.");
    }
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Bridge failed:", error);
    process.exit(1);
  });

