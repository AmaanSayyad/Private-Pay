import { ethers, network } from "hardhat";

/**
 * Deploy TUSDC (Test USDC) as a standard ERC20 token on Base Sepolia and Arbitrum Sepolia
 * 
 * This script deploys a simple ERC20 token that can later be linked to ITS if needed.
 * For now, we deploy a standard ERC20 token with mint functionality.
 * 
 * Note: To make it a true ITS token, you would need to:
 * 1. Deploy via Axelar ITS (requires special permissions)
 * 2. Or link existing token to ITS (see Axelar docs)
 */

// ERC20 Token Contract
const ERC20_TOKEN_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function mint(address to, uint256 amount) external",
  "function owner() external view returns (address)",
];

async function main() {
  const networkName = network.name;
  console.log(`\n🪙 Deploying TUSDC on ${networkName}...\n`);

  // Only deploy on Base Sepolia and Arbitrum Sepolia
  if (networkName !== "base-sepolia" && networkName !== "arbitrum-sepolia") {
    throw new Error(`This script only works on base-sepolia or arbitrum-sepolia. Current network: ${networkName}`);
  }

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log(`Deployer: ${deployerAddress}`);

  const balance = await ethers.provider.getBalance(deployerAddress);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error("No ETH for gas. Please fund the account first.");
  }

  // TUSDC parameters
  const tokenName = "Test USDC";
  const tokenSymbol = "TUSDC";
  const tokenDecimals = 6;
  const initialSupply = ethers.parseUnits("1000000", tokenDecimals); // 1M TUSDC

  try {
    console.log("Deploying TUSDC ERC20 token...");
    console.log(`Name: ${tokenName}`);
    console.log(`Symbol: ${tokenSymbol}`);
    console.log(`Decimals: ${tokenDecimals}`);
    console.log(`Initial Supply: ${ethers.formatUnits(initialSupply, tokenDecimals)} ${tokenSymbol}\n`);

    // Deploy TUSDC token
    const TUSDC = await ethers.getContractFactory("TUSDC");
    
    console.log("Deploying contract...");
    const token = await TUSDC.deploy(
      tokenName,
      tokenSymbol,
      tokenDecimals,
      initialSupply,
      deployerAddress
    );
    
    console.log(`Transaction hash: ${token.deploymentTransaction()?.hash}`);
    console.log("Waiting for confirmation...");
    
    await token.waitForDeployment();
    const tokenAddress = await token.getAddress();
    
    console.log(`✅ TUSDC deployed successfully!`);
    console.log(`\n📋 Deployment Info:`);
    console.log(`Network: ${networkName}`);
    console.log(`Token Address: ${tokenAddress}`);
    
    // Verify deployment
    const name = await token.name();
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    const totalSupply = await token.totalSupply();
    const deployerBalance = await token.balanceOf(deployerAddress);
    
    console.log(`\n📊 Token Info:`);
    console.log(`Name: ${name}`);
    console.log(`Symbol: ${symbol}`);
    console.log(`Decimals: ${decimals}`);
    console.log(`Total Supply: ${ethers.formatUnits(totalSupply, decimals)} ${symbol}`);
    console.log(`Deployer Balance: ${ethers.formatUnits(deployerBalance, decimals)} ${symbol}`);
    
    console.log(`\n📝 Add to .env:`);
    if (networkName === "base-sepolia") {
      console.log(`VITE_AXELAR_TUSDC_ADDRESS_BASE_SEPOLIA=${tokenAddress}`);
    } else if (networkName === "arbitrum-sepolia") {
      console.log(`VITE_AXELAR_TUSDC_ADDRESS_ARBITRUM_SEPOLIA=${tokenAddress}`);
    }
    
    console.log(`\n📋 Next Steps:`);
    console.log(`1. Deploy TUSDC on the other chain (${networkName === "base-sepolia" ? "arbitrum-sepolia" : "base-sepolia"})`);
    console.log(`2. Update frontend config with token addresses`);
    console.log(`3. (Optional) Link token to ITS for cross-chain functionality`);

  } catch (error: any) {
    console.error("Deployment error:", error);
    throw error;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });

