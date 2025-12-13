import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

// Axelar testnet addresses
const AXELAR_GATEWAY = "0xe432150cce91c13a887f7D836923d5597adD8E31";
const AXELAR_GAS_SERVICE = "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6";
const BRIDGE_ADDRESS = "0x1764681c26D04f0E9EBb305368cfda808A9F6f8f";

// Chain names for Axelar (testnet)
const CHAIN_NAMES: { [key: string]: string } = {
  "ethereum-sepolia": "ethereum-sepolia",
  "polygon-sepolia": "polygon-sepolia",
};

// Minimal ABIs
const BRIDGE_ABI = [
  "function sendCrossChainPayment(string destinationChain, string destinationAddress, address stealthAddress, bytes ephemeralPubKey, bytes32 viewHint, uint8 k, string tokenSymbol, uint256 amount) external payable",
  "function gateway() external view returns (address)",
  "function gasService() external view returns (address)",
];

const GATEWAY_ABI = [
  "function tokenAddresses(string symbol) external view returns (address)",
];

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
  "function symbol() external view returns (string)",
];

const GAS_SERVICE_ABI = [
  "function payNativeGasForContractCallWithToken(address sender, string destinationChain, string destinationAddress, bytes payload, string symbol, uint256 amount, address refundAddress) external payable",
];

async function testGasEstimation() {
  console.log("\n=== Testing Gas Estimation API ===\n");
  
  const testCases = [
    { source: "ethereum-sepolia", dest: "polygon-sepolia" },
    { source: "polygon-sepolia", dest: "ethereum-sepolia" },
  ];

  for (const { source, dest } of testCases) {
    console.log(`\nTesting: ${source} -> ${dest}`);
    
    try {
      // Test the Axelarscan API
      const response = await fetch("https://testnet.api.axelarscan.io/gmp/estimateGasFee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceChain: source,
          destinationChain: dest,
          gasLimit: 350000,
          gasMultiplier: 1.1,
        }),
      });

      console.log(`Response status: ${response.status}`);
      const data = await response.json();
      console.log("Response data:", JSON.stringify(data, null, 2));
      
      // Parse the gas fee - API returns plain number
      let gasFee: bigint;
      if (typeof data === "number") {
        gasFee = BigInt(data);
      } else if (typeof data === "string" && /^\d+$/.test(data)) {
        gasFee = BigInt(data);
      } else if (data && data.result) {
        gasFee = BigInt(data.result);
      } else if (data && data.baseFee) {
        gasFee = BigInt(data.baseFee) + BigInt(data.executionFeeWithMultiplier || "0");
      } else {
        console.log("Unknown response format, data type:", typeof data);
        continue;
      }
      
      console.log(`Gas fee: ${ethers.formatEther(gasFee)} ETH`);
    } catch (error) {
      console.error(`Error: ${error}`);
    }
  }
}

