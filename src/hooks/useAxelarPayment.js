/**
 * useAxelarPayment Hook
 * Handles cross-chain stealth payments via Axelar GMP
 */

import { useState, useCallback, useEffect } from "react";
import { ethers } from "ethers";
import {
  estimateCrossChainGas,
  AXELAR_CHAINS,
  trackTransaction,
  parseTransactionStatus,
  getAxelarscanUrl,
} from "../lib/axelar";
import {
  generateEvmStealthAddress,
  generateEphemeralKeyPair,
  hexToBytes,
} from "../lib/evm/stealthAddress";

// Custom ITS tokens configuration (deployed via Axelar ITS)
const ITS_TOKENS = {
  TUSDC: {
    symbol: "TUSDC",
    name: "Test USDC",
    decimals: 6,
    address: "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B",
    tokenManagerAddress: "0x1e2f2E68ea65212Ec6F3D91f39E6B644fE41e29B",
    deployedChains: ["ethereum-sepolia", "base-sepolia"],
  },
};

// ITS Contract address (same on all chains)
const ITS_ADDRESS = "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C";

// ITS Contract ABI for interchain transfers
const ITS_ABI = [
  "function interchainTransfer(bytes32 tokenId, string calldata destinationChain, bytes calldata destinationAddress, uint256 amount, bytes calldata metadata, uint256 gasValue) external payable",
  "function interchainTokenId(address tokenAddress) external view returns (bytes32)",
];

// Token Manager ABI to get tokenId
const TOKEN_MANAGER_ABI = [
  "function interchainTokenId() external view returns (bytes32)",
];

/**
 * Check if token is a custom ITS token
 */
function isITSToken(symbol) {
  return !!ITS_TOKENS[symbol];
}

/**
 * Get ITS token config
 */
function getITSTokenConfig(symbol) {
  return ITS_TOKENS[symbol] || null;
}

/**
 * Get ITS token address (same on all chains)
 */
function getITSTokenAddress(symbol) {
  return ITS_TOKENS[symbol]?.address || null;
}

// ABI for AxelarStealthBridge contract (must match contract signature)
const AXELAR_STEALTH_BRIDGE_ABI = [
  "function sendCrossChainStealthPayment(string destinationChain, address stealthAddress, bytes ephemeralPubKey, bytes1 viewHint, uint32 k, string symbol, uint256 amount) external payable",
  "function sendCrossChainStealthPaymentITS(string destinationChain, address stealthAddress, bytes ephemeralPubKey, bytes1 viewHint, uint32 k, bytes32 tokenId, uint256 amount) external payable",
  "function gateway() external view returns (address)",
  "function gatewayWithToken() external view returns (address)",
  "event CrossChainStealthPaymentSent(string indexed destinationChain, address indexed sender, address stealthAddress, uint256 amount, string symbol, bytes32 paymentId)",
];

// ERC20 ABI for token approval
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)",
  "function decimals() external view returns (uint8)",
];

// Gateway ABI for token addresses
const GATEWAY_ABI = [
  "function tokenAddresses(string symbol) external view returns (address)",
];

// Transaction status states
export const TX_STATUS = {
  IDLE: "idle",
  PREPARING: "preparing",
  ESTIMATING_GAS: "estimating_gas",
  APPROVING: "approving",
  SENDING: "sending",
  CONFIRMING: "confirming",
  BRIDGING: "bridging",
  COMPLETE: "complete",
  FAILED: "failed",
};

/**
 * Hook for cross-chain stealth payments via Axelar
 */
