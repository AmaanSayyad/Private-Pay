/**
 * Aptos Integration Library
 * Handles Aptos wallet connections and transactions
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

// Re-export stealth address functions for convenience
export {
  generateStealthAddress,
  generateEphemeralKeyPair,
  generateMetaAddressKeys,
  validatePublicKey,
  hexToBytes as hexToBytesFromStealth,
} from "./aptos/stealthAddress.js";

// Aptos Module Address
export const APTOS_MODULE_ADDRESS = import.meta.env.VITE_APTOS_MODULE_ADDRESS || 
  "0x86c46b435a128d6344d42e832ef22066133d39a8a1f8e42b02107b8b246e280c";

// Initialize Aptos client
export const getAptosClient = (isTestnet = true) => {
  const config = new AptosConfig({
    network: isTestnet ? Network.TESTNET : Network.MAINNET,
  });
  return new Aptos(config);
};

/**
 * Connect to Aptos wallet (Petra, Martian, etc.)
 * Returns account address
 */
export const connectAptosWallet = async () => {
  try {
    if (typeof window === "undefined" || !window.aptos) {
      throw new Error("Aptos wallet not found. Please install Petra wallet.");
    }

    const response = await window.aptos.connect();
    return response.address;
  } catch (error) {
    console.error("Error connecting Aptos wallet:", error);
    throw error;
  }
};

/**
 * Disconnect Aptos wallet
 */
export const disconnectAptosWallet = async () => {
  try {
    if (typeof window !== "undefined" && window.aptos) {
      await window.aptos.disconnect();
    }
  } catch (error) {
    console.error("Error disconnecting Aptos wallet:", error);
  }
};

/**
 * Get Aptos account address
 */
export const getAptosAccountAddress = async () => {
  try {
    if (typeof window === "undefined" || !window.aptos) {
      return null;
    }

    const account = await window.aptos.account();
    return account.address;
  } catch (error) {
    console.error("Error getting Aptos account:", error);
    return null;
  }
};

/**
 * Sign and submit transaction
 */
export const signAndSubmitTransaction = async ({
  accountAddress,
  functionName,
  functionArguments,
  typeArguments = [],
  isTestnet = true,
}) => {
  try {
    if (typeof window === "undefined" || !window.aptos) {
      throw new Error("Aptos wallet not found");
    }

    // Use provided typeArguments or default based on function name
    const typeArgs = typeArguments.length > 0 
      ? typeArguments
      : (functionName.includes("send_private_payment") 
          ? ["0x1::aptos_coin::AptosCoin"]
          : []);

    const transaction = {
      type: "entry_function_payload",
      function: `${APTOS_MODULE_ADDRESS}::${functionName}`,
      arguments: functionArguments,
      type_arguments: typeArgs,
    };

    console.log("Transaction payload:", JSON.stringify(transaction, null, 2));
    
    const response = await window.aptos.signAndSubmitTransaction(transaction);
    
    // Wait for transaction
    const aptos = getAptosClient(isTestnet);
    const executedTxn = await aptos.waitForTransaction({
      transactionHash: response.hash,
    });

    return {
      hash: response.hash,
      success: executedTxn.success,
      explorerUrl: `https://explorer.aptoslabs.com/txn/${response.hash}?network=${isTestnet ? "testnet" : "mainnet"}`,
    };
  } catch (error) {
    console.error("Error signing transaction:", error);
    throw error;
  }
};

/**
 * Register meta address on Aptos
 */
export const registerAptosMetaAddress = async ({
  accountAddress,
  spendPubKey,
  viewingPubKey,
  isTestnet = true,
}) => {
  // Convert hex strings to Uint8Array
  const spendPubKeyBytes = hexToBytes(spendPubKey);
  const viewingPubKeyBytes = hexToBytes(viewingPubKey);

  return await signAndSubmitTransaction({
    accountAddress,
    functionName: "payment_manager::register_for_payments",
    functionArguments: [spendPubKeyBytes, viewingPubKeyBytes],
    isTestnet,
  });
};

/**
 * Send stealth payment on Aptos
 */
