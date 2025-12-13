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
  generateStealthAddress,
  generateEphemeralKeyPair,
  hexToBytes,
} from "../lib/aptos/stealthAddress";

// ABI for AxelarStealthBridge contract (must match contract signature)
const AXELAR_STEALTH_BRIDGE_ABI = [
  "function sendCrossChainStealthPayment(string destinationChain, address stealthAddress, bytes ephemeralPubKey, bytes1 viewHint, uint32 k, string symbol, uint256 amount) external payable",
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
  useEffect(() => {
    let interval;
    if (txHash && txStatus === TX_STATUS.BRIDGING) {
      interval = setInterval(async () => {
        try {
          const status = await trackTransaction(txHash);
          setBridgeStatus(status);

          if (status?.status === "executed") {
            setTxStatus(TX_STATUS.COMPLETE);
            clearInterval(interval);
          } else if (status?.status === "error") {
            setTxStatus(TX_STATUS.FAILED);
            setError("Cross-chain execution failed");
            clearInterval(interval);
          }
        } catch (err) {
          console.error("Error polling status:", err);
        }
      }, 10000); // Poll every 10 seconds
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
          const result = generateStealthAddress(
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
        const bridgeAddress = import.meta.env.VITE_AXELAR_BRIDGE_ADDRESS;
        if (!bridgeAddress) {
          throw new Error("Axelar bridge address not configured");
        }

        const bridgeContract = new ethers.Contract(
          bridgeAddress,
          AXELAR_STEALTH_BRIDGE_ABI,
          signer
        );

        // Get gateway address and token address
        const gatewayAddress = await bridgeContract.gateway();
        const gatewayContract = new ethers.Contract(
          gatewayAddress,
          GATEWAY_ABI,
          signer
        );

        const tokenAddress = await gatewayContract.tokenAddresses(tokenSymbol);
        if (tokenAddress === ethers.ZeroAddress) {
          throw new Error(`Token ${tokenSymbol} not supported on this chain`);
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
          throw new Error(`Insufficient ${tokenSymbol} balance`);
        }

        // Check allowance
        const currentAllowance = await tokenContract.allowance(
          signerAddress,
          bridgeAddress
        );

        if (currentAllowance < amountInWei) {
          console.log("Approving token spending...");
          const approveTx = await tokenContract.approve(
            bridgeAddress,
            amountInWei
          );
          await approveTx.wait();
          console.log("Token approval confirmed");
        }

        // Step 5: Send cross-chain payment
        setTxStatus(TX_STATUS.SENDING);
        console.log("Sending cross-chain stealth payment...");

        // Convert ephemeralPubKey to bytes
        const ephemeralPubKeyBytes = ethers.getBytes("0x" + ephemeralPubKey);
        const viewHintByte = ethers.getBytes("0x" + viewHint);

        // Contract uses trusted remotes mapping, no need to pass destination contract
        const tx = await bridgeContract.sendCrossChainStealthPayment(
          dstChainConfig.axelarName,
          stealthAddress,
          ephemeralPubKeyBytes,
          viewHintByte,
          k,
          tokenSymbol,
          amountInWei,
          { value: gasFee }
        );

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
        setError(err.message || "Transaction failed");
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
