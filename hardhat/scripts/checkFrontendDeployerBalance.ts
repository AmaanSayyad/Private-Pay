import { ethers, network } from "hardhat";

/**
 * Check TUSDC balance of frontend deployer address
 */

const FRONTEND_DEPLOYER_ADDRESS = "0xb424d2369F07b925D1218B08e56700AF5928287b";

const TUSDC_ADDRESSES: Record<string, string> = {
  "base-sepolia": "0x2823Af7e1F2F50703eD9f81Ac4B23DC1E78B9E53",
  "arbitrum-sepolia": "0xd17beb0fE91B2aE5a57cE39D1c3D15AF1a968817",
};

const ERC20_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

async function main() {
  const networkName = network.name;
  const tusdcAddress = TUSDC_ADDRESSES[networkName];
  
  if (!tusdcAddress) {
    console.log(`❌ TUSDC not deployed on ${networkName}`);
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  const tusdc = new ethers.Contract(tusdcAddress, ERC20_ABI, signer);
  
  const symbol = await tusdc.symbol();
  const decimals = await tusdc.decimals();
  const balance = await tusdc.balanceOf(FRONTEND_DEPLOYER_ADDRESS);
  
  console.log(`\n📊 Frontend Deployer TUSDC Balance on ${networkName}`);
  console.log(`Address: ${FRONTEND_DEPLOYER_ADDRESS}`);
  console.log(`Balance: ${ethers.formatUnits(balance, decimals)} ${symbol}\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

