import { ethers, network } from "hardhat";
import dotenv from "dotenv";
dotenv.config();

/**
 * Script to mint TUSDC tokens to the actual deployer address from private key
 */

// New TUSDC addresses (chain-specific)
const TUSDC_ADDRESSES: Record<string, string> = {
  "base-sepolia": process.env.VITE_AXELAR_TUSDC_ADDRESS_BASE_SEPOLIA || "0x2823Af7e1F2F50703eD9f81Ac4B23DC1E78B9E53",
  "arbitrum-sepolia": process.env.VITE_AXELAR_TUSDC_ADDRESS_ARBITRUM_SEPOLIA || "0xd17beb0fE91B2aE5a57cE39D1c3D15AF1a968817",
};

// ERC20 ABI for TUSDC
const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
  "function owner() external view returns (address)",
  "function mint(address to, uint256 amount) external",
];

async function main() {
  const networkName = network.name;
  console.log(`\n🪙 Minting TUSDC to deployer on ${networkName}...\n`);

  // Get deployer private key from env
  const deployerPrivateKey = process.env.VITE_DEPLOYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  
  if (!deployerPrivateKey) {
    console.log("❌ No deployer private key found in environment");
    console.log("Set VITE_DEPLOYER_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY in .env");
    process.exit(1);
  }

  // Get actual deployer address from private key
  const deployerWallet = new ethers.Wallet(deployerPrivateKey);
  const deployerAddress = deployerWallet.address;
  console.log(`Deployer Address (from private key): ${deployerAddress}`);

  // Get TUSDC address for this network
  const tusdcAddress = TUSDC_ADDRESSES[networkName];
  
  if (!tusdcAddress) {
    console.log(`❌ TUSDC not deployed on ${networkName}`);
    process.exit(1);
  }

  console.log(`TUSDC Address: ${tusdcAddress}\n`);

  // Connect deployer wallet to provider
  const provider = ethers.provider;
  const deployerSigner = deployerWallet.connect(provider);

  // Check ETH balance
  const balance = await provider.getBalance(deployerAddress);
  console.log(`ETH Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error("No ETH for gas. Please fund the account first.");
  }

  // Connect to TUSDC token
  const tusdc = new ethers.Contract(tusdcAddress, ERC20_ABI, deployerSigner);

  try {
    // Check token info
    const symbol = await tusdc.symbol();
    const decimals = await tusdc.decimals();
    const owner = await tusdc.owner();
    
    console.log(`Token: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Token Owner: ${owner}`);
    console.log(`Deployer Address: ${deployerAddress}\n`);
    
    // Check if deployer is owner
    if (owner.toLowerCase() !== deployerAddress.toLowerCase()) {
      console.log(`⚠️  Deployer is not the token owner!`);
      console.log(`\nWe need to use the owner's account to mint.`);
      console.log(`Owner: ${owner}`);
      console.log(`\nSwitching to owner account...`);
      
      // Get owner account from hardhat config
      const [ownerSigner] = await ethers.getSigners();
      const ownerAddress = await ownerSigner.getAddress();
      
      if (ownerAddress.toLowerCase() === owner.toLowerCase()) {
        console.log(`✅ Using owner account: ${ownerAddress}`);
        const ownerTusdc = new ethers.Contract(tusdcAddress, ERC20_ABI, ownerSigner);
        
        // Check current balance
        const currentBalance = await ownerTusdc.balanceOf(deployerAddress);
        console.log(`Current TUSDC balance (deployer): ${ethers.formatUnits(currentBalance, decimals)} ${symbol}\n`);

        // Mint to deployer address
        const mintAmount = ethers.parseUnits("10000", decimals); // 10,000 TUSDC
        console.log(`Minting ${ethers.formatUnits(mintAmount, decimals)} ${symbol} to ${deployerAddress}...`);
        
        const tx = await ownerTusdc.mint(deployerAddress, mintAmount);
        console.log(`Transaction hash: ${tx.hash}`);
        console.log("Waiting for confirmation...");
        
        await tx.wait();
        console.log("✅ Mint successful!");
        
        // Check new balance
        const newBalance = await ownerTusdc.balanceOf(deployerAddress);
        console.log(`\nNew TUSDC balance (deployer): ${ethers.formatUnits(newBalance, decimals)} ${symbol}`);
      } else {
        console.log(`❌ Owner account mismatch. Cannot mint.`);
        process.exit(1);
      }
    } else {
      // Deployer is owner, can mint directly
      const currentBalance = await tusdc.balanceOf(deployerAddress);
      console.log(`Current TUSDC balance: ${ethers.formatUnits(currentBalance, decimals)} ${symbol}\n`);

      // Mint tokens to deployer
      const mintAmount = ethers.parseUnits("10000", decimals); // 10,000 TUSDC
      console.log(`Minting ${ethers.formatUnits(mintAmount, decimals)} ${symbol} to ${deployerAddress}...`);
      
      const tx = await tusdc.mint(deployerAddress, mintAmount);
      console.log(`Transaction hash: ${tx.hash}`);
      console.log("Waiting for confirmation...");
      
      await tx.wait();
      console.log("✅ Mint successful!");
      
      // Check new balance
      const newBalance = await tusdc.balanceOf(deployerAddress);
      console.log(`\nNew TUSDC balance: ${ethers.formatUnits(newBalance, decimals)} ${symbol}`);
    }

  } catch (error: any) {
    console.error("Error:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Mint failed:", error);
    process.exit(1);
  });

