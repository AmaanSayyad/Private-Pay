import { ethers, network } from "hardhat";

/**
 * Script to mint TUSDC tokens to deployer account
 * Uses the newly deployed TUSDC contracts (not ITS tokens)
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
  console.log(`\n🪙 Minting TUSDC on ${networkName}...\n`);

  // Get TUSDC address for this network
  const tusdcAddress = TUSDC_ADDRESSES[networkName];
  
  if (!tusdcAddress) {
    console.log(`❌ TUSDC not deployed on ${networkName}`);
    console.log(`\nAvailable networks:`);
    Object.entries(TUSDC_ADDRESSES).forEach(([net, addr]) => {
      console.log(`  - ${net}: ${addr}`);
    });
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log(`Signer: ${signerAddress}`);
  console.log(`TUSDC Address: ${tusdcAddress}\n`);

  // Check balance
  const balance = await ethers.provider.getBalance(signerAddress);
  console.log(`ETH Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error("No ETH for gas. Please fund the account first.");
  }

  // Connect to TUSDC token
  const tusdc = new ethers.Contract(tusdcAddress, ERC20_ABI, signer);

  try {
    // Check if token exists and get info
    const symbol = await tusdc.symbol();
    const decimals = await tusdc.decimals();
    const owner = await tusdc.owner();
    
    console.log(`Token: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Owner: ${owner}`);
    
    // Check if signer is owner
    if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
      console.log(`\n⚠️  Signer is not the token owner!`);
      console.log(`Owner: ${owner}`);
      console.log(`Signer: ${signerAddress}`);
      console.log(`\nTo mint, you need to use the owner's private key.`);
      process.exit(1);
    }

    // Check current balance
    const currentBalance = await tusdc.balanceOf(signerAddress);
    console.log(`Current TUSDC balance: ${ethers.formatUnits(currentBalance, decimals)} ${symbol}\n`);

    // Mint tokens to deployer
    const mintAmount = ethers.parseUnits("10000", decimals); // 10,000 TUSDC
    console.log(`Minting ${ethers.formatUnits(mintAmount, decimals)} ${symbol} to ${signerAddress}...`);
    
    const tx = await tusdc.mint(signerAddress, mintAmount);
    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    
    await tx.wait();
    console.log("✅ Mint successful!");
    
    // Check new balance
    const newBalance = await tusdc.balanceOf(signerAddress);
    console.log(`\nNew TUSDC balance: ${ethers.formatUnits(newBalance, decimals)} ${symbol}`);
    console.log(`\n✅ Deployer now has ${ethers.formatUnits(newBalance, decimals)} ${symbol} to distribute!`);

  } catch (error: any) {
    if (error.message?.includes("contract does not exist") || error.code === "BAD_DATA") {
      console.log(`❌ TUSDC contract not found at ${tusdcAddress} on ${networkName}`);
      console.log(`\nMake sure TUSDC is deployed on this network first.`);
      console.log(`Run: npx hardhat run scripts/deployTUSDC.ts --network ${networkName}`);
    } else {
      console.error("Error:", error);
      throw error;
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Mint failed:", error);
    process.exit(1);
  });

