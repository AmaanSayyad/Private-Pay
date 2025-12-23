import { ethers, network } from "hardhat";

/**
 * Script to mint TUSDC tokens for testing
 * TUSDC is an ITS token deployed via Axelar ITS
 * 
 * Token Address: 0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B (same on all chains)
 * Token Manager: 0x1e2f2E68ea65212Ec6F3D91f39E6B644fE41e29B
 */

const TUSDC_ADDRESS = "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B";
const TOKEN_MANAGER_ADDRESS = "0x1e2f2E68ea65212Ec6F3D91f39E6B644fE41e29B";

// ERC20 ABI for TUSDC
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function mint(address to, uint256 amount) external",
  "function owner() external view returns (address)",
];

// Token Manager ABI
const TOKEN_MANAGER_ABI = [
  "function interchainTokenId() external view returns (bytes32)",
  "function tokenAddress() external view returns (address)",
];

async function main() {
  const networkName = network.name;
  console.log(`\n🪙 Minting TUSDC on ${networkName}...\n`);

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log(`Signer: ${signerAddress}`);

  // Check balance
  const balance = await ethers.provider.getBalance(signerAddress);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error("No ETH for gas. Please fund the account first.");
  }

  // Connect to TUSDC token
  const tusdc = new ethers.Contract(TUSDC_ADDRESS, ERC20_ABI, signer);

  try {
    // Check if token exists
    const symbol = await tusdc.symbol();
    const decimals = await tusdc.decimals();
    console.log(`Token: ${symbol}`);
    console.log(`Decimals: ${decimals}`);

    // Check current balance
    const currentBalance = await tusdc.balanceOf(signerAddress);
    console.log(`Current TUSDC balance: ${ethers.formatUnits(currentBalance, decimals)} ${symbol}\n`);

    // Check if contract has mint function
    try {
      const owner = await tusdc.owner();
      console.log(`Token owner: ${owner}`);
      
      if (owner.toLowerCase() === signerAddress.toLowerCase()) {
        // Try to mint
        const mintAmount = ethers.parseUnits("1000", decimals); // 1000 TUSDC
        console.log(`Minting ${ethers.formatUnits(mintAmount, decimals)} ${symbol}...`);
        
        const tx = await tusdc.mint(signerAddress, mintAmount);
        console.log(`Transaction hash: ${tx.hash}`);
        
        await tx.wait();
        console.log("✅ Mint successful!");
        
        // Check new balance
        const newBalance = await tusdc.balanceOf(signerAddress);
        console.log(`New TUSDC balance: ${ethers.formatUnits(newBalance, decimals)} ${symbol}`);
      } else {
        console.log(`⚠️  You are not the token owner. Cannot mint.`);
        console.log(`\nTo get TUSDC:`);
        console.log(`1. Request from token owner: ${owner}`);
        console.log(`2. Or transfer from another address that has TUSDC`);
        console.log(`3. Or use ITS to bridge TUSDC from another chain`);
      }
    } catch (mintError: any) {
      if (mintError.message?.includes("mint")) {
        console.log(`⚠️  Token does not have a public mint function.`);
        console.log(`\nTo get TUSDC:`);
        console.log(`1. Transfer from Ethereum Sepolia (where TUSDC is deployed)`);
        console.log(`2. Use ITS to bridge TUSDC from another chain`);
        console.log(`3. Request from someone who has TUSDC`);
      } else {
        throw mintError;
      }
    }

    // Check Token Manager
    console.log(`\n📋 Token Manager Info:`);
    const tokenManager = new ethers.Contract(TOKEN_MANAGER_ADDRESS, TOKEN_MANAGER_ABI, signer);
    try {
      const tokenId = await tokenManager.interchainTokenId();
      const tokenAddress = await tokenManager.tokenAddress();
      console.log(`Token ID: ${tokenId}`);
      console.log(`Token Address: ${tokenAddress}`);
      
      if (tokenAddress.toLowerCase() === TUSDC_ADDRESS.toLowerCase()) {
        console.log(`✅ Token Manager correctly points to TUSDC`);
      } else {
        console.log(`⚠️  Token Manager points to different address: ${tokenAddress}`);
      }
    } catch (tmError) {
      console.log(`⚠️  Could not read Token Manager: ${tmError}`);
    }

  } catch (error: any) {
    if (error.message?.includes("contract does not exist")) {
      console.log(`❌ TUSDC not deployed on ${networkName}`);
      console.log(`\nTUSDC needs to be deployed via Axelar ITS.`);
      console.log(`Current deployment status:`);
      console.log(`- Ethereum Sepolia: ✅ Deployed`);
      console.log(`- Base Sepolia: ✅ Deployed (via ITS)`);
      console.log(`- Arbitrum Sepolia: ❓ Check if deployed`);
      console.log(`\nTo deploy TUSDC on ${networkName}:`);
      console.log(`1. Use Axelar ITS to deploy interchain token`);
      console.log(`2. Or bridge TUSDC from Ethereum Sepolia using ITS`);
    } else {
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });

