/**
 * Create a test wallet for Axelar stealth payment testing
 */

import { ethers } from "ethers";

async function main() {
  console.log("\n🔐 Creating New Test Wallet\n");
  console.log("=".repeat(50));

  // Create random wallet
  const wallet = ethers.Wallet.createRandom();

  console.log(`\n✅ Wallet Created!\n`);
  console.log(`📍 Address: ${wallet.address}`);
  console.log(`🔑 Private Key: ${wallet.privateKey}`);
  console.log(`📝 Mnemonic: ${wallet.mnemonic?.phrase}`);

  console.log(`\n${"=".repeat(50)}`);
  console.log(`\n📋 Next Steps:`);
  console.log(`\n1. Add to .env file in hardhat folder:`);
  console.log(`   PRIVATE_KEY=${wallet.privateKey}`);
  
  console.log(`\n2. Get testnet ETH for gas:`);
  console.log(`   Sepolia: https://sepoliafaucet.com/`);
  console.log(`   Polygon Amoy: https://faucet.polygon.technology/`);
  
  console.log(`\n3. Get aUSDC tokens:`);
  console.log(`   a. Join Axelar Discord: https://discord.gg/axelarnetwork`);
  console.log(`   b. Go to #faucet channel`);
  console.log(`   c. Type: !faucet ${wallet.address}`);
  console.log(`   d. Bridge via: https://testnet.satellite.money/`);

  console.log(`\n4. Run the stealth payment test:`);
  console.log(`   npx hardhat run scripts/test-stealth-payment.ts --network ethereum-sepolia`);

  console.log(`\n⚠️  SAVE THE PRIVATE KEY! You'll need it for testing.\n`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