export const sendAptosStealthPayment = async ({
  accountAddress,
  recipientAddress,
  recipientMetaIndex,
  amount,
  k,
  ephemeralPubKey,
  stealthAddress,
  isTestnet = true,
}) => {
  // Convert ephemeralPubKey from hex string to Uint8Array (vector<u8>)
  const ephemeralPubKeyBytes = hexToBytes(ephemeralPubKey);
  
  // stealthAddress should be a string (address format), not bytes
  // Ensure it starts with 0x and is the correct format
  const stealthAddressStr = stealthAddress.startsWith("0x") 
    ? stealthAddress 
    : `0x${stealthAddress}`;

  return await signAndSubmitTransaction({
    accountAddress,
    functionName: "payment_manager::send_private_payment",
    functionArguments: [
      recipientAddress,        // address (string)
      recipientMetaIndex,       // u64 (number)
      amount,                   // u64 (number)
      k,                        // u32 (number)
      ephemeralPubKeyBytes,     // vector<u8> (Uint8Array/Array)
      stealthAddressStr,        // address (string)
    ],
    typeArguments: ["0x1::aptos_coin::AptosCoin"],
    isTestnet,
  });
};

/**
 * Helper: Convert hex string to Array (for Aptos Move vector<u8>)
 */
export const hexToBytes = (hex) => {
  if (!hex || typeof hex !== 'string') {
    throw new Error('Invalid hex string');
  }
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) {
    throw new Error('Hex string must have even length');
  }
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
  }
  return Array.from(bytes);
};

/**
 * Get account balance
 */
export const getAptosBalance = async (accountAddress, isTestnet = true) => {
  try {
    const aptos = getAptosClient(isTestnet);
    const balance = await aptos.getAccountAPTAmount({ accountAddress });
    return balance;
  } catch (error) {
    console.error("Error getting Aptos balance:", error);
    return 0;
  }
};

/**
 * Get meta address from blockchain (no backend needed)
 */
export const getAptosMetaAddressFromChain = async ({
  accountAddress,
  index = 0,
  isTestnet = true,
}) => {
  try {
    const aptos = getAptosClient(isTestnet);
    const resource = await aptos.getAccountResource({
      accountAddress,
      resourceType: `${APTOS_MODULE_ADDRESS}::stealth_address::PaymentRegistry`,
    });

    if (!resource || !resource.meta_addresses || index >= resource.meta_addresses.length) {
      throw new Error("Meta address not found");
    }

    const metaAddress = resource.meta_addresses[index];
    
    // Convert bytes to hex
    const bytesToHex = (bytes) => {
      if (typeof bytes === "string") return bytes;
      return "0x" + Array.from(bytes)
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
    };

    return {
      spendPubKey: bytesToHex(metaAddress.spend_pub_key),
      viewingPubKey: bytesToHex(metaAddress.viewing_pub_key),
    };
  } catch (error) {
    console.error("Error getting meta address from chain:", error);
    throw error;
  }
};

/**
 * Send normal APT transfer (to treasury or any address)
 */
export const sendAptTransfer = async ({
  accountAddress,
  recipientAddress,
  amount,
  isTestnet = true,
}) => {
  try {
    if (typeof window === "undefined" || !window.aptos) {
      throw new Error("Aptos wallet not found");
    }

    // Convert amount to octas (1 APT = 100000000 octas)
    const amountInOctas = Math.floor(amount * 100000000);

    const transaction = {
      type: "entry_function_payload",
      function: "0x1::coin::transfer",
      type_arguments: ["0x1::aptos_coin::AptosCoin"],
      arguments: [recipientAddress, amountInOctas.toString()],
    };

    console.log("Transfer transaction:", JSON.stringify(transaction, null, 2));
    
    const response = await window.aptos.signAndSubmitTransaction(transaction);
    
    // Wait for transaction
    const aptos = getAptosClient(isTestnet);
    const executedTxn = await aptos.waitForTransaction({
      transactionHash: response.hash,
    });

    return {
      hash: response.hash,
      success: executedTxn.success,
      explorerUrl: `https://explorer.aptoslabs.com/txn/${response.hash}?network=${isTestnet ? "testnet" : "mainnet"}`,
    };
  } catch (error) {
    console.error("Error sending APT transfer:", error);
    throw error;
  }
};

