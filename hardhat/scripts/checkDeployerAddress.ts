import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const privateKey = process.env.VITE_DEPLOYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
  
  if (!privateKey) {
    console.log("❌ No private key found in environment");
    return;
  }

  const wallet = new ethers.Wallet(privateKey);
  console.log("Deployer Address:", wallet.address);
  console.log("Expected Address: 0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123");
  
  if (wallet.address.toLowerCase() === "0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123".toLowerCase()) {
    console.log("✅ Address matches!");
  } else {
    console.log("⚠️  Address mismatch! Update DEPLOYER_ADDRESS in code.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