export function useAxelarPayment() {
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState(TX_STATUS.IDLE);
  const [txHash, setTxHash] = useState(null);
  const [error, setError] = useState(null);
  const [gasEstimate, setGasEstimate] = useState(null);
  const [bridgeStatus, setBridgeStatus] = useState(null);

  // Poll for bridge status when we have a txHash
  // Uses adaptive polling: starts at 5s, increases to 15s after 2 minutes
  useEffect(() => {
    let interval;
    let pollCount = 0;
    const MAX_POLLS = 60; // Stop after ~10-15 minutes
    const INITIAL_INTERVAL = 5000; // 5 seconds initially
    const EXTENDED_INTERVAL = 15000; // 15 seconds after a while

    if (txHash && txStatus === TX_STATUS.BRIDGING) {
      const pollStatus = async () => {
        try {
          pollCount++;
          const status = await trackTransaction(txHash);
          setBridgeStatus(status);

          console.log(`[Poll ${pollCount}] Status:`, status.statusLabel, status.message);

          // Use normalized response properties
          if (status.isComplete) {
            setTxStatus(TX_STATUS.COMPLETE);
            clearInterval(interval);
            console.log("Transaction completed:", status.isExpressExecuted ? "Express" : "Standard");
          } else if (status.isFailed) {
            setTxStatus(TX_STATUS.FAILED);
            setError(
              status.message ||
              "Transaction execution was reverted. " +
              "Please check the implementation of the destination contract's _execute function."
            );
            clearInterval(interval);
          } else if (status.isInsufficientFee) {
            setTxStatus(TX_STATUS.FAILED);
            setError(
              "NOT ENOUGH GAS - Insufficient gas for executing the transaction. " +
              "You can add more gas using the recovery function on Axelarscan."
            );
            clearInterval(interval);
          }

          // Switch to slower polling after 2 minutes (24 polls at 5s)
          if (pollCount === 24 && interval) {
            clearInterval(interval);
            interval = setInterval(pollStatus, EXTENDED_INTERVAL);
            console.log("Switching to extended polling interval (15s)");
          }

          // Stop polling after max attempts
          if (pollCount >= MAX_POLLS) {
            clearInterval(interval);
            console.log("Max polling attempts reached. Check Axelarscan for status.");
          }
        } catch (err) {
          console.error("Error polling status:", err);
          // Continue polling on transient errors, but log count
          if (pollCount >= MAX_POLLS) {
            clearInterval(interval);
          }
        }
      };

      // Start polling immediately, then at regular intervals
      pollStatus();
      interval = setInterval(pollStatus, INITIAL_INTERVAL);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [txHash, txStatus]);

  /**
   * Estimate gas for a cross-chain payment
   */
  const estimateGas = useCallback(
    async ({ sourceChain, destinationChain }) => {
      try {
        const estimate = await estimateCrossChainGas({
          sourceChain,
          destinationChain,
          gasLimit: 350000, // Higher limit for stealth payment execution
        });

        setGasEstimate(estimate);
        return estimate;
      } catch (err) {
        console.error("Gas estimation failed:", err);
        throw err;
      }
    },
    []
  );

  /**
   * Send a cross-chain stealth payment
   */
  const sendCrossChainPayment = useCallback(
    async ({
      sourceChain,
      destinationChain,
      recipientMetaAddress,
      directAddress, // For direct transfers without stealth
      amount,
      tokenSymbol,
      signer,
    }) => {
      setLoading(true);
      setError(null);
      setTxHash(null);
      setBridgeStatus(null);

      try {
        // Validate inputs
        if (!sourceChain || !destinationChain) {
          throw new Error("Source and destination chains are required");
        }
        if (!directAddress && (!recipientMetaAddress?.spendPubKey || !recipientMetaAddress?.viewingPubKey)) {
          throw new Error("Valid recipient meta address or direct address is required");
        }
        if (!amount || amount <= 0) {
          throw new Error("Amount must be greater than 0");
        }

        const srcChainConfig = AXELAR_CHAINS[sourceChain];
        const dstChainConfig = AXELAR_CHAINS[destinationChain];

        if (!srcChainConfig || !dstChainConfig) {
          throw new Error("Invalid chain configuration");
        }

        let stealthAddress, ephemeralPubKey, viewHint, k;

        // Step 1: Generate stealth address OR use direct address
        setTxStatus(TX_STATUS.PREPARING);

        if (directAddress) {
          // Direct transfer mode - no stealth address generation
          console.log("Using direct transfer to:", directAddress);
          stealthAddress = directAddress;
          ephemeralPubKey = "0x" + "00".repeat(33); // Placeholder
          viewHint = "0x" + "00".repeat(32); // Placeholder
          k = 0;
        } else {
          // Stealth mode - generate stealth address
          console.log("Generating stealth address for recipient...");
          const ephemeralKeyPair = generateEphemeralKeyPair();
          const result = generateEvmStealthAddress(
            recipientMetaAddress.spendPubKey,
            recipientMetaAddress.viewingPubKey,
            hexToBytes(ephemeralKeyPair.privateKey),
            0
          );
          stealthAddress = result.stealthAddress;
          ephemeralPubKey = result.ephemeralPubKey;
          viewHint = result.viewHint;
          k = result.k;
        }

        console.log("Stealth address generated:", stealthAddress);
        console.log("Stealth address type:", typeof stealthAddress);
        console.log("Stealth address length:", stealthAddress ? stealthAddress.length : "undefined");

        // Step 2: Estimate gas
        setTxStatus(TX_STATUS.ESTIMATING_GAS);
        console.log("Estimating cross-chain gas...");

        const gasFee = await estimateCrossChainGas({
          sourceChain,
          destinationChain,
          gasLimit: 350000,
        });

        console.log("Gas fee estimated:", ethers.formatEther(gasFee), "ETH");

        // Step 3: Get contract instances
        const bridgeAddress = srcChainConfig.stealthBridge || import.meta.env.VITE_AXELAR_BRIDGE_ADDRESS;
        if (!bridgeAddress) {
          throw new Error(`Axelar bridge address not configured for ${srcChainConfig.name}`);
        }

        const bridgeContract = new ethers.Contract(
          bridgeAddress,
          AXELAR_STEALTH_BRIDGE_ABI,
          signer
        );

        // Get token address - check ITS tokens first, then gateway
        let tokenAddress;

        if (isITSToken(tokenSymbol)) {
          // ITS tokens have the same address on all chains
          tokenAddress = getITSTokenAddress(tokenSymbol);
          console.log(`ITS Token ${tokenSymbol} at ${tokenAddress}`);
        } else {
          // For gateway tokens, query the gateway contract
          const gatewayAddress = await bridgeContract.gateway();
          const gatewayContract = new ethers.Contract(
            gatewayAddress,
            GATEWAY_ABI,
            signer
          );
          tokenAddress = await gatewayContract.tokenAddresses(tokenSymbol);
          if (tokenAddress === ethers.ZeroAddress) {
            throw new Error(
              `Token ${tokenSymbol} is not supported on ${srcChainConfig.name}. ` +
              `Please select a different token or verify the gateway configuration.`
            );
          }
          console.log(`Gateway Token ${tokenSymbol} verified at ${tokenAddress}`);
        }

        // Step 4: Check and approve token spending
        setTxStatus(TX_STATUS.APPROVING);
        console.log("Checking token allowance...");

        const tokenContract = new ethers.Contract(
          tokenAddress,
          ERC20_ABI,
          signer
        );

        const signerAddress = await signer.getAddress();
        const decimals = await tokenContract.decimals();
        const amountInWei = ethers.parseUnits(amount.toString(), decimals);

        // Check balance
        const balance = await tokenContract.balanceOf(signerAddress);
        if (balance < amountInWei) {
          const balanceFormatted = ethers.formatUnits(balance, decimals);
          throw new Error(
            `Insufficient ${tokenSymbol} balance. ` +
            `Required: ${amount}, Available: ${balanceFormatted}`
          );
        }

        // Step 5: Send cross-chain payment
        setTxStatus(TX_STATUS.SENDING);

        let tx;

        if (isITSToken(tokenSymbol)) {
          // === STEALTH TRANSFER FOR ITS TOKENS (via Bridge) ===
          console.log("Using Bridge ITS function for stealth transfer...");

          const itsConfig = getITSTokenConfig(tokenSymbol);

          // Get tokenId from token manager
          const tokenManager = new ethers.Contract(
            itsConfig.tokenManagerAddress,
            TOKEN_MANAGER_ABI,
            signer
          );
          const tokenId = await tokenManager.interchainTokenId();
          console.log("Token ID:", tokenId);

          // Approve ITS to spend tokens (Bridge will call ITS, so we approve Bridge?)
          // Wait! The Bridge transfers tokens from User to Bridge, then Bridge approves ITS.
          // So User must approve Bridge.

          const currentAllowance = await tokenContract.allowance(signerAddress, bridgeAddress);
          if (currentAllowance < amountInWei) {
            console.log("Approving Bridge to spend tokens...");
            const approveTx = await tokenContract.approve(bridgeAddress, amountInWei);
            await approveTx.wait();
            console.log("Bridge approval confirmed");
          }

          // Convert ephemeralPubKey to bytes
          const ephemeralPubKeyHex = ephemeralPubKey.startsWith("0x") ? ephemeralPubKey : "0x" + ephemeralPubKey;
          const ephemeralPubKeyBytes = ethers.getBytes(ephemeralPubKeyHex);
          const viewHintHex = viewHint.startsWith("0x") ? viewHint : "0x" + viewHint;
          const viewHintByte = viewHintHex.slice(0, 4);

          console.log("Calling sendCrossChainStealthPaymentITS...");

          tx = await bridgeContract.sendCrossChainStealthPaymentITS(
            dstChainConfig.axelarName,
            stealthAddress,
            ephemeralPubKeyBytes,
            viewHintByte,
            k,
            tokenId,
            amountInWei,
            { value: gasFee }
          );

        } else {
          // === GMP TOKEN TRANSFER (via Bridge) ===
          console.log("Using GMP Bridge for cross-chain transfer...");

          // Check allowance for bridge
          const currentAllowance = await tokenContract.allowance(signerAddress, bridgeAddress);
          if (currentAllowance < amountInWei) {
            console.log("Approving token spending...");
            const approveTx = await tokenContract.approve(bridgeAddress, amountInWei);
            await approveTx.wait();
            console.log("Token approval confirmed");
          }

          // Convert ephemeralPubKey to bytes
          const ephemeralPubKeyHex = ephemeralPubKey.startsWith("0x") ? ephemeralPubKey : "0x" + ephemeralPubKey;
          const ephemeralPubKeyBytes = ethers.getBytes(ephemeralPubKeyHex);
          const viewHintHex = viewHint.startsWith("0x") ? viewHint : "0x" + viewHint;
          const viewHintByte = viewHintHex.slice(0, 4);

          tx = await bridgeContract.sendCrossChainStealthPayment(
            dstChainConfig.axelarName,
            stealthAddress,
            ephemeralPubKeyBytes,
            viewHintByte,
            k,
            tokenSymbol,
            amountInWei,
            { value: gasFee }
          );
        }

        console.log("Transaction sent:", tx.hash);
        setTxHash(tx.hash);

        // Step 6: Wait for source chain confirmation
        setTxStatus(TX_STATUS.CONFIRMING);
        console.log("Waiting for confirmation...");

        const receipt = await tx.wait();
        console.log("Transaction confirmed on source chain");

        // Step 7: Track cross-chain execution
        setTxStatus(TX_STATUS.BRIDGING);
        console.log("Bridging in progress...");

        return {
          success: true,
          txHash: receipt.hash,
          stealthAddress,
          ephemeralPubKey,
          viewHint,
          k,
          sourceChain,
          destinationChain,
          amount,
          tokenSymbol,
          axelarscanUrl: getAxelarscanUrl(receipt.hash),
        };
      } catch (err) {
        console.error("Cross-chain payment failed:", err);

        // Enhanced error messages matching Axelar patterns
        let errorMessage = err.message || "Transaction failed";

        // Check for common Axelar error patterns
        if (err.message?.includes("insufficient funds")) {
          errorMessage = "Insufficient funds for gas payment. Please ensure you have enough native tokens.";
        } else if (err.message?.includes("user rejected")) {
          errorMessage = "Transaction rejected by user";
        } else if (err.message?.includes("nonce")) {
          errorMessage = "Nonce Expired - Please try again";
        } else if (err.message?.includes("gas")) {
          errorMessage = "NOT ENOUGH GAS - " + err.message;
        } else if (err.message?.includes("revert")) {
          errorMessage = "Transaction execution was reverted. Please check the contract implementation.";
        }

        setError(errorMessage);
        setTxStatus(TX_STATUS.FAILED);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Reset the hook state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setTxStatus(TX_STATUS.IDLE);
    setTxHash(null);
    setError(null);
    setGasEstimate(null);
    setBridgeStatus(null);
  }, []);

  /**
   * Get human-readable status
   */
  const getStatusLabel = useCallback(() => {
    const statusLabels = {
      [TX_STATUS.IDLE]: "Ready",
      [TX_STATUS.PREPARING]: "Preparing payment...",
      [TX_STATUS.ESTIMATING_GAS]: "Estimating gas fees...",
      [TX_STATUS.APPROVING]: "Approving token...",
      [TX_STATUS.SENDING]: "Sending transaction...",
      [TX_STATUS.CONFIRMING]: "Confirming on source chain...",
      [TX_STATUS.BRIDGING]: "Bridging to destination...",
      [TX_STATUS.COMPLETE]: "Payment complete!",
      [TX_STATUS.FAILED]: "Payment failed",
    };
    return statusLabels[txStatus] || txStatus;
  }, [txStatus]);

  return {
    // Actions
    sendCrossChainPayment,
    estimateGas,
    reset,

    // State
    loading,
    txStatus,
    txHash,
    error,
    gasEstimate,
    bridgeStatus,

    // Helpers
    getStatusLabel,
    isComplete: txStatus === TX_STATUS.COMPLETE,
    isFailed: txStatus === TX_STATUS.FAILED,
    isProcessing: loading || [
      TX_STATUS.PREPARING,
      TX_STATUS.ESTIMATING_GAS,
      TX_STATUS.APPROVING,
      TX_STATUS.SENDING,
      TX_STATUS.CONFIRMING,
      TX_STATUS.BRIDGING,
    ].includes(txStatus),
  };
}

export default useAxelarPayment;
