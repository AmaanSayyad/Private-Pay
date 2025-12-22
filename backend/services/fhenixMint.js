import { ethers } from "ethers";
import "dotenv/config";

/**
 * Fhenix FHPAY Mint Service
 * Mints test tokens to user addresses using owner wallet
 */

const FHPAY_CONTRACT_ADDRESS = "0xf7554dBFdf4633bB4b2c1E708945bB83c9071C12";
const ARBITRUM_SEPOLIA_RPC_URL = process.env.ARBITRUM_SEPOLIA_RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";
const ARBITRUM_TREASURY_PRIVATE_KEY = process.env.ARBITRUM_TREASURY_PRIVATE_KEY;

// FHPAY ABI (only needed functions)
const FHPAY_ABI = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint64", name: "value", type: "uint64" },
    ],
    name: "devMintPlain",
    outputs: [{ internalType: "euint64", name: "minted", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

let provider = null;
let signer = null;
let contract = null;

/**
 * Initialize Fhenix mint service
 */
export async function initializeFhenixMint() {
  if (!ARBITRUM_TREASURY_PRIVATE_KEY) {
    throw new Error("ARBITRUM_TREASURY_PRIVATE_KEY is not set in environment variables");
  }

  try {
    // Create provider and signer
    provider = new ethers.JsonRpcProvider(ARBITRUM_SEPOLIA_RPC_URL);
    signer = new ethers.Wallet(ARBITRUM_TREASURY_PRIVATE_KEY, provider);

    // Create contract instance
    contract = new ethers.Contract(FHPAY_CONTRACT_ADDRESS, FHPAY_ABI, signer);

    // Verify we are the owner
    const owner = await contract.owner();
    const signerAddress = await signer.getAddress();

    if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
      throw new Error(
        `Signer address (${signerAddress}) is not the contract owner (${owner})`
      );
    }

    // Get decimals
    const decimals = await contract.decimals();
    console.log(`✅ Fhenix Mint Service initialized`);
    console.log(`   Contract: ${FHPAY_CONTRACT_ADDRESS}`);
    console.log(`   Owner: ${signerAddress}`);
    console.log(`   Decimals: ${decimals}`);

    return {
      contract,
      signer,
      provider,
      owner: signerAddress,
      decimals: Number(decimals),
    };
  } catch (error) {
    console.error("❌ Failed to initialize Fhenix Mint Service:", error);
    throw error;
  }
}

/**
 * Mint test tokens to user address
 * @param {string} userAddress - User's wallet address
 * @param {number} amount - Amount in token units (will be multiplied by decimals)
 * @returns {Promise<{txHash: string, success: boolean, message?: string}>}
 */
export async function mintToUser(userAddress, amount = 100) {
  if (!contract || !signer) {
    throw new Error("Fhenix Mint Service not initialized. Call initializeFhenixMint() first.");
  }

  try {
    // Validate address
    if (!ethers.isAddress(userAddress)) {
      throw new Error(`Invalid address: ${userAddress}`);
    }

    // Get decimals
    const decimals = await contract.decimals();
    const decimalsMultiplier = BigInt(10 ** Number(decimals));
    const amountInUnits = BigInt(Math.floor(amount * Number(decimalsMultiplier)));

    console.log(`📝 Minting ${amount} FHPAY to ${userAddress}...`);

    // Check balance before mint
    const balanceBefore = await provider.getBalance(await signer.getAddress());
    console.log(`   Signer balance: ${ethers.formatEther(balanceBefore)} ETH`);

    // Call devMintPlain
    const tx = await contract.devMintPlain(userAddress, amountInUnits);
    console.log(`   Transaction sent: ${tx.hash}`);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);

    return {
      txHash: tx.hash,
      success: true,
      message: `Successfully minted ${amount} FHPAY to ${userAddress}`,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error("❌ Mint error:", error);
    
    // Provide user-friendly error messages
    let errorMessage = "Failed to mint tokens";
    if (error.message.includes("insufficient funds")) {
      errorMessage = "Insufficient funds in treasury wallet for gas fees";
    } else if (error.message.includes("nonce")) {
      errorMessage = "Transaction nonce error. Please retry.";
    } else if (error.message) {
      errorMessage = error.message;
    }

    return {
      txHash: null,
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Get contract info
 */
export async function getContractInfo() {
  if (!contract) {
    throw new Error("Fhenix Mint Service not initialized");
  }

  try {
    const owner = await contract.owner();
    const decimals = await contract.decimals();
    const signerAddress = await signer.getAddress();

    return {
      contractAddress: FHPAY_CONTRACT_ADDRESS,
      owner,
      signerAddress,
      isOwner: owner.toLowerCase() === signerAddress.toLowerCase(),
      decimals: Number(decimals),
      network: "Arbitrum Sepolia",
      chainId: 421614,
    };
  } catch (error) {
    console.error("Error getting contract info:", error);
    throw error;
  }
}

