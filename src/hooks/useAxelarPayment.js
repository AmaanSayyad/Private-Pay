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

// TUSDC addresses per chain (new deployments)
const TUSDC_ADDRESSES = {
  "base-sepolia": import.meta.env.VITE_AXELAR_TUSDC_ADDRESS_BASE_SEPOLIA || "0x2823Af7e1F2F50703eD9f81Ac4B23DC1E78B9E53",
  "arbitrum-sepolia": import.meta.env.VITE_AXELAR_TUSDC_ADDRESS_ARBITRUM_SEPOLIA || "0xd17beb0fE91B2aE5a57cE39D1c3D15AF1a968817",
  "ethereum-sepolia": "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B", // Old ITS token
  "polygon-sepolia": "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B", // Old ITS token
  "polygon-amoy": "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B", // Old ITS token
};

// Custom ITS tokens configuration (deployed via Axelar ITS)
const ITS_TOKENS = {
  TUSDC: {
    symbol: "TUSDC",
    name: "Test USDC",
    decimals: 6,
    // Chain-specific addresses for new deployments
    getAddress: (chainKey, axelarChainName) => {
      // Use axelarChainName if provided, otherwise construct from chainKey
      let chainName = axelarChainName;
      if (!chainName && chainKey) {
        chainName = chainKey.includes("sepolia") ? chainKey : `${chainKey}-sepolia`;
      }
      // Try to get chain-specific address
      if (chainName && TUSDC_ADDRESSES[chainName]) {
        return TUSDC_ADDRESSES[chainName];
      }
      // Fallback to ethereum-sepolia (old ITS token)
      return TUSDC_ADDRESSES["ethereum-sepolia"] || "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B";
    },
    // Legacy: same address for old ITS token (for backward compatibility)
    address: "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B",
    tokenManagerAddress: "0x1e2f2E68ea65212Ec6F3D91f39E6B644fE41e29B",
    deployedChains: ["ethereum-sepolia", "base-sepolia", "arbitrum-sepolia", "polygon-sepolia", "polygon-amoy"],
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

function getBridgeAddressForChainKey(chainKey, chainConfig) {
  const overrides = {
    base: import.meta.env.VITE_AXELAR_BRIDGE_ADDRESS_BASE_SEPOLIA,
    polygon: import.meta.env.VITE_AXELAR_BRIDGE_ADDRESS_POLYGON_SEPOLIA,
  };
  return (
    overrides[chainKey] ||
    chainConfig?.stealthBridge ||
    import.meta.env.VITE_AXELAR_BRIDGE_ADDRESS
  );
}

/**
 * Check if token is a custom ITS token
 * Note: New TUSDC deployments (Base/Arbitrum) are standard ERC20, not ITS tokens
 */
function isITSToken(symbol, chainKey = null, axelarChainName = null) {
  if (!ITS_TOKENS[symbol]) return false;
  
  // New TUSDC deployments on Base and Arbitrum are NOT ITS tokens
  if (symbol === "TUSDC") {
    // Use axelarChainName if provided, otherwise construct from chainKey
    let chainName = axelarChainName;
    if (!chainName && chainKey) {
      chainName = chainKey.includes("sepolia") ? chainKey : `${chainKey}-sepolia`;
    }
    
    console.log(`[isITSToken] TUSDC check - chainKey: ${chainKey}, axelarChainName: ${axelarChainName}, chainName: ${chainName}`);
    
    // Only Ethereum Sepolia and Polygon have ITS TUSDC
    if (chainName === "base-sepolia" || chainName === "arbitrum-sepolia") {
      console.log(`[isITSToken] TUSDC on ${chainName} is NOT an ITS token (new deployment)`);
      return false; // New deployments are standard ERC20
    }
    // Ethereum Sepolia and Polygon use old ITS token
    console.log(`[isITSToken] TUSDC on ${chainName} IS an ITS token (old deployment)`);
    return true;
  }
  
  return true;
}

/**
 * Get ITS token config
 */
function getITSTokenConfig(symbol) {
  return ITS_TOKENS[symbol] || null;
}

/**
 * Get ITS token address (chain-specific for new deployments)
 */
function getITSTokenAddress(symbol, chainKey = null, axelarChainName = null) {
  const token = ITS_TOKENS[symbol];
  if (!token) return null;
  
  // Use getAddress function if available (for chain-specific addresses)
  if (typeof token.getAddress === 'function') {
    return token.getAddress(chainKey, axelarChainName);
  }
  
  // Fallback to static address
  return token.address || null;
}

// ABI for AxelarStealthBridge contract (must match contract signature)
const AXELAR_STEALTH_BRIDGE_ABI = [
  "function sendCrossChainStealthPayment(string destinationChain, address stealthAddress, bytes ephemeralPubKey, bytes1 viewHint, uint32 k, string symbol, uint256 amount) external payable",
  "function sendCrossChainStealthPaymentITS(string destinationChain, address stealthAddress, bytes ephemeralPubKey, bytes1 viewHint, uint32 k, bytes32 tokenId, uint256 amount) external payable",
  "function sendCrossChainStealthPaymentCustomToken(string destinationChain, address stealthAddress, bytes ephemeralPubKey, bytes1 viewHint, uint32 k, address sourceTokenAddress, address destinationTokenAddress, uint256 amount) external payable",
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
    async ({ sourceChain, destinationChain, tokenSymbol = null }) => {
      try {
        const baseMultiplier =
          Number(import.meta.env.VITE_AXELAR_GAS_MULTIPLIER) ||
          (import.meta.env.VITE_NETWORK === "mainnet" ? 1.1 : 1.8);
        const itsMultiplier =
          Number(import.meta.env.VITE_AXELAR_ITS_GAS_MULTIPLIER) ||
          (import.meta.env.VITE_NETWORK === "mainnet" ? 1.2 : 3.0);
        const axelarChainName = srcChainConfig.axelarName || sourceChain;
        const gasMultiplier = isITSToken(tokenSymbol, sourceChain, axelarChainName) ? itsMultiplier : baseMultiplier;

        const estimate = await estimateCrossChainGas({
          sourceChain,
          destinationChain,
          gasLimit: 350000, // Higher limit for stealth payment execution
          gasMultiplier,
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

        const baseMultiplier =
          Number(import.meta.env.VITE_AXELAR_GAS_MULTIPLIER) ||
          (import.meta.env.VITE_NETWORK === "mainnet" ? 1.1 : 1.8);
        const itsMultiplier =
          Number(import.meta.env.VITE_AXELAR_ITS_GAS_MULTIPLIER) ||
          (import.meta.env.VITE_NETWORK === "mainnet" ? 1.2 : 3.0);
        const axelarChainName = srcChainConfig.axelarName || sourceChain;
        const gasMultiplier = isITSToken(tokenSymbol, sourceChain, axelarChainName) ? itsMultiplier : baseMultiplier;

        const minGasFeeWei = (() => {
          const raw = isITSToken(tokenSymbol, sourceChain, axelarChainName)
            ? import.meta.env.VITE_AXELAR_MIN_GAS_FEE_WEI_ITS
            : import.meta.env.VITE_AXELAR_MIN_GAS_FEE_WEI;
          if (!raw) return 0n;
          try {
            return BigInt(String(raw));
          } catch {
            return 0n;
          }
        })();

        const estimatedGasFeeWei = await estimateCrossChainGas({
          sourceChain,
          destinationChain,
          gasLimit: 350000,
          gasMultiplier,
        });
        const gasFeeWei = (() => {
          try {
            const n = BigInt(String(estimatedGasFeeWei));
            return n > minGasFeeWei ? n : minGasFeeWei;
          } catch {
            return minGasFeeWei || BigInt(estimatedGasFeeWei);
          }
        })();

        console.log("Gas fee estimated:", ethers.formatEther(gasFeeWei), "ETH");

        // Step 3: Get contract instances
        const bridgeAddress = getBridgeAddressForChainKey(sourceChain, srcChainConfig);
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

        // axelarChainName is already defined above (line 364)
        if (isITSToken(tokenSymbol, sourceChain, axelarChainName)) {
          // ITS tokens - use chain-specific address for new deployments
          tokenAddress = getITSTokenAddress(tokenSymbol, sourceChain, axelarChainName);
          console.log(`ITS Token ${tokenSymbol} at ${tokenAddress} on ${axelarChainName}`);
        } else {
          // For gateway tokens or new TUSDC deployments (standard ERC20)
          // New TUSDC deployments are not in gateway, so use direct address
          if (tokenSymbol === "TUSDC") {
            // Use chain-specific TUSDC address (already deployed)
            tokenAddress = getITSTokenAddress(tokenSymbol, sourceChain, axelarChainName);
            console.log(`TUSDC Token (standard ERC20) at ${tokenAddress} on ${axelarChainName}`);
          } else {
            // For other gateway tokens, query the gateway contract
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

        // Check if this is a real ITS token (not new TUSDC deployments)
        const isRealITSToken = isITSToken(tokenSymbol, sourceChain, axelarChainName);
        console.log(`Token ${tokenSymbol} on ${axelarChainName}: isITSToken=${isRealITSToken}`);

        if (isRealITSToken) {
          // === STEALTH TRANSFER FOR ITS TOKENS (via Bridge) ===
          console.log("Using Bridge ITS function for stealth transfer...");

          const itsConfig = getITSTokenConfig(tokenSymbol);
          if (!itsConfig || !itsConfig.tokenManagerAddress) {
            throw new Error(`ITS token config not found for ${tokenSymbol}`);
          }

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
            setTxStatus(TX_STATUS.APPROVING);
            
            // Check token balance first
            const tokenBalance = await tokenContract.balanceOf(signerAddress);
            if (tokenBalance < amountInWei) {
              throw new Error(
                `Insufficient token balance. You have ${ethers.formatUnits(tokenBalance, decimals)} ${tokenSymbol}, ` +
                `but need ${ethers.formatUnits(amountInWei, decimals)} ${tokenSymbol}.`
              );
            }
            
            // Estimate gas for approval
            let gasLimit;
            try {
              const estimatedGas = await tokenContract.approve.estimateGas(bridgeAddress, amountInWei);
              gasLimit = estimatedGas + (estimatedGas / 2n); // Add 50% buffer
              console.log(`Estimated gas: ${estimatedGas.toString()}, Using: ${gasLimit.toString()}`);
            } catch (estimateError) {
              console.warn("Gas estimation failed, using safe default:", estimateError);
              gasLimit = 150000n; // Increased default
            }
            
            // Ensure minimum gas limit
            if (gasLimit < 50000n) {
              gasLimit = 50000n;
            }
            
            try {
              const approveTx = await tokenContract.approve(bridgeAddress, amountInWei, { gasLimit });
              console.log(`Approval transaction: ${approveTx.hash}`);
              
              const receipt = await Promise.race([
                approveTx.wait(),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error("Approval transaction timeout")), 120000)
                )
              ]);
              
              console.log("Bridge approval confirmed:", receipt.hash);
            } catch (approveError) {
              console.error("Approval transaction failed:", approveError);
              
              let errorMessage = "Token approval failed";
              if (approveError?.code === -32603 || approveError?.message?.includes("Internal JSON-RPC")) {
                errorMessage = "Token approval failed. This might be due to:\n" +
                  "1. Insufficient gas limit\n" +
                  "2. Token contract issue\n" +
                  "3. Network congestion\n\n" +
                  "Please try again or check your token balance.";
              } else if (approveError?.message) {
                errorMessage = approveError.message;
              }
              
              throw new Error(errorMessage);
            }
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
            { value: gasFeeWei }
          );

        } else {
          // === GMP TOKEN TRANSFER (via Bridge) ===
          console.log("Using GMP Bridge for cross-chain transfer...");

          // Verify token contract exists on this chain
          const tokenCode = await signer.provider.getCode(tokenAddress);
          if (tokenCode === '0x' || tokenCode === '0x0') {
            throw new Error(
              `Token contract not found at ${tokenAddress} on ${srcChainConfig.name}. ` +
              `Please verify TUSDC is deployed on this chain.`
            );
          }
          console.log(`Token contract verified at ${tokenAddress}`);

          // Verify bridge contract exists on this chain
          const bridgeCode = await signer.provider.getCode(bridgeAddress);
          if (bridgeCode === '0x' || bridgeCode === '0x0') {
            throw new Error(
              `Bridge contract not found at ${bridgeAddress} on ${srcChainConfig.name}. ` +
              `Please verify the bridge is deployed on this chain.`
            );
          }
          console.log(`Bridge contract verified at ${bridgeAddress}`);

          // Check allowance for bridge
          const currentAllowance = await tokenContract.allowance(signerAddress, bridgeAddress);
          if (currentAllowance < amountInWei) {
            console.log("Approving token spending...");
            console.log(`Approving ${ethers.formatUnits(amountInWei, decimals)} ${tokenSymbol} to bridge ${bridgeAddress}`);
            
            setTxStatus(TX_STATUS.APPROVING);
            
            // Check token balance first
            const tokenBalance = await tokenContract.balanceOf(signerAddress);
            console.log(`Token balance: ${ethers.formatUnits(tokenBalance, decimals)} ${tokenSymbol}`);
            if (tokenBalance < amountInWei) {
              throw new Error(
                `Insufficient token balance. You have ${ethers.formatUnits(tokenBalance, decimals)} ${tokenSymbol}, ` +
                `but need ${ethers.formatUnits(amountInWei, decimals)} ${tokenSymbol}.`
              );
            }
            
            // Check native token (ETH) balance for gas
            const ethBalance = await signer.provider.getBalance(signerAddress);
            const minEthRequired = ethers.parseEther("0.001"); // Minimum 0.001 ETH for gas
            console.log(`ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
            if (ethBalance < minEthRequired) {
              throw new Error(
                `Insufficient ETH for gas fees on ${srcChainConfig.name}. ` +
                `You have ${ethers.formatEther(ethBalance)} ETH, but need at least 0.001 ETH. ` +
                `Please add ETH to your wallet.`
              );
            }
            
            // Check if Arbitrum (needs higher gas and special handling)
            const isArbitrum = srcChainConfig.chainId === 421614;
            const baseGasLimit = isArbitrum ? 500000n : 150000n; // Much higher for Arbitrum L2
            
            // For Arbitrum, we need to handle gas differently due to L2 specifics
            let gasLimit = baseGasLimit;
            let gasPrice = null;
            
            if (isArbitrum) {
              // Arbitrum L2: Get current gas price and use higher limit
              try {
                const feeData = await signer.provider.getFeeData();
                // Use maxFeePerGas for Arbitrum if available
                if (feeData.maxFeePerGas) {
                  gasPrice = feeData.maxFeePerGas;
                  console.log(`Arbitrum maxFeePerGas: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
                }
              } catch (feeError) {
                console.warn("Failed to get fee data for Arbitrum:", feeError);
              }
              
              // Try to estimate gas, but use high fallback for Arbitrum
              try {
                const estimatedGas = await tokenContract.approve.estimateGas(bridgeAddress, amountInWei);
                // Add 200% buffer for Arbitrum (L2 can be unpredictable)
                gasLimit = estimatedGas * 3n;
                console.log(`Arbitrum estimated gas: ${estimatedGas.toString()}, Using: ${gasLimit.toString()}`);
              } catch (estimateError) {
                console.warn("Arbitrum gas estimation failed, using high default:", estimateError.message);
                gasLimit = 500000n; // High default for Arbitrum
              }
            } else {
              // Non-Arbitrum chains: standard estimation
              try {
                const estimatedGas = await tokenContract.approve.estimateGas(bridgeAddress, amountInWei);
                gasLimit = estimatedGas + (estimatedGas / 2n); // 50% buffer
                console.log(`Estimated gas: ${estimatedGas.toString()}, Using: ${gasLimit.toString()}`);
              } catch (estimateError) {
                console.warn("Gas estimation failed, using safe default:", estimateError);
                gasLimit = baseGasLimit;
              }
            }
            
            // Ensure minimum gas limit
            const minGasLimit = isArbitrum ? 200000n : 50000n;
            if (gasLimit < minGasLimit) {
              gasLimit = minGasLimit;
            }
            
            console.log(`Final gas limit: ${gasLimit.toString()} for ${isArbitrum ? 'Arbitrum' : 'Other'} chain`);
            
            try {
              // For Arbitrum, first simulate the transaction to catch errors early
              if (isArbitrum) {
                console.log("Simulating approval transaction on Arbitrum...");
                try {
                  // Use eth_call to simulate
                  const callResult = await tokenContract.approve.staticCall(bridgeAddress, amountInWei);
                  console.log("Simulation successful, result:", callResult);
                } catch (simError) {
                  console.error("Simulation failed:", simError);
                }
              }
              
              console.log("Sending approval transaction...");
              console.log("Options:", JSON.stringify({
                gasLimit: gasLimit.toString(),
                to: tokenAddress,
                spender: bridgeAddress,
                amount: amountInWei.toString(),
              }));
              
              let approveTx;
              
              // For Arbitrum, try a different approach - populate transaction manually
              if (isArbitrum) {
                try {
                  // Get nonce and fee data from a reliable RPC
                  const arbitrumRpc = "https://sepolia-rollup.arbitrum.io/rpc";
                  const reliableProvider = new ethers.JsonRpcProvider(arbitrumRpc);
                  
                  const [nonce, feeData] = await Promise.all([
                    reliableProvider.getTransactionCount(signerAddress),
                    reliableProvider.getFeeData(),
                  ]);
                  
                  console.log(`Nonce: ${nonce}, MaxFeePerGas: ${feeData.maxFeePerGas?.toString()}`);
                  
                  // Populate the transaction with reliable data
                  const populatedTx = await tokenContract.approve.populateTransaction(bridgeAddress, amountInWei);
                  
                  // Add gas parameters
                  populatedTx.gasLimit = gasLimit;
                  populatedTx.nonce = nonce;
                  populatedTx.chainId = 421614n;
                  
                  // Use EIP-1559 fees if available
                  if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                    populatedTx.maxFeePerGas = feeData.maxFeePerGas * 2n;
                    populatedTx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 2n;
                    populatedTx.type = 2;
                  } else if (feeData.gasPrice) {
                    populatedTx.gasPrice = feeData.gasPrice * 2n;
                  }
                  
                  console.log("Populated transaction:", {
                    to: populatedTx.to,
                    gasLimit: populatedTx.gasLimit?.toString(),
                    maxFeePerGas: populatedTx.maxFeePerGas?.toString(),
                    nonce: populatedTx.nonce,
                  });
                  
                  // Send the populated transaction through MetaMask
                  approveTx = await signer.sendTransaction(populatedTx);
                } catch (populateError) {
                  console.warn("Populated transaction failed, trying standard approach:", populateError.message);
                  // Fallback to standard approach
                  approveTx = await tokenContract.approve(bridgeAddress, amountInWei, { gasLimit });
                }
              } else {
                // Non-Arbitrum: use standard approach
                approveTx = await tokenContract.approve(bridgeAddress, amountInWei, { gasLimit });
              }
              
              console.log(`Approval transaction: ${approveTx.hash}`);
              
              // Wait for confirmation with timeout (longer for Arbitrum)
              const timeout = isArbitrum ? 180000 : 120000;
              const receipt = await Promise.race([
                approveTx.wait(),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error("Approval transaction timeout")), timeout)
                )
              ]);
              
              console.log("Token approval confirmed:", receipt.hash);
            } catch (approveError) {
              console.error("Approval transaction failed:", approveError);
              console.error("Error details:", {
                code: approveError?.code,
                message: approveError?.message,
                data: approveError?.data,
                gasLimit: gasLimit.toString(),
                chain: srcChainConfig.name,
                chainId: srcChainConfig.chainId,
                tokenAddress: tokenAddress,
                bridgeAddress: bridgeAddress,
              });
              
              // Provide more helpful error message based on chain and error type
              let errorMessage = "Token approval failed";
              
              if (approveError?.code === -32603 || approveError?.message?.includes("Internal JSON-RPC")) {
                if (isArbitrum) {
                  // Arbitrum-specific error handling
                  errorMessage = `Token approval failed on Arbitrum Sepolia.\n\n` +
                    `Possible causes:\n` +
                    `1. Insufficient ETH for gas fees on Arbitrum\n` +
                    `2. Token contract at ${tokenAddress} may not exist or be valid\n` +
                    `3. Bridge address ${bridgeAddress} may be incorrect\n` +
                    `4. Arbitrum RPC node issue - try again in a moment\n\n` +
                    `Please ensure you have enough ETH on Arbitrum Sepolia for gas.`;
                } else {
                  errorMessage = `Token approval failed on ${srcChainConfig.name}.\n\n` +
                    `Possible causes:\n` +
                    `1. Insufficient gas (tried ${gasLimit.toString()})\n` +
                    `2. Token contract issue\n` +
                    `3. Network congestion\n` +
                    `4. RPC node issue\n\n` +
                    `Please try again or check your token balance.`;
                }
              } else if (approveError?.code === 'ACTION_REJECTED' || approveError?.code === 4001) {
                errorMessage = "Transaction was rejected by user";
              } else if (approveError?.message?.includes("insufficient funds")) {
                errorMessage = `Insufficient ETH for gas fees on ${srcChainConfig.name}. Please add more ETH to your wallet.`;
              } else if (approveError?.message) {
                errorMessage = approveError.message;
              }
              
              throw new Error(errorMessage);
            }
          }

          // Convert ephemeralPubKey to bytes
          const ephemeralPubKeyHex = ephemeralPubKey.startsWith("0x") ? ephemeralPubKey : "0x" + ephemeralPubKey;
          const ephemeralPubKeyBytes = ethers.getBytes(ephemeralPubKeyHex);
          const viewHintHex = viewHint.startsWith("0x") ? viewHint : "0x" + viewHint;
          const viewHintByte = viewHintHex.slice(0, 4);

          // Check if source chain is Arbitrum (for special handling)
          const isArbitrumChain = srcChainConfig.chainId === 421614;

          // For TUSDC (new deployments), check if it's in gateway
          // If not, use custom token function
          if (tokenSymbol === "TUSDC") {
            const gatewayAddress = await bridgeContract.gateway();
            const gatewayContract = new ethers.Contract(
              gatewayAddress,
              GATEWAY_ABI,
              signer
            );
            const gatewayTokenAddress =
              await gatewayContract.tokenAddresses(tokenSymbol);

            if (gatewayTokenAddress === ethers.ZeroAddress) {
              // Use custom token function for new TUSDC deployments
              console.log(
                "TUSDC not in gateway, using custom token function..."
              );

              // Get destination token address
              const destinationTokenAddress = getITSTokenAddress(
                tokenSymbol,
                destinationChain,
                dstChainConfig.axelarName
              );
              if (!destinationTokenAddress) {
                throw new Error(
                  `TUSDC address not found for destination chain ${dstChainConfig.axelarName}. ` +
                    `Please verify TUSDC is deployed on destination chain.`
                );
              }

              console.log(
                `Using custom token: source=${tokenAddress}, destination=${destinationTokenAddress}`
              );

              // For Arbitrum, use populated transaction approach
              if (isArbitrumChain) {
                try {
                  console.log("Using populated transaction for Arbitrum bridge call...");
                  
                  // Get reliable data from Arbitrum RPC
                  const arbitrumRpc = "https://sepolia-rollup.arbitrum.io/rpc";
                  const reliableProvider = new ethers.JsonRpcProvider(arbitrumRpc);
                  
                  const [nonce, feeData] = await Promise.all([
                    reliableProvider.getTransactionCount(signerAddress),
                    reliableProvider.getFeeData(),
                  ]);
                  
                  // Estimate gas using reliable provider
                  const gasEstimate = await reliableProvider.estimateGas({
                    from: signerAddress,
                    to: bridgeAddress,
                    data: bridgeContract.interface.encodeFunctionData(
                      "sendCrossChainStealthPaymentCustomToken",
                      [
                        dstChainConfig.axelarName,
                        stealthAddress,
                        ephemeralPubKeyBytes,
                        viewHintByte,
                        k,
                        tokenAddress,
                        destinationTokenAddress,
                        amountInWei,
                      ]
                    ),
                    value: gasFeeWei,
                  });
                  
                  console.log(`Bridge gas estimate: ${gasEstimate.toString()}`);
                  
                  // Populate transaction
                  const populatedTx = await bridgeContract.sendCrossChainStealthPaymentCustomToken.populateTransaction(
                    dstChainConfig.axelarName,
                    stealthAddress,
                    ephemeralPubKeyBytes,
                    viewHintByte,
                    k,
                    tokenAddress,
                    destinationTokenAddress,
                    amountInWei,
                    { value: gasFeeWei }
                  );
                  
                  // Add gas parameters
                  populatedTx.gasLimit = gasEstimate * 2n; // 2x buffer
                  populatedTx.nonce = nonce;
                  populatedTx.chainId = 421614n;
                  
                  if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
                    populatedTx.maxFeePerGas = feeData.maxFeePerGas * 2n;
                    populatedTx.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas * 2n;
                    populatedTx.type = 2;
                  }
                  
                  console.log("Sending populated bridge transaction...");
                  tx = await signer.sendTransaction(populatedTx);
                } catch (populateError) {
                  console.warn("Populated transaction failed, trying standard:", populateError.message);
                  tx = await bridgeContract.sendCrossChainStealthPaymentCustomToken(
                    dstChainConfig.axelarName,
                    stealthAddress,
                    ephemeralPubKeyBytes,
                    viewHintByte,
                    k,
                    tokenAddress,
                    destinationTokenAddress,
                    amountInWei,
                    { value: gasFeeWei }
                  );
                }
              } else {
                // Non-Arbitrum: use standard approach
                tx = await bridgeContract.sendCrossChainStealthPaymentCustomToken(
                  dstChainConfig.axelarName,
                  stealthAddress,
                  ephemeralPubKeyBytes,
                  viewHintByte,
                  k,
                  tokenAddress,
                  destinationTokenAddress,
                  amountInWei,
                  { value: gasFeeWei }
                );
              }
            } else {
              // Use regular gateway function
              tx = await bridgeContract.sendCrossChainStealthPayment(
                dstChainConfig.axelarName,
                stealthAddress,
                ephemeralPubKeyBytes,
                viewHintByte,
                k,
                tokenSymbol,
                amountInWei,
                { value: gasFeeWei }
              );
            }
          } else {
            // For other tokens, use regular gateway function
            tx = await bridgeContract.sendCrossChainStealthPayment(
              dstChainConfig.axelarName,
              stealthAddress,
              ephemeralPubKeyBytes,
              viewHintByte,
              k,
              tokenSymbol,
              amountInWei,
              { value: gasFeeWei }
            );
          }
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
