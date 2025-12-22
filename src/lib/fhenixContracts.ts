/**
 * Fhenix FHPAY contract interactions
 * Based on zec2eth/frontend/lib/contracts.ts pattern
 * Uses ethers.js for contract calls
 */

import { ethers } from "ethers";
import { FHENIX_CONFIG } from "../config";
import FHPAY_ABI from "../abi/FHPAY.json";
import type { FhenixEncryptionResult } from "./fhenixTypes";

const FHPAY_ADDRESS = FHENIX_CONFIG.arbitrumSepolia.fhpayContractAddress as `0x${string}`;
const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;

/**
 * Get provider for Arbitrum Sepolia
 */
export function getArbitrumSepoliaProvider(): ethers.Provider {
  const rpcUrl = FHENIX_CONFIG.arbitrumSepolia.rpcUrl;
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Get signer from browser wallet (MetaMask, etc.)
 */
export async function getArbitrumSepoliaSigner(): Promise<ethers.Signer> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("No ethereum provider found. Please install MetaMask or another Web3 wallet.");
  }

  const provider = new ethers.BrowserProvider((window as any).ethereum);
  
  // Request connection to Arbitrum Sepolia
  await provider.send("wallet_switchEthereumChain", [
    { chainId: `0x${ARBITRUM_SEPOLIA_CHAIN_ID.toString(16)}` },
  ]).catch(async (error: any) => {
    // If chain doesn't exist, add it
    if (error.code === 4902) {
      await provider.send("wallet_addEthereumChain", [
        {
          chainId: `0x${ARBITRUM_SEPOLIA_CHAIN_ID.toString(16)}`,
          chainName: "Arbitrum Sepolia",
          nativeCurrency: {
            name: "ETH",
            symbol: "ETH",
            decimals: 18,
          },
          rpcUrls: [FHENIX_CONFIG.arbitrumSepolia.rpcUrl],
          blockExplorerUrls: [FHENIX_CONFIG.arbitrumSepolia.blockExplorerUrl],
        },
      ]);
    } else {
      throw error;
    }
  });

  return await provider.getSigner();
}

/**
 * Get FHPAY contract instance
 */
export async function getFHPAYContract(): Promise<ethers.Contract> {
  const signer = await getArbitrumSepoliaSigner();
  return new ethers.Contract(FHPAY_ADDRESS, FHPAY_ABI.abi, signer);
}

/**
 * Convert encrypted value to InEuint64 tuple format for contract calls
 * cofhejs.encrypt() returns an array, we need the first element which is InEuint64
 */
function formatInEuint64(encryptedValue: unknown): {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: string;
} {
  // cofhejs.encrypt() returns an array, the first element is the encrypted value
  let encValue = encryptedValue;
  if (Array.isArray(encryptedValue) && encryptedValue.length > 0) {
    encValue = encryptedValue[0];
  }
  
  console.log("Formatting encrypted value:", encValue);
  console.log("Type:", typeof encValue, Array.isArray(encValue));
  
  // The encrypted value should be an object with ctHash, securityZone, utype, signature
  if (encValue && typeof encValue === "object" && !Array.isArray(encValue)) {
    const enc = encValue as any;
    
    console.log("Encrypted object keys:", Object.keys(enc));
    console.log("ctHash:", enc.ctHash);
    console.log("securityZone:", enc.securityZone);
    console.log("utype:", enc.utype);
    console.log("signature:", enc.signature);
    
    // Extract the InEuint64 struct fields
    // utype should be 1 for uint64 (as per Fhenix documentation)
    const result = {
      ctHash: enc.ctHash !== undefined ? BigInt(enc.ctHash.toString()) : BigInt(0),
      securityZone: enc.securityZone !== undefined ? Number(enc.securityZone) : 0,
      utype: enc.utype !== undefined ? Number(enc.utype) : 1, // Default to 1 for uint64
      signature: enc.signature || (enc.signature === "" ? "0x" : "0x"),
    };
    
    console.log("Formatted result:", result);
    return result;
  }
  
  // Fallback: if it's not in the expected format
  console.warn("Encrypted value is not in expected format, using fallback");
  console.warn("Value:", JSON.stringify(encValue, null, 2));
  return {
    ctHash: BigInt(0),
    securityZone: 0,
    utype: 1, // uint64 type
    signature: "0x",
  };
}

