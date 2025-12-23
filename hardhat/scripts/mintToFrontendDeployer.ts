import { ethers, network } from "hardhat";

/**
 * Script to mint TUSDC tokens to the frontend deployer address
 * Frontend deployer: 0xb424d2369F07b925D1218B08e56700AF5928287b
 */

// Frontend deployer address (from private key in frontend)
const FRONTEND_DEPLOYER_ADDRESS = "0xb424d2369F07b925D1218B08e56700AF5928287b";

// New TUSDC addresses (chain-specific)
const TUSDC_ADDRESSES: Record<string, string> = {
  "base-sepolia": "0x2823Af7e1F2F50703eD9f81Ac4B23DC1E78B9E53",
  "arbitrum-sepolia": "0xd17beb0fE91B2aE5a57cE39D1c3D15AF1a968817",
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
  console.log(`\n🪙 Minting TUSDC to frontend deployer on ${networkName}...\n`);

  // Get TUSDC address for this network
  const tusdcAddress = TUSDC_ADDRESSES[networkName];
  
  if (!tusdcAddress) {
    console.log(`❌ TUSDC not deployed on ${networkName}`);
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log(`Signer (token owner): ${signerAddress}`);
  console.log(`Frontend Deployer: ${FRONTEND_DEPLOYER_ADDRESS}`);
  console.log(`TUSDC Address: ${tusdcAddress}\n`);

  // Connect to TUSDC token
  const tusdc = new ethers.Contract(tusdcAddress, ERC20_ABI, signer);

  try {
    // Check token info
    const symbol = await tusdc.symbol();
    const decimals = await tusdc.decimals();
    const owner = await tusdc.owner();
    
    console.log(`Token: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Token Owner: ${owner}\n`);
    
    // Verify signer is owner
    if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
      console.log(`❌ Signer is not the token owner!`);
      console.log(`Owner: ${owner}`);
      console.log(`Signer: ${signerAddress}`);
      process.exit(1);
    }

    // Check current balance of frontend deployer
    const currentBalance = await tusdc.balanceOf(FRONTEND_DEPLOYER_ADDRESS);
    console.log(`Current TUSDC balance (frontend deployer): ${ethers.formatUnits(currentBalance, decimals)} ${symbol}\n`);

    // Mint tokens to frontend deployer
    const mintAmount = ethers.parseUnits("10000", decimals); // 10,000 TUSDC
    console.log(`Minting ${ethers.formatUnits(mintAmount, decimals)} ${symbol} to ${FRONTEND_DEPLOYER_ADDRESS}...`);
    
    const tx = await tusdc.mint(FRONTEND_DEPLOYER_ADDRESS, mintAmount);
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    
    await tx.wait();
    console.log("✅ Mint successful!");
    
    // Check new balance
    const newBalance = await tusdc.balanceOf(FRONTEND_DEPLOYER_ADDRESS);
    console.log(`\nNew TUSDC balance (frontend deployer): ${ethers.formatUnits(newBalance, decimals)} ${symbol}`);
    console.log(`\n✅ Frontend deployer now has ${ethers.formatUnits(newBalance, decimals)} ${symbol} to distribute!`);

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