async function testE2EPayment() {
  console.log("\n=== Testing End-to-End Cross-Chain Payment ===\n");

  const networkName = (await ethers.provider.getNetwork()).name;
  console.log(`Network: ${networkName}`);

  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log(`Signer: ${signerAddress}`);

  // Check balance
  const balance = await ethers.provider.getBalance(signerAddress);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  if (balance < ethers.parseEther("0.01")) {
    console.error("Insufficient balance for testing. Need at least 0.01 ETH");
    return;
  }

  // Connect to bridge contract
  const bridge = new ethers.Contract(BRIDGE_ADDRESS, BRIDGE_ABI, signer);
  
  // Verify contract
  try {
    const gateway = await bridge.gateway();
    console.log(`Bridge gateway: ${gateway}`);
  } catch (error) {
    console.error("Failed to connect to bridge contract:", error);
    return;
  }

  // Connect to gateway to check token
  const gateway = new ethers.Contract(AXELAR_GATEWAY, GATEWAY_ABI, signer);
  
  // Check if aUSDC is available
  const tokenSymbol = "aUSDC";
  const tokenAddress = await gateway.tokenAddresses(tokenSymbol);
  console.log(`${tokenSymbol} address: ${tokenAddress}`);

  if (tokenAddress === ethers.ZeroAddress) {
    console.log(`Token ${tokenSymbol} not available on this chain`);
    console.log("\nTo test fully, you need aUSDC tokens from:");
    console.log("https://faucet.testnet.axelar.dev/");
    return;
  }

  // Check token balance
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
  const tokenBalance = await token.balanceOf(signerAddress);
  const decimals = await token.decimals();
  console.log(`Token balance: ${ethers.formatUnits(tokenBalance, decimals)} ${tokenSymbol}`);

  if (tokenBalance === 0n) {
    console.log("\nNo aUSDC balance. Get tokens from:");
    console.log("https://faucet.testnet.axelar.dev/");
    return;
  }

  // Estimate gas
  console.log("\nEstimating gas...");
  const destinationChain = networkName === "sepolia" ? "polygon-sepolia" : "ethereum-sepolia";
  
  const gasResponse = await fetch("https://testnet.api.axelarscan.io/gmp/estimateGasFee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceChain: networkName === "sepolia" ? "ethereum-sepolia" : "polygon-sepolia",
      destinationChain: destinationChain,
      gasLimit: 350000,
      gasMultiplier: 1.1,
    }),
  });

  const gasData = await gasResponse.json();
  console.log("Gas estimation response:", JSON.stringify(gasData, null, 2));

  let gasFee: bigint;
  if (typeof gasData === "string") {
    gasFee = BigInt(gasData);
  } else if (gasData.result) {
    gasFee = BigInt(gasData.result);
  } else if (gasData.baseFee) {
    gasFee = BigInt(gasData.baseFee) + BigInt(gasData.executionFeeWithMultiplier || "0");
  } else {
    console.error("Could not parse gas fee from response");
    return;
  }

  console.log(`Gas fee: ${ethers.formatEther(gasFee)} ETH`);

  // Test payment parameters (direct transfer, no stealth for testing)
  const testRecipient = signerAddress; // Send to self for testing
  const amount = ethers.parseUnits("0.1", decimals); // 0.1 aUSDC
  const ephemeralPubKey = "0x" + "00".repeat(33);
  const viewHint = "0x" + "00".repeat(32);
  const k = 0;

  console.log("\nPayment parameters:");
  console.log(`  Destination chain: ${destinationChain}`);
  console.log(`  Recipient: ${testRecipient}`);
  console.log(`  Amount: ${ethers.formatUnits(amount, decimals)} ${tokenSymbol}`);
  console.log(`  Gas fee: ${ethers.formatEther(gasFee)} ETH`);

  // Approve token spending
  console.log("\nApproving token spending...");
  const approveTx = await token.approve(BRIDGE_ADDRESS, amount);
  await approveTx.wait();
  console.log(`Approval tx: ${approveTx.hash}`);

  // Send cross-chain payment
  console.log("\nSending cross-chain payment...");
  try {
    const tx = await bridge.sendCrossChainPayment(
      destinationChain,
      BRIDGE_ADDRESS, // Same address on destination
      testRecipient,
      ephemeralPubKey,
      viewHint,
      k,
      tokenSymbol,
      amount,
      { value: gasFee }
    );

    console.log(`Transaction hash: ${tx.hash}`);
    console.log("Waiting for confirmation...");
    
    const receipt = await tx.wait();
    console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);

    console.log("\n✅ Cross-chain payment sent successfully!");
    console.log(`Track on Axelarscan: https://testnet.axelarscan.io/gmp/${tx.hash}`);
  } catch (error: any) {
    console.error("\n❌ Transaction failed:", error.message);
    if (error.data) {
      console.error("Error data:", error.data);
    }
  }
}

async function main() {
  // First test gas estimation API
  await testGasEstimation();

  // Then test full E2E payment
  await testE2EPayment();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