/**
 * Perform confidential transfer of FHPAY tokens
 * @param to Recipient address
 * @param encryptedAmount Encrypted amount from fhenixFhe.encryptAmount()
 * @returns Transaction hash
 */
export async function confidentialTransfer(
  to: string,
  encryptedAmount: FhenixEncryptionResult
): Promise<string> {
  const contract = await getFHPAYContract();
  const signer = await getArbitrumSepoliaSigner();
  const account = await signer.getAddress();

  // cofhejs.encrypt() returns { success: true, data: CoFheInUint64[] }
  // encryptedAmount.encryptedValue should be the CoFheInUint64 object directly
  let inEuint64 = encryptedAmount.encryptedValue;
  
  console.log("🔍 Raw encrypted value from encryptAmount:", inEuint64);
  console.log("🔍 Type:", typeof inEuint64, Array.isArray(inEuint64));
  
  // If it's an array, get the first element (CoFheInUint64)
  if (Array.isArray(inEuint64) && inEuint64.length > 0) {
    inEuint64 = inEuint64[0];
    console.log("🔍 Extracted first element from array:", inEuint64);
  }
  
  // Check if it's already in the correct format (CoFheInUint64 with ctHash, securityZone, utype, signature)
  if (inEuint64 && typeof inEuint64 === "object" && !Array.isArray(inEuint64)) {
    const enc = inEuint64 as any;
    
    console.log("🔍 Encrypted object keys:", Object.keys(enc));
    console.log("🔍 Encrypted object full structure:", enc);
    
    // Check all possible property names for ctHash
    const ctHash = enc.ctHash ?? enc.ct_hash ?? enc.hash ?? enc.ciphertextHash;
    const securityZone = enc.securityZone ?? enc.security_zone ?? enc.zone ?? 0;
    const utype = enc.utype ?? enc.type ?? enc.fheType;
    const signature = enc.signature ?? enc.sig ?? "0x";
    
    console.log("🔍 Extracted values:", {
      ctHash: ctHash?.toString(),
      securityZone,
      utype,
      signature,
    });
    
    // Import FheTypes to get the correct utype value
    const { FheTypes } = await import("cofhejs/web");
    
    // If ctHash is still missing, the encrypted value might be in a different format
    // Check if it has a 'data' property (like fallback encryption)
    if (!ctHash && enc.data) {
      console.warn("⚠️ Encrypted value has 'data' property but no ctHash - this might be fallback encryption");
      console.warn("⚠️ Fallback encryption cannot be used for confidentialTransfer");
      throw new Error("Encrypted value is in fallback format (has 'data' but no 'ctHash'). CoFHE encryption is required for confidential transfers.");
    }
    
    // Make sure all fields are present and in correct format
    if (!ctHash || ctHash === BigInt(0) || ctHash === 0 || ctHash === null || ctHash === undefined) {
      console.error("❌ ctHash is missing or zero!");
      console.error("❌ Full encrypted object:", JSON.stringify(enc, (key, value) => 
        typeof value === "bigint" ? value.toString() : value
      ));
      throw new Error("ctHash is missing from encrypted value - CoFHE encryption may have failed");
    }
    
    // Format signature - must be a hex string starting with 0x
    let formattedSignature = "0x";
    if (signature) {
      if (typeof signature === "string") {
        formattedSignature = signature.startsWith("0x") ? signature : `0x${signature}`;
      } else if (signature instanceof Uint8Array || Array.isArray(signature)) {
        // Convert bytes array to hex string
        const bytes = Array.isArray(signature) ? signature : Array.from(signature);
        formattedSignature = "0x" + bytes.map(b => b.toString(16).padStart(2, "0")).join("");
      }
    }
    
    const formatted = {
      ctHash: typeof ctHash === "bigint" ? ctHash : BigInt(ctHash.toString()),
      securityZone: securityZone !== undefined ? Number(securityZone) : 0,
      utype: utype !== undefined 
        ? (typeof utype === "number" ? utype : Number(utype))
        : (FheTypes?.Uint64 ?? 1), // Use FheTypes.Uint64 if available, otherwise default to 1
      signature: formattedSignature,
    };
    
    // Validate ctHash is not zero
    if (formatted.ctHash === BigInt(0)) {
      console.error("❌ ctHash is zero! Encrypted value is invalid.");
      throw new Error("Encrypted value has zero ctHash - encryption may have failed");
    }
    
    console.log("✅ Formatted InEuint64 for transfer:", {
      ctHash: formatted.ctHash.toString(),
      securityZone: formatted.securityZone,
      utype: formatted.utype,
      signature: formatted.signature,
    });
    console.log("📍 Recipient address:", to);
    
    inEuint64 = formatted;
  } else {
    console.error("❌ Invalid encrypted value format:", inEuint64);
    console.error("❌ Type:", typeof inEuint64, Array.isArray(inEuint64));
    throw new Error("Invalid encrypted value format - expected CoFheInUint64 object");
  }

  // Use getFunction with explicit signature to avoid ambiguity
  // There are two overloads: confidentialTransfer(address, InEuint64) and confidentialTransfer(address, euint64)
  // We want the InEuint64 version: confidentialTransfer(address,(uint256,uint8,uint8,bytes))
  const transferFunction = contract.getFunction("confidentialTransfer(address,(uint256,uint8,uint8,bytes))");
  
  // Simulate transaction first
  try {
    const simulationResult = await transferFunction.staticCall(to, inEuint64);
    console.log("✅ Transaction simulation successful, result:", simulationResult);
  } catch (error: any) {
    console.error("❌ Transaction simulation failed:", error);
    console.error("❌ Error details:", JSON.stringify(error, null, 2));
    
    // Try to decode the revert reason
    if (error?.data) {
      console.error("❌ Revert data:", error.data);
    }
    
    const errorMessage = error?.reason || error?.message || String(error);
    throw new Error(`Transaction would fail: ${errorMessage}`);
  }

  // Send transaction with better error handling
  try {
    // Estimate gas first
    let gasEstimate: bigint;
    try {
      gasEstimate = await transferFunction.estimateGas(to, inEuint64);
      console.log("⛽ Gas estimate:", gasEstimate.toString());
    } catch (gasError: any) {
      console.error("❌ Gas estimation failed:", gasError);
      const gasErrorMessage = gasError?.reason || gasError?.message || String(gasError);
      throw new Error(`Gas estimation failed: ${gasErrorMessage}. This usually means the transaction would revert.`);
    }

    // Send transaction with increased gas limit
    const tx = await transferFunction(to, inEuint64, {
      gasLimit: gasEstimate * BigInt(120) / BigInt(100), // Add 20% buffer
    });
    console.log("Transaction sent:", tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log("Transaction confirmed:", receipt);

    return tx.hash;
  } catch (error: any) {
    console.error("Transaction failed:", error);
    
    // Try to extract more detailed error information
    let errorMessage = error?.reason || error?.message || String(error);
    
    // Check for revert reason
    if (error?.data) {
      console.error("Transaction error data:", error.data);
    }
    
    // Check for transaction receipt (if transaction was sent but reverted)
    if (error?.receipt) {
      console.error("Transaction receipt:", error.receipt);
    }
    
    // Check for transaction hash (if transaction was sent)
    if (error?.transaction) {
      console.error("Transaction hash:", error.transaction.hash);
    }
    
    // Provide more helpful error message
    if (errorMessage.includes("Internal JSON-RPC error")) {
      errorMessage = "Transaction reverted on-chain. This could be due to: insufficient balance, invalid encrypted input, or contract error. Check the console for more details.";
    }
    
    throw new Error(`Transaction failed: ${errorMessage}`);
  }
}

/**
 * Perform confidential transfer from (with operator permission)
 * @param from Sender address
 * @param to Recipient address
 * @param encryptedAmount Encrypted amount
 * @returns Transaction hash
 */
export async function confidentialTransferFrom(
  from: string,
  to: string,
  encryptedAmount: FhenixEncryptionResult
): Promise<string> {
  const contract = await getFHPAYContract();
  const inEuint64 = formatInEuint64(encryptedAmount.encryptedValue);

  // Simulate first
  try {
    await contract.confidentialTransferFrom.staticCall(from, to, inEuint64);
  } catch (error) {
    console.error("Transaction simulation failed:", error);
    throw new Error(`Transaction would fail: ${error}`);
  }

  const tx = await contract.confidentialTransferFrom(from, to, inEuint64);
  const receipt = await tx.wait();

  return tx.hash;
}

/**
 * Get indicated balance (public indicator, not actual encrypted balance)
 * WARNING: This is just an indicator (0.0000-0.9999), not the real balance!
 * @param account Account address
 * @returns Indicated balance (uint256)
 */
export async function getBalance(account: string): Promise<bigint> {
  const provider = getArbitrumSepoliaProvider();
  const contract = new ethers.Contract(FHPAY_ADDRESS, FHPAY_ABI.abi, provider);
  
  const balance = await contract.balanceOf(account);
  return BigInt(balance.toString());
}

/**
 * Get real encrypted balance and unseal it using already initialized cofhejs
 * @param account Account address
 * @param signer Signer for permit creation
 * @returns Real balance (bigint) or null if unsealing fails
 */
export async function getRealBalance(account: string, signer?: ethers.Signer): Promise<bigint | null> {
  const provider = getArbitrumSepoliaProvider();
  const contract = new ethers.Contract(FHPAY_ADDRESS, FHPAY_ABI.abi, provider);
  
  // Get encrypted balance
  const encBalance = await contract.confidentialBalanceOf(account);
  
  // If no signer provided, return null (can't unseal without permit)
  if (!signer) {
    return null;
  }
  
  try {
    // Use unsealValue from fhenixFhe.ts which uses already initialized cofhejs
    const { unsealValue } = await import("./fhenixFhe");
    const signerAddress = await signer.getAddress();
    const unsealed = await unsealValue(encBalance, signerAddress);
    
    if (unsealed === null) {
      return null;
    }
    
    return unsealed;
  } catch (error) {
    console.error("Error unsealing balance:", error);
    return null;
  }
}

/**
 * Get confidential balance (encrypted euint64 - requires decryption permission)
 * @param account Account address
 * @returns Encrypted balance handle (euint64)
 */
export async function getConfidentialBalance(account: string): Promise<bigint> {
  const provider = getArbitrumSepoliaProvider();
  const contract = new ethers.Contract(FHPAY_ADDRESS, FHPAY_ABI.abi, provider);
  
  const encBalance = await contract.confidentialBalanceOf(account);
  // This returns an euint64 handle, which needs to be unsealed client-side
  return BigInt(encBalance.toString());
}

/**
 * Get token metadata
 */
export async function getTokenInfo(): Promise<{
  name: string;
  symbol: string;
  decimals: number;
}> {
  const provider = getArbitrumSepoliaProvider();
  const contract = new ethers.Contract(FHPAY_ADDRESS, FHPAY_ABI.abi, provider);
  
  const [name, symbol, decimals] = await Promise.all([
    contract.name(),
    contract.symbol(),
    contract.decimals(),
  ]);
  
  return {
    name,
    symbol,
    decimals: Number(decimals),
  };
}

/**
 * Set operator permission for confidentialTransferFrom
 * @param operator Operator address
 * @param until Timestamp until which operator is valid (default: 1 year from now)
 */
export async function setOperator(
  operator: string,
  until?: number
): Promise<string> {
  const contract = await getFHPAYContract();
  
  const untilTimestamp = until || Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year default
  
  const tx = await contract.setOperator(operator, untilTimestamp);
  await tx.wait();
  
  return tx.hash;
}

/**
 * Dev mint function (owner only) - for testing purposes
 * @param to Recipient address
 * @param amount Amount in token units (will be multiplied by decimals)
 * @returns Transaction hash
 */
export async function devMint(
  to: string,
  amount: number
): Promise<string> {
  const contract = await getFHPAYContract();
  
  // Get decimals
  const decimals = await contract.decimals();
  const decimalsMultiplier = BigInt(10 ** Number(decimals));
  const amountInUnits = BigInt(Math.floor(amount * Number(decimalsMultiplier)));
  
  // Check if caller is owner
  const owner = await contract.owner();
  const signer = await getArbitrumSepoliaSigner();
  const caller = await signer.getAddress();
  
  if (caller.toLowerCase() !== owner.toLowerCase()) {
    throw new Error("Only contract owner can mint. Use devMintPlain function.");
  }
  
  // Simulate first
  try {
    await contract.devMintPlain.staticCall(to, amountInUnits);
  } catch (error) {
    console.error("Transaction simulation failed:", error);
    throw new Error(`Transaction would fail: ${error}`);
  }
  
  // Send transaction
  const tx = await contract.devMintPlain(to, amountInUnits);
  const receipt = await tx.wait();
  
  return tx.hash;
}

/**
 * Check if MetaMask is installed and connected
 */
export async function checkWalletConnection(): Promise<{
  isInstalled: boolean;
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
}> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    return {
      isInstalled: false,
      isConnected: false,
      account: null,
      chainId: null,
      isCorrectNetwork: false,
    };
  }

  try {
    const ethereum = (window as any).ethereum;
    const provider = new ethers.BrowserProvider(ethereum);
    const accounts = await provider.listAccounts();
    
    const isConnected = accounts.length > 0;
    const account = isConnected ? accounts[0].address : null;
    
    // Get chain ID directly from MetaMask (more reliable)
    let chainId: number;
    let chainIdHex: string;
    try {
      // Try to get chainId from ethereum provider directly
      chainIdHex = await ethereum.request({ method: "eth_chainId" });
      // Handle both string and number formats
      if (typeof chainIdHex === "string") {
        chainId = parseInt(chainIdHex, 16);
      } else {
        chainId = Number(chainIdHex);
      }
    } catch (err) {
      console.warn("Failed to get chainId from eth_chainId, trying getNetwork():", err);
      // Fallback to provider.getNetwork()
      const network = await provider.getNetwork();
      const chainIdBigInt = network.chainId;
      chainId = typeof chainIdBigInt === "bigint" ? Number(chainIdBigInt) : Number(chainIdBigInt);
      chainIdHex = `0x${chainId.toString(16)}`;
    }
    
    // Compare as both number and string to handle edge cases
    const isCorrectNetwork = chainId === ARBITRUM_SEPOLIA_CHAIN_ID || 
                            chainId.toString() === ARBITRUM_SEPOLIA_CHAIN_ID.toString() ||
                            chainIdHex?.toLowerCase() === `0x${ARBITRUM_SEPOLIA_CHAIN_ID.toString(16)}`.toLowerCase();
    
    // Debug logging
    console.log("🔍 Wallet connection check:", {
      chainId,
      chainIdType: typeof chainId,
      chainIdHex: chainIdHex || `0x${chainId.toString(16)}`,
      expectedChainId: ARBITRUM_SEPOLIA_CHAIN_ID,
      expectedChainIdHex: `0x${ARBITRUM_SEPOLIA_CHAIN_ID.toString(16)}`,
      isCorrectNetwork,
      account,
      isConnected,
      comparison: {
        number: chainId === ARBITRUM_SEPOLIA_CHAIN_ID,
        string: chainId.toString() === ARBITRUM_SEPOLIA_CHAIN_ID.toString(),
        hex: chainIdHex?.toLowerCase() === `0x${ARBITRUM_SEPOLIA_CHAIN_ID.toString(16)}`.toLowerCase(),
      },
    });
    
    return {
      isInstalled: true,
      isConnected,
      account,
      chainId,
      isCorrectNetwork,
    };
  } catch (error) {
    console.error("❌ Error checking wallet:", error);
    return {
      isInstalled: true,
      isConnected: false,
      account: null,
      chainId: null,
      isCorrectNetwork: false,
    };
  }
}

