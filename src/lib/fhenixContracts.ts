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
 */
function formatInEuint64(encryptedValue: unknown): {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: string;
} {
  // CoFHE returns encrypted value in a specific format
  // We need to extract ctHash, securityZone, utype, and signature
  if (encryptedValue && typeof encryptedValue === "object") {
    const enc = encryptedValue as any;
    
    // Try to extract from cofhejs format
    if (enc.ctHash !== undefined) {
      return {
        ctHash: BigInt(enc.ctHash),
        securityZone: enc.securityZone || 0,
        utype: enc.utype || 0,
        signature: enc.signature || "0x",
      };
    }
    
    // Fallback: construct from data if available
    if (enc.data) {
      const dataBytes = enc.data instanceof Uint8Array 
        ? Array.from(enc.data) 
        : Array.isArray(enc.data) 
          ? enc.data 
          : [];
      
      // Simple hash for ctHash (in production, use proper Poseidon hash)
      let ctHash = BigInt(0);
      for (let i = 0; i < Math.min(32, dataBytes.length); i++) {
        ctHash = (ctHash << BigInt(8)) | BigInt(dataBytes[i] || 0);
      }
      
      return {
        ctHash,
        securityZone: enc.securityZone || 0,
        utype: enc.utype || 0,
        signature: enc.signature || "0x",
      };
    }
  }
  
  // Default fallback
  return {
    ctHash: BigInt(0),
    securityZone: 0,
    utype: 0,
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

  // Format encrypted value as InEuint64 tuple
  const inEuint64 = formatInEuint64(encryptedAmount.encryptedValue);

  // Simulate transaction first
  try {
    await contract.confidentialTransfer.staticCall(to, inEuint64);
  } catch (error) {
    console.error("Transaction simulation failed:", error);
    throw new Error(`Transaction would fail: ${error}`);
  }

  // Send transaction
  const tx = await contract.confidentialTransfer(to, inEuint64);
  console.log("Transaction sent:", tx.hash);

  // Wait for confirmation
  const receipt = await tx.wait();
  console.log("Transaction confirmed:", receipt);

  return tx.hash;
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
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const accounts = await provider.listAccounts();
    const network = await provider.getNetwork();
    
    const isConnected = accounts.length > 0;
    const account = isConnected ? accounts[0].address : null;
    const chainId = Number(network.chainId);
    const isCorrectNetwork = chainId === ARBITRUM_SEPOLIA_CHAIN_ID;
    
    return {
      isInstalled: true,
      isConnected,
      account,
      chainId,
      isCorrectNetwork,
    };
  } catch (error) {
    console.error("Error checking wallet:", error);
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
 * Request test tokens from backend
 * Backend will mint tokens using owner wallet and send to user
 * @param userAddress User's wallet address
 * @param amount Amount of tokens to request
 * @returns Transaction hash from backend
 */
export async function requestTestTokens(
  userAddress: string,
  amount: number = 100
): Promise<{ txHash: string; success: boolean; message?: string }> {
  const apiUrl = import.meta.env.VITE_FHENIX_API_URL || "http://localhost:3001/api/fhenix";
  
  try {
    const response = await fetch(`${apiUrl}/mint`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        address: userAddress,
        amount: amount,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return {
      txHash: data.txHash,
      success: true,
      message: data.message,
    };
  } catch (error: any) {
    console.error("Request test tokens error:", error);
    throw new Error(error.message || "Failed to request test tokens");
  }
}