/**
 * Connect MetaMask wallet
 */
export async function connectWallet(): Promise<string> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
  }

  try {
    const accounts = await (window as any).ethereum.request({
      method: "eth_requestAccounts",
    });
    
    if (accounts.length === 0) {
      throw new Error("No accounts found. Please unlock MetaMask.");
    }
    
    return accounts[0];
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error("Please connect your MetaMask wallet to continue.");
    }
    throw error;
  }
}

/**
 * Request test tokens - mint directly from frontend using owner private key
 * WARNING: This uses private key in frontend - ONLY FOR TESTING!
 * @param userAddress User's wallet address to receive tokens
 * @param amount Amount of tokens to mint
 * @returns Transaction hash
 */
export async function requestTestTokens(
  userAddress: string,
  amount: number = 100
): Promise<{ txHash: string; success: boolean; message?: string }> {
  // Get private key from environment (must start with VITE_ to be accessible in frontend)
  const privateKey = import.meta.env.VITE_ARBITRUM_TREASURY_PRIVATE_KEY;
  
  if (!privateKey) {
    throw new Error(
      "VITE_ARBITRUM_TREASURY_PRIVATE_KEY is not set in environment variables. " +
      "Add it to your .env file (WARNING: This exposes private key in frontend - only for testing!)"
    );
  }

  try {
    // Create provider and wallet from private key
    const rpcUrl = FHENIX_CONFIG.arbitrumSepolia.rpcUrl;
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Create contract instance
    const contract = new ethers.Contract(FHPAY_ADDRESS, FHPAY_ABI.abi, wallet);
    
    // Verify we are the owner
    const owner = await contract.owner();
    const walletAddress = await wallet.getAddress();
    
    if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error(
        `Wallet address (${walletAddress}) is not the contract owner (${owner}). ` +
        "Only contract owner can mint tokens."
      );
    }
    
    // Get decimals
    const decimals = await contract.decimals();
    const decimalsMultiplier = BigInt(10 ** Number(decimals));
    const amountInUnits = BigInt(Math.floor(amount * Number(decimalsMultiplier)));
    
    console.log(`📝 Minting ${amount} FHPAY to ${userAddress}...`);
    
    // Check balance before mint
    const balanceBefore = await provider.getBalance(walletAddress);
    console.log(`   Wallet balance: ${ethers.formatEther(balanceBefore)} ETH`);
    
    if (balanceBefore < ethers.parseEther("0.001")) {
      throw new Error(
        "Insufficient ETH in treasury wallet for gas fees. " +
        "Please add some ETH to: " + walletAddress
      );
    }
    
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
    };
  } catch (error: any) {
    console.error("Mint error:", error);
    
    // Provide user-friendly error messages
    let errorMessage = "Failed to mint tokens";
    if (error.message.includes("insufficient funds")) {
      errorMessage = "Insufficient funds in treasury wallet for gas fees";
    } else if (error.message.includes("nonce")) {
      errorMessage = "Transaction nonce error. Please retry.";
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
}

