import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody, Input, Select, SelectItem, Spinner, Chip, Tabs, Tab, Accordion, AccordionItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@nextui-org/react";
import { ethers } from "ethers";
import toast from "react-hot-toast";
import { useAxelarPayment, TX_STATUS } from "../hooks/useAxelarPayment.js";
import { scanStealthPayments, deriveStealthPrivateKey, ERC20_ABI, GATEWAY_ABI } from "../lib/axelar/crossChainPayment.js";
import { AXELAR_CHAINS, getSupportedChains, getAxelarscanUrl, getAvailableTokens, getItsTokenId } from "../lib/axelar/index.js";
import { deriveKeysFromSignature } from "../lib/aptos/stealthAddress.js";
import { ArrowLeftRight, Shield, Send, Eye, CheckCircle2, AlertCircle, Zap, ExternalLink, ArrowDown, ArrowUp, Coins, Gift } from "lucide-react";
import { AxelarPrivacyPoolPanel } from "../components/axelar/AxelarPrivacyPoolPanel.jsx";

// Bridge contract address (same on all chains)
const DEFAULT_BRIDGE_ADDRESS = import.meta.env.VITE_AXELAR_BRIDGE_ADDRESS || "0x1764681c26D04f0E9EBb305368cfda808A9F6f8f";

// Optional per-chain overrides (recommended for testnets where you deploy distinct bridge addresses)
const BRIDGE_ADDRESS_OVERRIDES = {
  base: import.meta.env.VITE_AXELAR_BRIDGE_ADDRESS_BASE_SEPOLIA,
  polygon: import.meta.env.VITE_AXELAR_BRIDGE_ADDRESS_POLYGON_SEPOLIA,
};

// Bridge ABI for meta address lookup and registration
const BRIDGE_ABI = [
  "function getMetaAddress(address user) external view returns (bytes spendPubKey, bytes viewingPubKey)",
  "function registerMetaAddress(bytes spendPubKey, bytes viewingPubKey) external",
];

const ITS_READ_ABI = [
  "function interchainTokenAddress(bytes32 tokenId) external view returns (address)",
];

// Network detection
const isMainnet = import.meta.env.VITE_NETWORK === "mainnet";

// Fallback tokens if API fails
const FALLBACK_TOKENS = isMainnet
  ? [{ symbol: "axlUSDC", name: "Axelar USDC", decimals: 6 }]
  : [{ symbol: "TUSDC", name: "Test USDC", decimals: 6 }]; // Our deployed test token at 0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B

// Privacy-pool on Base→Polygon is fixed-denomination and currently uses TUSDC (ITS token).
const POOL_FIXED_TOKEN = { symbol: "TUSDC", name: "Test USDC", decimals: 6 };

function resolveBridgeAddressForChainKey(chainKey) {
  const chainConfig = AXELAR_CHAINS?.[chainKey];
  const envOverride = chainKey ? BRIDGE_ADDRESS_OVERRIDES[chainKey] : undefined;
  return envOverride || chainConfig?.stealthBridge || DEFAULT_BRIDGE_ADDRESS;
}

export default function CrossChainPaymentPage() {
  const navigate = useNavigate();
  const {
    sendCrossChainPayment,
    estimateGas,
    reset,
    loading,
    txStatus,
    txHash,
    error,
    gasEstimate,
    getStatusLabel,
    isComplete,
    isFailed,
    isProcessing,
  } = useAxelarPayment();

  // EVM Wallet State
  const [evmAddress, setEvmAddress] = useState(null);
  const [evmConnecting, setEvmConnecting] = useState(false);
  const [chainId, setChainId] = useState(null);

  // Prefer per-chain configured bridge address when available.
  // Note: many chains do not have `stealthBridge` populated in AXELAR_CHAINS yet,
  // so we fall back to `VITE_AXELAR_BRIDGE_ADDRESS`.
  const connectedBridgeAddress = useMemo(() => {
    if (!chainId) return DEFAULT_BRIDGE_ADDRESS;
    const entry = Object.entries(AXELAR_CHAINS).find(([, chain]) => chain.chainId === chainId);
    const chainKey = entry?.[0];
    return resolveBridgeAddressForChainKey(chainKey);
  }, [chainId]);

  const [sourceChain, setSourceChain] = useState("");
  const [destinationChain, setDestinationChain] = useState("");
  // Privacy pool route disabled for now (only Base and Arbitrum available)
  const isPrivacyRoute = false; // sourceChain === "base" && destinationChain === "polygon";
  const [transferMode, setTransferMode] = useState("direct");
  const [modeManuallySelected, setModeManuallySelected] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("TUSDC"); // Default to TUSDC
  const [availableTokens, setAvailableTokens] = useState(FALLBACK_TOKENS);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [estimatingGas, setEstimatingGas] = useState(false);
  const [requestingToken, setRequestingToken] = useState(false);
  const [lastTokenRequestTx, setLastTokenRequestTx] = useState(null); // { hash, explorerUrl, chainName }

  // Bridge address to use for *source-chain* reads (meta address lookup, etc).
  // This is intentionally keyed off the selected source chain, not the currently-connected wallet chain.
  const sourceBridgeAddress = useMemo(() => {
    if (!sourceChain) return DEFAULT_BRIDGE_ADDRESS;
    return resolveBridgeAddressForChainKey(sourceChain);
  }, [sourceChain]);

  // Stealth mode state
  const [stealthMode, setStealthMode] = useState(null); // null = checking, true = stealth, false = direct
  const [recipientMetaAddress, setRecipientMetaAddress] = useState(null);
  const [checkingStealthKeys, setCheckingStealthKeys] = useState(false);

  // Scanning State
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(null); // { scannedBlocks, totalBlocks, startBlock, endBlock, chunkSize }
  const [scannedPayments, setScannedPayments] = useState([]);
  const [withdrawing, setWithdrawing] = useState(null); // ID of payment being withdrawn
  const [scanChain, setScanChain] = useState("polygon"); // Default to Polygon since that's where cross-chain payments arrive

  // Registration state
  const [isRegistered, setIsRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(false);
  const [registering, setRegistering] = useState(false);

  // Check if current user is registered for stealth
  useEffect(() => {
    async function checkUserRegistration() {
      if (!evmAddress || !window.ethereum) {
        setIsRegistered(false);
        return;
      }

      setCheckingRegistration(true);
      try {
        const { ethers } = await import("ethers");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const bridgeContract = new ethers.Contract(connectedBridgeAddress, BRIDGE_ABI, provider);

        const [spendPubKey, viewingPubKey] = await bridgeContract.getMetaAddress(evmAddress);
        const spendPubKeyHex = ethers.hexlify(spendPubKey);

        if (spendPubKeyHex !== "0x" && spendPubKeyHex.length > 2) {
          setIsRegistered(true);
          console.log("User is registered for stealth payments");
        } else {
          setIsRegistered(false);
          console.log("User is NOT registered for stealth payments");
        }
      } catch (err) {
        console.log("Error checking registration:", err.message);
        setIsRegistered(false);
      } finally {
        setCheckingRegistration(false);
      }
    }

    checkUserRegistration();
  }, [evmAddress, connectedBridgeAddress]);

  // Register with signature (Deterministic)
  const handleRegisterWithSignature = async () => {
    if (!evmAddress) {
      toast.error("Please connect wallet first");
      return;
    }

    setRegistering(true);
    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 1. Request signature
      const message = "Sign this message to enable Stealth Payments on PrivatePay.\n\nThis signature will be used to generate your unique stealth keys deterministically.\n\nIMPORTANT: Signing this does not cost gas.";
      const signature = await signer.signMessage(message);
      const signatureHash = ethers.keccak256(signature);

      // 2. Derive keys
      console.log("Deriving keys from signature...");
      const keys = deriveKeysFromSignature(signatureHash);

      // 3. Register on-chain
      const bridgeContract = new ethers.Contract(connectedBridgeAddress, BRIDGE_ABI, signer);
      const spendPubKey = `0x${keys.spend.publicKey}`;
      const viewingPubKey = `0x${keys.viewing.publicKey}`;

      console.log("Registering meta address...");
      const tx = await bridgeContract.registerMetaAddress(spendPubKey, viewingPubKey);

      toast.loading("Registering on-chain...", { id: "register-tx" });
      await tx.wait();
      toast.success("Successfully registered!", { id: "register-tx" });

      setIsRegistered(true);

      // Optional: Save keys to local storage for convenience (encrypted ideally, but raw for now as they are recoverable)
      // localStorage.setItem(`stealth_keys_${evmAddress}`, JSON.stringify(keys));
      // Save signature hash to session storage for scanning without re-signing
      sessionStorage.setItem(`stealth_sig_${evmAddress}`, signatureHash);

    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register");
    } finally {
      setRegistering(false);
    }
  };

  // Scan for payments - scans on the SELECTED chain (not necessarily the connected chain)
  // This is critical for cross-chain payments where funds arrive on destination chain
  const handleScanPayments = async () => {
    if (!evmAddress) return;
    if (!scanChain) {
      toast.error("Please select a chain to scan");
      return;
    }

    setScanning(true);
    setScanProgress(null);
    setScannedPayments([]);

    try {
      const { ethers } = await import("ethers");
      const walletProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await walletProvider.getSigner();

      // 1. Get keys (either from session or ask to sign)
      let signatureHash = sessionStorage.getItem(`stealth_sig_${evmAddress}`);

      if (!signatureHash) {
        const message = "Sign this message to enable Stealth Payments on PrivatePay.\n\nThis signature will be used to generate your unique stealth keys deterministically.\n\nIMPORTANT: Signing this does not cost gas.";
        const signature = await signer.signMessage(message);
        signatureHash = ethers.keccak256(signature);
        sessionStorage.setItem(`stealth_sig_${evmAddress}`, signatureHash);
      }

      const keys = deriveKeysFromSignature(signatureHash);

      // 2. Scan on the SELECTED chain (not the connected chain)
      // This is important for cross-chain payments where you send from Base but receive on Polygon
      const scanChainConfig = AXELAR_CHAINS[scanChain];
      if (!scanChainConfig) {
        throw new Error(`Chain ${scanChain} not configured`);
      }

      console.log(`Scanning for payments on ${scanChainConfig.name}...`);
      
      // Use the selected chain's RPC (not the wallet's connected chain)
      const scanProvider = new ethers.JsonRpcProvider(scanChainConfig.rpcUrl);
      const scanBridgeAddress = resolveBridgeAddressForChainKey(scanChain);

      console.log(`Bridge address on ${scanChain}: ${scanBridgeAddress}`);

      const payments = await scanStealthPayments({
        provider: scanProvider,
        bridgeAddress: scanBridgeAddress,
        viewingPrivateKey: keys.viewing.privateKey,
        spendPublicKey: keys.spend.publicKey,
        chainId: scanChainConfig.chainId,
        onProgress: (scannedBlocks, totalBlocks, meta) => {
          setScanProgress({
            scannedBlocks,
            totalBlocks,
            startBlock: meta?.startBlock,
            endBlock: meta?.endBlock,
            chunkSize: meta?.chunkSize,
          });
        },
      });

      console.log("Found payments:", payments);
      setScannedPayments(payments);

      if (payments.length === 0) {
        toast(`No stealth payments found on ${scanChainConfig.name}`, { icon: "🔍" });
      } else {
        toast.success(`Found ${payments.length} payments on ${scanChainConfig.name}!`);
      }

    } catch (error) {
      console.error("Scanning error:", error);
      toast.error(error?.shortMessage || error?.message || "Failed to scan payments");
    } finally {
      setScanning(false);
    }
  };

  // Withdraw funds - IMPORTANT: Must switch wallet to the scan chain first
  // Because withdrawal requires sending a transaction from the stealth wallet on that chain
  const handleWithdraw = async (payment) => {
    setWithdrawing(payment.txHash);
    const toastId = toast.loading("Initializing withdrawal...");

    try {
      const { ethers } = await import("ethers");
      
      // Get the chain config for the scan chain (where the payment was found)
      const withdrawChainConfig = AXELAR_CHAINS[scanChain];
      if (!withdrawChainConfig) {
        throw new Error(`Chain ${scanChain} not configured`);
      }

      // Check if wallet is on the correct chain
      const currentChainIdHex = await window.ethereum.request({ method: "eth_chainId" });
      const currentChainId = parseInt(currentChainIdHex, 16);
      
      if (currentChainId !== withdrawChainConfig.chainId) {
        toast.loading(`Switching to ${withdrawChainConfig.name}...`, { id: toastId });
        
        // Try to switch chain
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: "0x" + withdrawChainConfig.chainId.toString(16) }],
          });
        } catch (switchError) {
          // Chain not added, try to add it
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: "0x" + withdrawChainConfig.chainId.toString(16),
                chainName: withdrawChainConfig.name,
                rpcUrls: [withdrawChainConfig.rpcUrl],
                nativeCurrency: { name: withdrawChainConfig.gasToken, symbol: withdrawChainConfig.gasToken, decimals: 18 },
                blockExplorerUrls: [withdrawChainConfig.explorer],
              }],
            });
          } else {
            throw new Error(`Please switch your wallet to ${withdrawChainConfig.name} to withdraw`);
          }
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 1. Get keys
      const signatureHash = sessionStorage.getItem(`stealth_sig_${evmAddress}`);
      if (!signatureHash) throw new Error("Please scan again to unlock keys");

      const keys = deriveKeysFromSignature(signatureHash);

      // 2. Derive stealth private key
      const stealthPrivateKey = deriveStealthPrivateKey(
        payment.ephemeralPubKey,
        keys.viewing.privateKey,
        keys.spend.privateKey,
        payment.k
      );

      // 3. Create stealth wallet connected to provider
      const stealthWallet = new ethers.Wallet(stealthPrivateKey, provider);

      // 4. Resolve Token Address using the SCAN chain's bridge (not connected chain)
      const withdrawBridgeAddress = resolveBridgeAddressForChainKey(scanChain);
      
      const bridgeGatewayABI = ["function gateway() external view returns (address)"];
      const bridgeForGateway = new ethers.Contract(withdrawBridgeAddress, bridgeGatewayABI, provider);
      const gatewayAddress = await bridgeForGateway.gateway();

      let tokenAddress = ethers.ZeroAddress;
      if (payment.symbol === "ITS_TOKEN") {
        const itsAddress = withdrawChainConfig.its;
        const tokenId = getItsTokenId("TUSDC");

        if (!itsAddress || !tokenId) {
          throw new Error("Missing ITS config to resolve TUSDC address");
        }

        const its = new ethers.Contract(itsAddress, ITS_READ_ABI, provider);
        tokenAddress = await its.interchainTokenAddress(tokenId);
      } else {
        const gatewayContract = new ethers.Contract(gatewayAddress, GATEWAY_ABI, provider);
        tokenAddress = await gatewayContract.tokenAddresses(payment.symbol);
      }

      if (tokenAddress === ethers.ZeroAddress) {
        throw new Error(`Token ${payment.symbol} not found on ${withdrawChainConfig.name}`);
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, stealthWallet);

      // 5. Check Stealth Wallet native token balance for Gas
      const gasPrice = (await provider.getFeeData()).gasPrice;
      const gasLimit = 100000n;
      const gasCost = gasPrice * gasLimit;

      const stealthBalance = await provider.getBalance(stealthWallet.address);

      if (stealthBalance < gasCost) {
        toast.loading(`Stealth wallet needs gas. Sending ${withdrawChainConfig.gasToken}...`, { id: toastId });

        const topUpAmount = gasCost * 2n;

        const tx = await signer.sendTransaction({
          to: stealthWallet.address,
          value: topUpAmount
        });

        await tx.wait();
        toast.success("Gas topped up!", { id: toastId });
      }

      // 6. Execute Withdrawal (Stealth -> Main)
      toast.loading("Withdrawing funds...", { id: toastId });

      const tokenBalance = await tokenContract.balanceOf(stealthWallet.address);

      if (tokenBalance === 0n) {
        throw new Error("Stealth wallet has 0 token balance. Already withdrawn?");
      }

      const withdrawTx = await tokenContract.transfer(evmAddress, tokenBalance);
      await withdrawTx.wait();

      toast.success(`Withdrawal complete on ${withdrawChainConfig.name}!`, { id: toastId });

      setScannedPayments(prev => prev.filter(p => p.txHash !== payment.txHash));

    } catch (error) {
      console.error("Withdrawal error:", error);
      toast.error(`Withdrawal failed: ${error.message}`, { id: toastId });
    } finally {
      setWithdrawing(null);
    }
  };

  // Check for stealth keys when recipient address changes
  useEffect(() => {
    async function checkStealthKeys() {
      if (!recipientAddress || recipientAddress.length !== 42 || !recipientAddress.startsWith("0x")) {
        setStealthMode(null);
        setRecipientMetaAddress(null);
        return;
      }

      setCheckingStealthKeys(true);
      try {
        const { ethers } = await import("ethers");

        // Prefer RPC provider for the selected source chain so we can read even if the wallet
        // is currently on a different network.
        const srcCfg = AXELAR_CHAINS[sourceChain];
        const provider =
          srcCfg?.rpcUrl
            ? new ethers.JsonRpcProvider(srcCfg.rpcUrl)
            : new ethers.BrowserProvider(window.ethereum);

        const bridgeContract = new ethers.Contract(sourceBridgeAddress, BRIDGE_ABI, provider);

        const [spendPubKey, viewingPubKey] = await bridgeContract.getMetaAddress(recipientAddress);

        // Check if keys are registered (not empty)
        const spendPubKeyHex = ethers.hexlify(spendPubKey);
        const viewingPubKeyHex = ethers.hexlify(viewingPubKey);

        if (spendPubKeyHex !== "0x" && viewingPubKeyHex !== "0x" && spendPubKeyHex.length > 2) {
          console.log("Stealth keys found for recipient:", { spendPubKeyHex, viewingPubKeyHex });
          setRecipientMetaAddress({
            spendPubKey: spendPubKeyHex,
            viewingPubKey: viewingPubKeyHex,
          });
          setStealthMode(true);
        } else {
          console.log("No stealth keys registered for recipient");
          setRecipientMetaAddress(null);
          setStealthMode(false);
        }
      } catch (err) {
        console.log("Error checking stealth keys (recipient may not be registered):", err.message);
        setRecipientMetaAddress(null);
        setStealthMode(false);
      } finally {
        setCheckingStealthKeys(false);
      }
    }

    // Debounce the check
    const timer = setTimeout(checkStealthKeys, 500);
    return () => clearTimeout(timer);
  }, [recipientAddress, sourceBridgeAddress, sourceChain]);

  // Fetch available tokens when chains change
  useEffect(() => {
    async function fetchTokens() {
      // In Privacy Pool mode, token choice is fixed and does not depend on Axelar gateway assets.
      if (isPrivacyRoute && transferMode === "pool") {
        setAvailableTokens([POOL_FIXED_TOKEN]);
        setSelectedToken(POOL_FIXED_TOKEN.symbol);
        return;
      }

      if (!sourceChain || !destinationChain) {
        setAvailableTokens(FALLBACK_TOKENS);
        return;
      }

      setLoadingTokens(true);
      try {
        const tokens = await getAvailableTokens(sourceChain, destinationChain);
        if (tokens.length > 0) {
          setAvailableTokens(tokens);
          // Prefer TUSDC if available, otherwise use first token
          const tusdcToken = tokens.find(t => t.symbol === "TUSDC");
          if (tusdcToken) {
            setSelectedToken("TUSDC");
          } else if (!selectedToken || !tokens.find(t => t.symbol === selectedToken)) {
            setSelectedToken(tokens[0]?.symbol || "TUSDC");
          }
        } else {
          setAvailableTokens(FALLBACK_TOKENS);
          setSelectedToken("TUSDC"); // Always default to TUSDC
        }
      } catch (err) {
        console.error("Error fetching tokens:", err);
        setAvailableTokens(FALLBACK_TOKENS);
      } finally {
        setLoadingTokens(false);
      }
    }

    fetchTokens();
  }, [sourceChain, destinationChain, isPrivacyRoute, transferMode]);

  const tokenOptions = availableTokens;

  useEffect(() => {
    if (!isPrivacyRoute) {
      setTransferMode("direct");
      setModeManuallySelected(false);
      return;
    }
    if (!modeManuallySelected) {
      setTransferMode("pool");
    }
  }, [isPrivacyRoute, modeManuallySelected]);

  // Check if MetaMask is connected on mount
  useEffect(() => {
    checkEvmConnection();

    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, []);

  const checkEvmConnection = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        if (accounts.length > 0) {
          setEvmAddress(accounts[0]);
          const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
          setChainId(parseInt(chainIdHex, 16));
        }
      } catch (err) {
        console.error("Error checking EVM connection:", err);
      }
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length > 0) {
      setEvmAddress(accounts[0]);
    } else {
      setEvmAddress(null);
    }
  };

  const handleChainChanged = (chainIdHex) => {
    setChainId(parseInt(chainIdHex, 16));
  };

  const connectEvmWallet = async () => {
    if (!window.ethereum) {
      toast.error("Please install MetaMask!");
      window.open("https://metamask.io/download/", "_blank");
      return;
    }

    setEvmConnecting(true);
    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setEvmAddress(accounts[0]);
      const chainIdHex = await window.ethereum.request({ method: "eth_chainId" });
      setChainId(parseInt(chainIdHex, 16));
      toast.success("Wallet connected!");
    } catch (err) {
      console.error("Error connecting:", err);
      toast.error("Failed to connect wallet");
    } finally {
      setEvmConnecting(false);
    }
  };

  const switchToChain = async (targetChainKey) => {
    const cfg = AXELAR_CHAINS[targetChainKey];
    if (!cfg) throw new Error("Unknown chain");
    const chainIdHex = "0x" + cfg.chainId.toString(16);
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: chainIdHex }],
      });
    } catch (err) {
      // Chain not added, add it
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: chainIdHex,
            chainName: cfg.name,
            rpcUrls: [cfg.rpcUrl],
            nativeCurrency: { name: cfg.gasToken, symbol: cfg.gasToken, decimals: 18 },
            blockExplorerUrls: [cfg.explorer],
          }],
        });
      }
    }
  };

  const requiredSourceChainId = sourceChain ? AXELAR_CHAINS[sourceChain]?.chainId : null;
  const isOnSourceChain = requiredSourceChainId ? chainId === requiredSourceChainId : false;

  const handleTransferModeChange = (mode) => {
    setTransferMode(mode);
    setModeManuallySelected(true);
  };

  // Get all available chains
  // Only allow Base Sepolia and Arbitrum Sepolia for now
  const availableChains = useMemo(() => {
    const allChains = getSupportedChains();
    return allChains.filter(chain => chain.key === "base" || chain.key === "arbitrum");
  }, []);

  // Filter destination chains (exclude source)
  const destinationChains = useMemo(() => {
    return availableChains.filter(chain => chain.key !== sourceChain);
  }, [availableChains, sourceChain]);

  // TUSDC addresses per chain
  const TUSDC_ADDRESSES = {
    "base-sepolia": import.meta.env.VITE_AXELAR_TUSDC_ADDRESS_BASE_SEPOLIA || "0x2823Af7e1F2F50703eD9f81Ac4B23DC1E78B9E53",
    "arbitrum-sepolia": import.meta.env.VITE_AXELAR_TUSDC_ADDRESS_ARBITRUM_SEPOLIA || "0xd17beb0fE91B2aE5a57cE39D1c3D15AF1a968817",
    "ethereum-sepolia": "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B",
  };

  // Request TUSDC tokens from deployer
  const handleRequestTUSDC = async () => {
    if (!evmAddress) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!chainId) {
      toast.error("Please connect to a supported chain");
      return;
    }

    // Find current chain
    const currentChain = Object.entries(AXELAR_CHAINS).find(([, chain]) => chain.chainId === chainId);
    if (!currentChain) {
      toast.error("Unsupported chain. Please switch to Base Sepolia or Arbitrum Sepolia");
      return;
    }

    const [chainKey, chainConfig] = currentChain;
    const chainName = chainConfig.axelarName || `${chainKey}-sepolia`;
    const tusdcAddress = TUSDC_ADDRESSES[chainName] || TUSDC_ADDRESSES["base-sepolia"];

    if (!tusdcAddress) {
      toast.error("TUSDC not deployed on this chain");
      return;
    }

    setRequestingToken(true);
    const toastId = toast.loading("Requesting TUSDC tokens...");

    try {
      const walletProvider = new ethers.BrowserProvider(window.ethereum);
      const signer = await walletProvider.getSigner();

      // ERC20 ABI for transfer
      const ERC20_ABI = [
        "function transfer(address to, uint256 amount) external returns (bool)",
        "function balanceOf(address account) external view returns (uint256)",
        "function decimals() external view returns (uint8)",
      ];

      const tokenContract = new ethers.Contract(tusdcAddress, ERC20_ABI, signer);
      const decimals = await tokenContract.decimals();
      const requestAmount = ethers.parseUnits("100", decimals); // 100 TUSDC

      // Get deployer private key and calculate address
      const deployerPrivateKey = import.meta.env.VITE_DEPLOYER_PRIVATE_KEY;
      if (!deployerPrivateKey) {
        toast.error("Deployer private key not configured. Please contact admin.", { id: toastId });
        return;
      }

      // Create deployer wallet to get actual address
      const deployerWallet = new ethers.Wallet(deployerPrivateKey);
      const deployerAddress = deployerWallet.address;
      
      console.log("Deployer Address:", deployerAddress);
      
      // Check deployer balance using actual address
      const deployerBalance = await tokenContract.balanceOf(deployerAddress);
      const balanceFormatted = ethers.formatUnits(deployerBalance, decimals);
      
      console.log(`Deployer TUSDC Balance: ${balanceFormatted}`);
      
      if (deployerBalance < requestAmount) {
        toast.error(`Insufficient balance. Deployer has ${balanceFormatted} TUSDC, need 100 TUSDC`, { id: toastId });
        return;
      }

      // Connect deployer wallet to provider for sending transaction
      const deployerWalletConnected = deployerWallet.connect(walletProvider);
      const deployerTokenContract = new ethers.Contract(tusdcAddress, ERC20_ABI, deployerWalletConnected);
      
      toast.loading("Sending transaction...", { id: toastId });
      
      // Estimate gas first to catch errors early
      try {
        await deployerTokenContract.transfer.estimateGas(evmAddress, requestAmount);
      } catch (estimateError) {
        console.error("Gas estimation error:", estimateError);
        toast.error(`Transfer failed: ${estimateError?.reason || estimateError?.message || "Unknown error"}`, { id: toastId });
        return;
      }
      
      const tx = await deployerTokenContract.transfer(evmAddress, requestAmount);
      
      // Get explorer URL
      const explorerUrl = chainConfig.explorer 
        ? `${chainConfig.explorer}/tx/${tx.hash}`
        : null;
      
      // Store transaction info in state
      setLastTokenRequestTx({
        hash: tx.hash,
        explorerUrl,
        chainName: chainConfig.name || chainKey,
      });
      
      // Show transaction hash immediately
      const shortHash = `${tx.hash.substring(0, 6)}...${tx.hash.substring(tx.hash.length - 4)}`;
      toast.loading(`Transaction sent: ${shortHash}`, { id: toastId });
      
      toast.loading("Waiting for transaction confirmation...", { id: toastId });
      const receipt = await tx.wait();
      
      toast.success(`✅ Successfully received 100 TUSDC!`, { 
        id: toastId,
        duration: 3000,
      });
      
      // Refresh token balance if needed
      setTimeout(() => {
        window.location.reload();
      }, 3000);

    } catch (error) {
      console.error("Token request error:", error);
      const errorMessage = error?.reason || error?.message || "Failed to request tokens";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setRequestingToken(false);
    }
  };

  // Handle gas estimation
  const handleEstimateGas = async () => {
    // Validation
    if (!sourceChain || !destinationChain) {
      toast.error("Select source and destination chains");
      return;
    }
    if (!selectedToken) {
      toast.error("Please select a token first");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    if (!recipientAddress) {
      toast.error("Please enter recipient address");
      return;
    }

    setEstimatingGas(true);
    try {
      const estimate = await estimateGas({ sourceChain, destinationChain });
      toast.success(`Gas estimated: ${(Number(estimate) / 1e18).toFixed(6)} ETH`);
    } catch (err) {
      console.error("Gas estimation error:", err);
      const errorMsg = err?.message || "Failed to estimate gas";
      if (errorMsg.includes("OVERFLOW")) {
        toast.error("Amount too large or calculation overflow. Try a smaller amount.");
      } else {
        toast.error(errorMsg);
      }
    } finally {
      setEstimatingGas(false);
    }
  };

  // Handle payment submission
  const handleSendPayment = async () => {
    if (!evmAddress) {
      toast.error("Please connect your MetaMask wallet first");
      return;
    }
    if (!isOnSourceChain) {
      toast.error("Please switch wallet to the selected source chain");
      return;
    }
    if (!sourceChain || !destinationChain) {
      toast.error("Select source and destination chains");
      return;
    }
    if (!recipientAddress) {
      toast.error("Enter recipient address");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (isPrivacyRoute && transferMode === "pool") {
      toast("Use the privacy pool controls below to deposit & bridge", { icon: "🔒" });
      return;
    }

    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      let result;

      if (stealthMode && recipientMetaAddress) {
        // Stealth mode - use meta address to generate stealth address
        console.log("Using STEALTH mode with meta address");
        result = await sendCrossChainPayment({
          sourceChain,
          destinationChain,
          recipientMetaAddress, // Stealth transfer mode
          amount: parseFloat(amount),
          tokenSymbol: selectedToken,
          signer,
        });
        toast.success("Private stealth payment initiated!");
      } else {
        // Direct mode - send to regular address
        console.log("Using DIRECT mode (recipient not registered for stealth)");
        result = await sendCrossChainPayment({
          sourceChain,
          destinationChain,
          directAddress: recipientAddress, // Direct transfer mode
          amount: parseFloat(amount),
          tokenSymbol: selectedToken,
          signer,
        });
        toast.success("Cross-chain payment initiated!");
      }

      if (!result.success) {
        throw new Error(result.error || "Payment failed");
      }
    } catch (err) {
      console.error("Payment error:", err);
      toast.error(err.message || "Payment failed");
    }
  };

  // Get status color
  const getStatusColor = () => {
    if (isComplete) return "text-green-600";
    if (isFailed) return "text-red-600";
    if (isProcessing) return "text-blue-600";
    return "text-gray-600";
  };

  // Tabs state
  const [activeTab, setActiveTab] = useState("send");

  // Default route: Arbitrum Sepolia -> Base Sepolia
  useEffect(() => {
    if (!sourceChain) {
      setSourceChain("arbitrum");
    }
    // Only set destination if source is set and destination is not set or invalid
    if (sourceChain && (!destinationChain || !destinationChains.find(c => c.key === destinationChain))) {
      // Set to the other available chain
      const otherChain = destinationChains.find(c => c.key !== sourceChain);
      if (otherChain) {
        setDestinationChain(otherChain.key);
      } else if (sourceChain === "arbitrum") {
        setDestinationChain("base");
      } else if (sourceChain === "base") {
        setDestinationChain("arbitrum");
      }
    }
  }, [sourceChain, destinationChain, destinationChains]);

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-white py-6 px-4 pb-24">
      <div className="w-full max-w-5xl">
        {/* Compact Header */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="flex items-center gap-3">
            <img src="/assets/axelar.png" alt="Axelar" className="w-12 h-12 rounded-full" />
            <h1 className="text-3xl font-extrabold" style={{ color: '#0d08e3' }}>
              Cross-Chain Payments
            </h1>
          </div>
          <p className="text-gray-600 max-w-xl text-sm text-center">
            Send private stealth payments across blockchains via Axelar
          </p>
            </div>

        {/* Main Content Card */}
        <Card className="bg-white/80 backdrop-blur-xl border-2 border-white/50 shadow-2xl rounded-2xl mb-6 overflow-hidden">
          <CardBody className="p-0">
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={setActiveTab}
              variant="underlined"
              color="secondary"
              classNames={{
                tabList: "gap-6 w-full relative rounded-none p-0 border-b-2 border-gray-200 px-6 pt-3 bg-indigo-50/30",
                cursor: "h-1",
                tab: "max-w-fit px-0 h-12",
                tabContent: "group-data-[selected=true]:font-bold text-sm"
              }}
            >
              <Tab
                key="send"
                title={
                  <div className="flex items-center gap-2">
                    <Send size={18} />
                    <span>Send</span>
            </div>
                }
              >
                <div className="p-6 space-y-6">

                  {/* EVM Wallet Connection */}
            {!evmAddress ? (
                    <Card className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/10 to-indigo-500/10 border-2 border-indigo-300/50 shadow-xl backdrop-blur-sm">
                      <CardBody className="p-6">
                        <div className="flex flex-col items-center gap-4 text-center">
                          <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl" style={{ backgroundColor: '#0d08e3' }}>
                            <Shield className="w-8 h-8 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">Connect Your Wallet</h3>
                            <p className="text-gray-600 text-sm">Connect MetaMask to start sending payments</p>
                          </div>
              <Button
                onClick={connectEvmWallet}
                isLoading={evmConnecting}
                            className="w-full max-w-sm h-12 font-bold text-white shadow-xl hover:scale-105 transition-all"
                            style={{ backgroundColor: '#0d08e3' }}
                            onMouseEnter={(e) => !evmConnecting && (e.currentTarget.style.backgroundColor = '#0a06b8')}
                            onMouseLeave={(e) => !evmConnecting && (e.currentTarget.style.backgroundColor = '#0d08e3')}
                startContent={
                              !evmConnecting && (
                  <svg className="w-5 h-5" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M32.9582 1L19.8241 10.7183L22.2665 4.99099L32.9582 1Z" fill="#E17726" />
                    <path d="M2.04858 1L15.0707 10.809L12.7402 4.99098L2.04858 1Z" fill="#E27625" />
                  </svg>
                              )
                }
              >
                            {evmConnecting ? "Connecting..." : "Connect MetaMask"}
              </Button>
                        </div>
                      </CardBody>
                    </Card>
            ) : (
            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 shadow-lg">
                      <CardBody className="p-4">
                <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                              <CheckCircle2 className="w-5 h-5 text-white" />
                            </div>
                  <div>
                              <p className="text-xs font-bold mb-0.5" style={{ color: '#0d08e3' }}>Connected</p>
                              <p className="text-sm font-mono text-gray-900 font-bold">
                      {evmAddress.slice(0, 6)}...{evmAddress.slice(-4)}
                    </p>
                  </div>
                          </div>
                  <div className="flex items-center gap-2">
                    {!isOnSourceChain && sourceChain && (
                      <Button
                        size="sm"
                        color="warning"
                        variant="flat"
                        onClick={() => switchToChain(sourceChain)}
                        className="rounded-lg"
                      >
                        Switch Wallet
                      </Button>
                    )}
                  </div>
                </div>
                      </CardBody>
                    </Card>
            )}

                  {evmAddress && (
                    <>

                      {/* Chain Selection - Compact */}
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          {/* From Chain */}
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                              <ArrowUp className="w-4 h-4" style={{ color: '#0d08e3' }} />
                              <span>From Chain</span>
                            </label>
                            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 shadow-md">
                              <CardBody className="p-4">
                                <div className="flex items-center gap-3">
                                  {sourceChain && availableChains.find(c => c.key === sourceChain)?.image ? (
                                    <img 
                                      src={availableChains.find(c => c.key === sourceChain).image} 
                                      alt="Source" 
                                      className="w-10 h-10 rounded-full border-2 border-white shadow-md" 
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-indigo-200 border-2 border-white flex items-center justify-center">
                                      <ArrowUp className="w-5 h-5" style={{ color: '#0d08e3' }} />
                                    </div>
                                  )}
                  <Select
                                    placeholder="Select source chain"
                    selectedKeys={sourceChain ? new Set([sourceChain]) : new Set()}
                    onSelectionChange={(keys) => {
                      if (keys === "all") return;
                      setSourceChain(Array.from(keys)[0]);
                    }}
                    variant="bordered"
                    classNames={{
                                      trigger: "h-12 rounded-xl bg-white/90 border-2 border-gray-200 flex-1",
                                      value: "text-foreground flex items-center font-semibold text-sm",
                    }}
                  >
                    {availableChains.map((chain) => (
                      <SelectItem key={chain.key} textValue={chain.name}>
                                        <div className="flex items-center gap-2">
                                          {chain.image && (
                                            <img src={chain.image} alt={chain.name} className="w-5 h-5 rounded-full" />
                                          )}
                                          <span>{chain.name}</span>
                                        </div>
                      </SelectItem>
                    ))}
                  </Select>
                                </div>
                              </CardBody>
                            </Card>
                          </div>

                          {/* To Chain */}
                          <div className="space-y-2">
                            <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                              <ArrowDown className="w-4 h-4" style={{ color: '#0d08e3' }} />
                              <span>To Chain</span>
                            </label>
                            <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 shadow-md">
                              <CardBody className="p-4">
                                <div className="flex items-center gap-3">
                                  {destinationChain && destinationChains.find(c => c.key === destinationChain)?.image ? (
                                    <img 
                                      src={destinationChains.find(c => c.key === destinationChain).image} 
                                      alt="Destination" 
                                      className="w-10 h-10 rounded-full border-2 border-white shadow-md" 
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-full bg-indigo-200 border-2 border-white flex items-center justify-center">
                                      <ArrowDown className="w-5 h-5" style={{ color: '#0d08e3' }} />
                                    </div>
                                  )}
                  <Select
                                    placeholder="Select destination chain"
                    selectedKeys={destinationChain ? new Set([destinationChain]) : new Set()}
                    onSelectionChange={(keys) => {
                      if (keys === "all") return;
                      setDestinationChain(Array.from(keys)[0]);
                    }}
                    variant="bordered"
                    isDisabled={!sourceChain}
                    classNames={{
                                      trigger: "h-12 rounded-xl bg-white/90 border-2 border-gray-200 flex-1",
                                      value: "text-foreground flex items-center font-semibold text-sm",
                    }}
                  >
                    {destinationChains.map((chain) => (
                      <SelectItem key={chain.key} textValue={chain.name}>
                                        <div className="flex items-center gap-2">
                                          {chain.image && (
                                            <img src={chain.image} alt={chain.name} className="w-5 h-5 rounded-full" />
                                          )}
                                          <span>{chain.name}</span>
                                        </div>
                      </SelectItem>
                    ))}
                  </Select>
                                </div>
                              </CardBody>
                            </Card>
                          </div>
                        </div>

                        {/* Axelar Bridge Indicator */}
                        <div className="flex justify-center -my-2 z-10 relative">
                          <div className="bg-indigo-100 p-3 rounded-full border-2 border-white shadow-lg flex items-center gap-2">
                            <img src="/assets/axelar.png" alt="Axelar" className="w-6 h-6 rounded-full" />
                            <ArrowLeftRight className="w-4 h-4" style={{ color: '#0d08e3' }} />
                          </div>
                        </div>
                </div>

                {/* Token Selection */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                          <img src="/assets/axelar.png" alt="Axelar" className="w-4 h-4 rounded-full" />
                          <span>Token</span>
                        </label>
                        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 shadow-md">
                          <CardBody className="p-4">
                            <div className="flex items-center gap-3">
                              {selectedToken && (
                                <img 
                                  src="/assets/usdc.png" 
                                  alt={selectedToken} 
                                  className="w-10 h-10 rounded-full border-2 border-white shadow-md" 
                                />
                              )}
                <Select
                  placeholder={loadingTokens ? "Loading tokens..." : "Select token"}
                  selectedKeys={selectedToken ? new Set([selectedToken]) : new Set()}
                  onSelectionChange={(keys) => {
                    if (keys === "all") return;
                    setSelectedToken(Array.from(keys)[0]);
                  }}
                  variant="bordered"
                  classNames={{
                                  trigger: "h-12 rounded-xl bg-white/90 border-2 border-gray-200 flex-1",
                                  value: "text-foreground flex items-center font-semibold text-sm",
                  }}
                  disallowEmptySelection
                  isDisabled={loadingTokens || (isPrivacyRoute && transferMode === "pool")}
                >
                  {tokenOptions.map((token) => (
                    <SelectItem key={token.symbol} textValue={token.symbol}>
                      <div className="flex items-center gap-2">
                                      <img src="/assets/usdc.png" alt={token.symbol} className="w-5 h-5 rounded-full" />
                                      <span className="font-medium">{token.symbol}</span>
                      </div>
                    </SelectItem>
                  ))}
                </Select>
                            </div>
                            {/* Request TUSDC Button */}
                            {selectedToken === "TUSDC" && evmAddress && (
                              <div className="mt-3">
                                {/* Check if on supported chain for TUSDC */}
                                {chainId && (chainId === 84532 || chainId === 421614) ? (
                                  <>
                                    <Button
                                      size="sm"
                                      color="primary"
                                      variant="flat"
                                      onPress={handleRequestTUSDC}
                                      isLoading={requestingToken}
                                      isDisabled={requestingToken}
                                      startContent={!requestingToken && <Gift className="w-4 h-4" />}
                                      className="w-full"
                                    >
                                      {requestingToken ? "Requesting..." : "Request 100 TUSDC"}
                                    </Button>
                                    <p className="text-xs text-gray-500 mt-1 text-center">
                                      Get test tokens from deployer account
                                    </p>
                                  </>
                                ) : (
                                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-2">
                                    <p className="text-xs text-yellow-800 text-center">
                                      Switch to Base Sepolia or Arbitrum Sepolia to request TUSDC
                                    </p>
                                  </div>
                                )}
                                
                                {/* Show last transaction hash */}
                                {lastTokenRequestTx && (
                                  <Card className="bg-white border border-green-200 mt-3">
                                    <CardBody className="p-3">
                                      <div className="flex items-center gap-2">
                                        <CheckCircle2 className="size-4 text-green-600" />
                                        <div className="flex-1">
                                          <p className="text-xs font-semibold text-green-900 mb-1">
                                            Last Request Transaction
                                          </p>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-mono text-gray-600">
                                              {lastTokenRequestTx.hash.substring(0, 10)}...{lastTokenRequestTx.hash.substring(lastTokenRequestTx.hash.length - 8)}
                                            </span>
                                            {lastTokenRequestTx.explorerUrl && (
                                              <a
                                                href={lastTokenRequestTx.explorerUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:text-blue-800 underline flex items-center gap-1"
                                              >
                                                <ExternalLink className="w-3 h-3" />
                                                View on Explorer
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    </CardBody>
                                  </Card>
                                )}
                              </div>
                            )}
                          </CardBody>
                        </Card>
                      </div>

                {/* Recipient Address */}
                      <div className="flex flex-col gap-3">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                            <Shield className="w-4 h-4" style={{ color: '#0d08e3' }} />
                            <span>Recipient Address</span>
                          </label>
                          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 shadow-md">
                            <CardBody className="p-4">
                  <Input
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    variant="bordered"
                    classNames={{
                                  inputWrapper: "h-12 rounded-xl bg-white/90 border-2 border-gray-200",
                                  input: "font-mono text-sm",
                    }}
                    endContent={
                      checkingStealthKeys && (
                        <Spinner size="sm" style={{ color: '#0d08e3' }} />
                      )
                    }
                  />
                            </CardBody>
                          </Card>
                        </div>
                  {/* Stealth Mode Indicator */}
                  {recipientAddress && recipientAddress.length === 42 && !checkingStealthKeys && (
                          <Card className={stealthMode ? "bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 shadow-md" : "bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 shadow-md"}>
                            <CardBody className="p-3">
                              <div className="flex items-center gap-3">
                      {stealthMode ? (
                                  <>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-md">
                                      <Shield className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-green-900">Stealth Mode Active</p>
                                      <p className="text-xs text-green-700">Private transfer enabled</p>
                                    </div>
                                  </>
                      ) : (
                                  <>
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-md">
                                      <AlertCircle className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-amber-900">Direct Mode</p>
                                      <p className="text-xs text-amber-700">Not registered for stealth</p>
                                    </div>
                                  </>
                      )}
                    </div>
                            </CardBody>
                          </Card>
                  )}
                </div>

                {isPrivacyRoute && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[0.65rem] uppercase tracking-[0.3em] text-gray-500 font-semibold">
                      Transfer Mode
                    </p>
                    <div className="flex bg-gray-100 rounded-xl p-1 text-sm">
                      <button
                        type="button"
                        onClick={() => handleTransferModeChange("pool")}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${transferMode === "pool" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Privacy Pool
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTransferModeChange("direct")}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${transferMode === "direct" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                      >
                        Direct Bridge
                      </button>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1 leading-snug">
                      <p><strong className="font-semibold">Privacy Pool:</strong> spend from the shared Base pool; the bridge originates from the contract, not your wallet.</p>
                      <p><strong className="font-semibold">Direct Bridge:</strong> standard Axelar send; quicker, but the source wallet is public.</p>
                    </div>
                  </div>
                )}

                {isPrivacyRoute && transferMode === "pool" && (
                  <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/70 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-indigo-900">🔒 Privacy Pool Controls</p>
                        <p className="text-xs text-indigo-800">Deposit fixed 10&nbsp;TUSDC notes and withdraw when you’re ready.</p>
                      </div>
                      <Chip color="primary" variant="flat" size="sm">Base → Polygon</Chip>
                    </div>
                    <div className="text-xs text-indigo-900 leading-relaxed space-y-1">
                      <p><strong className="font-semibold">How it works:</strong></p>
                      <ol className="list-decimal list-inside space-y-1 ml-3">
                        <li>Deposit to join the anonymity set.</li>
                        <li>Wait for more deposits (optional but improves privacy).</li>
                        <li>Withdraw with a ZK proof; Axelar bridge call originates from the pool.</li>
                      </ol>
                      <p><strong className="font-semibold">Tip:</strong> Waiting &gt;= 24h and/or multiple deposits increases privacy.</p>
                    </div>
                    {sourceChain && destinationChain && sourceBridgeAddress ? (
                      <AxelarPrivacyPoolPanel
                        evmAddress={evmAddress}
                        chainId={chainId}
                        sourceChainKey={sourceChain}
                        destinationChainKey={destinationChain}
                        recipientAddress={recipientAddress || ""}
                        recipientMetaAddress={recipientMetaAddress}
                        connectedBridgeAddress={sourceBridgeAddress}
                      />
                    ) : (
                      <div className="text-center py-4 text-sm text-gray-600">
                        Please select source and destination chains first
                      </div>
                    )}
                  </div>
                )}

                {/* Amount */}
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                          <Coins className="w-4 h-4" style={{ color: '#0d08e3' }} />
                          <span>Amount</span>
                        </label>
                        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 shadow-md">
                          <CardBody className="p-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src="/assets/usdc.png" 
                                alt="Token" 
                                className="w-12 h-12 rounded-full border-2 border-white shadow-md flex-shrink-0" 
                              />
                <Input
                  placeholder="0.00"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  variant="bordered"
                                size="lg"
                  classNames={{
                                  input: "text-2xl font-bold",
                                  inputWrapper: "h-14 rounded-xl bg-white/90 border-2 border-gray-200 flex-1",
                  }}
                                endContent={
                                  <div className="flex items-center gap-2 pr-2">
                                    <span className="text-gray-800 font-semibold">{selectedToken || "Token"}</span>
                                  </div>
                                }
                />
                            </div>
                          </CardBody>
                        </Card>
                      </div>

                      {/* Gas Estimate */}
                      <div className="space-y-3">
                <Button
                            variant="bordered"
                  onClick={handleEstimateGas}
                  isLoading={estimatingGas}
                  isDisabled={!sourceChain || !destinationChain}
                            className="w-full rounded-xl border-2 bg-white/80 font-semibold h-12 text-sm shadow-md"
                            style={{ borderColor: '#0d08e3', color: '#0d08e3' }}
                            onMouseEnter={(e) => !estimatingGas && !(!sourceChain || !destinationChain) && (e.currentTarget.style.backgroundColor = '#f0f0ff')}
                            onMouseLeave={(e) => !estimatingGas && !(!sourceChain || !destinationChain) && (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.8)')}
                            startContent={<Zap className="w-4 h-4" />}
                          >
                            {estimatingGas ? "Estimating..." : "Estimate Gas Fee"}
                </Button>

                {gasEstimate && (
                          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 shadow-md">
                            <CardBody className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Zap className="w-5 h-5" style={{ color: '#0d08e3' }} />
                                  <span className="text-sm text-gray-800 font-bold">Estimated Gas:</span>
                    </div>
                                <span className="font-mono font-bold text-gray-900">{(Number(gasEstimate) / 1e18).toFixed(6)} ETH</span>
                  </div>
                            </CardBody>
                          </Card>
                )}
                      </div>

                {/* Status Display */}
                {txStatus !== TX_STATUS.IDLE && (
                        <Card className={isComplete ? "bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 shadow-md" : isFailed ? "bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-300 shadow-md" : "bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 shadow-md"}>
                          <CardBody className="p-4">
                            <div className="flex items-center gap-3">
                              {isProcessing && (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                                  <Spinner size="sm" className="text-white" />
                    </div>
                              )}
                              {isComplete && (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                                  <CheckCircle2 className="w-6 h-6 text-white" />
                                </div>
                              )}
                              {isFailed && (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                                  <AlertCircle className="w-6 h-6 text-white" />
                                </div>
                              )}
                              <div className="flex-1">
                                <p className={`text-base font-bold ${getStatusColor()} mb-1`}>{getStatusLabel()}</p>
                    {txHash && (
                      <a
                        href={getAxelarscanUrl(txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs hover:underline flex items-center gap-1"
                        style={{ color: '#0d08e3' }}
                      >
                        <img src="/assets/axelar.png" alt="Axelar" className="w-4 h-4 rounded-full" />
                        View on Axelarscan <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                            </div>
                          </CardBody>
                        </Card>
                )}

                {/* Error Display */}
                {error && (
                        <Card className="bg-gradient-to-br from-red-50 via-rose-50 to-pink-50 border-2 border-red-300 shadow-xl">
                          <CardBody className="p-5">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <div className="absolute inset-0 bg-red-400 rounded-full blur-lg opacity-30"></div>
                                <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg">
                                  <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                              </div>
                              <span className="text-base text-red-800 font-bold">{error}</span>
                            </div>
                          </CardBody>
                        </Card>
                )}

                {/* Send Button */}
                      <div className="pt-2">
                <Button
                  onClick={handleSendPayment}
                  isLoading={loading}
                  isDisabled={
                    !evmAddress || 
                    !isOnSourceChain || 
                    !sourceChain || 
                    !destinationChain || 
                    !recipientAddress || 
                    !amount || 
                    isProcessing ||
                    (amount && parseFloat(amount) <= 0)
                  }
                          className="w-full h-14 font-bold text-white shadow-xl hover:scale-[1.01] transition-all"
                          style={{ backgroundColor: '#0d08e3' }}
                  size="lg"
                          startContent={!loading && (
                            <div className="flex items-center gap-2">
                              <img src="/assets/axelar.png" alt="Axelar" className="w-5 h-5 rounded-full" />
                              <Send className="w-5 h-5" />
                            </div>
                          )}
                >
                          {!evmAddress 
                            ? "Connect Wallet First" 
                            : !isOnSourceChain 
                            ? `Switch to ${sourceChain ? AXELAR_CHAINS[sourceChain]?.name || sourceChain : "Source Chain"}` 
                            : !sourceChain || !destinationChain
                            ? "Select Chains"
                            : !recipientAddress
                            ? "Enter Recipient"
                            : !amount || (amount && parseFloat(amount) <= 0)
                            ? "Enter Amount"
                            : isProcessing 
                            ? "Processing..." 
                            : "Send Payment"}
                </Button>
                      </div>

                {/* Reset Button (show after completion/failure) */}
                {(isComplete || isFailed) && (
                  <Button
                          variant="bordered"
                    onClick={reset}
                          className="w-full rounded-xl border-2 border-gray-300 bg-white/80 text-gray-700 hover:bg-gray-100 hover:border-gray-400 font-semibold h-12 shadow-md"
                  >
                    New Payment
                  </Button>
                )}
              </>
            )}
                </div>
              </Tab>

              <Tab
                key="receive"
                title={
                  <div className="flex items-center gap-2">
                    <Eye size={18} />
                    <span>Receive</span>
                  </div>
                }
              >
                <div className="p-6 space-y-5 bg-white">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                  Scan for private payments sent to your stealth address.
                </p>
                  </div>

                {/* Stealth Registration Section */}
                {evmAddress && !isRegistered && (
                    <Card className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/10 to-indigo-500/10 border-2 border-indigo-300/50 shadow-xl backdrop-blur-sm">
                      <CardBody className="p-6">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                          <div className="flex items-center gap-5 flex-1">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 shadow-xl" style={{ backgroundColor: '#0d08e3' }}>
                              <Shield className="w-8 h-8 text-white" />
                            </div>
                            <div>
                              <span className="font-extrabold text-gray-900 block text-base mb-1">Enable Stealth Payments</span>
                              <span className="text-sm text-gray-600">Register to receive private payments securely</span>
                            </div>
                      </div>
                      <Button
                            className="text-white font-bold hover:scale-105 w-full md:w-auto h-12 shadow-xl transition-all"
                            style={{ backgroundColor: '#0d08e3' }}
                        onClick={handleRegisterWithSignature}
                        isLoading={registering}
                            startContent={!registering && <Shield className="w-5 h-5" />}
                            onMouseEnter={(e) => !registering && (e.currentTarget.style.backgroundColor = '#0a06b8')}
                            onMouseLeave={(e) => !registering && (e.currentTarget.style.backgroundColor = '#0d08e3')}
                      >
                            {registering ? "Registering..." : "Sign to Register"}
                      </Button>
                    </div>
                      </CardBody>
                    </Card>
                )}

                {evmAddress && isRegistered && (
                    <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-2 border-green-300 shadow-xl">
                      <CardBody className="p-6">
                        <div className="flex items-center gap-5">
                          <div className="relative">
                            <div className="absolute inset-0 bg-green-400 rounded-full blur-lg opacity-40"></div>
                            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-xl">
                              <CheckCircle2 className="w-8 h-8 text-white" />
                    </div>
                  </div>
                          <div>
                            <span className="text-base font-extrabold text-green-900 block mb-1">Registered for Stealth</span>
                            <span className="text-sm text-green-700">You can receive private payments</span>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                )}

                {/* Chain Selection for Scanning */}
                {evmAddress && (
                  <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 shadow-lg">
                    <CardBody className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-amber-900">Important: Select Destination Chain</p>
                          <p className="text-xs text-amber-700 mt-1">
                            Cross-chain payments arrive on the <strong>destination chain</strong>. 
                            If you sent from Base → Polygon, scan on <strong>Polygon</strong>.
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <Select
                            label="Scan on chain"
                            placeholder="Select chain to scan"
                            selectedKeys={scanChain ? new Set([scanChain]) : new Set()}
                            onSelectionChange={(keys) => {
                              if (keys === "all") return;
                              setScanChain(Array.from(keys)[0]);
                            }}
                            variant="bordered"
                            size="sm"
                            classNames={{
                              trigger: "h-12 rounded-xl bg-white border-2 border-amber-300",
                              value: "font-semibold",
                            }}
                          >
                            {availableChains.map((chain) => (
                              <SelectItem key={chain.key} textValue={chain.name}>
                                <div className="flex items-center gap-2">
                                  {chain.image && (
                                    <img src={chain.image} alt={chain.name} className="w-5 h-5 rounded-full" />
                                  )}
                                  <span>{chain.name}</span>
                                  {chain.key === "polygon" && (
                                    <Chip size="sm" color="success" variant="flat" className="ml-auto">Recommended</Chip>
                                  )}
                                </div>
                              </SelectItem>
                            ))}
                          </Select>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* Scan Button */}
                  {evmAddress && (
                <Button
                  onClick={handleScanPayments}
                  isLoading={scanning}
                      className="w-full h-14 font-bold text-white shadow-xl hover:scale-[1.01] transition-all"
                      style={{ backgroundColor: '#0d08e3' }}
                  size="lg"
                      startContent={!scanning && (
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          <Eye className="w-5 h-5" />
                        </div>
                      )}
                      onMouseEnter={(e) => !scanning && (e.currentTarget.style.backgroundColor = '#0a06b8')}
                      onMouseLeave={(e) => !scanning && (e.currentTarget.style.backgroundColor = '#0d08e3')}
                >
                  {scanning ? `Scanning ${AXELAR_CHAINS[scanChain]?.name || 'Blockchain'}...` : `Scan on ${AXELAR_CHAINS[scanChain]?.name || 'Selected Chain'}`}
                </Button>
                  )}
                  {scanning && scanProgress?.totalBlocks ? (
                    <div className="text-center text-xs text-gray-600 -mt-2">
                      Scanning {AXELAR_CHAINS[scanChain]?.name} blocks{" "}
                      <span className="font-mono">
                        {scanProgress.startBlock ?? "?"}-{scanProgress.endBlock ?? "?"}
                      </span>{" "}
                      ({scanProgress.scannedBlocks}/{scanProgress.totalBlocks}
                      {scanProgress.chunkSize ? `, chunk ${scanProgress.chunkSize}` : ""})
                    </div>
                  ) : null}

                {/* Results List */}
                {scannedPayments.length > 0 && (
                    <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <h3 className="font-bold text-gray-900 text-base">Found Payments ({scannedPayments.length})</h3>
                      </div>
                    {scannedPayments.map((payment, idx) => (
                        <Card key={idx} className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 shadow-xl backdrop-blur-sm">
                          <CardBody className="p-6">
                            <div className="flex justify-between items-start mb-5">
                              <div className="flex items-center gap-5">
                                <div className="relative">
                                  <div className="absolute inset-0 bg-indigo-400 rounded-full blur-lg opacity-30"></div>
                                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-xl">
                                    <img src="/assets/usdc.png" alt={payment.symbol} className="w-10 h-10 rounded-full" />
                            </div>
                                </div>
                                <div>
                                  <span className="font-extrabold text-3xl text-gray-900 block mb-2">
                                    {(Number(payment.amount) / 1e6).toFixed(6)} {payment.symbol === "ITS_TOKEN" ? "TUSDC" : payment.symbol}
                            </span>
                                  <div className="flex items-center gap-3">
                                    <Chip size="md" color="success" variant="flat" className="h-auto py-1.5">
                                      <CheckCircle2 className="w-4 h-4 mr-1" />
                                      <span className="leading-tight font-semibold">Verified</span>
                                    </Chip>
                                    <span className="text-sm text-gray-600 font-medium">Block {payment.blockNumber}</span>
                          </div>
                                </div>
                              </div>
                          </div>

                            <Card className="bg-white/90 border-2 border-gray-200 mb-5 shadow-md">
                              <CardBody className="p-4">
                                <p className="text-xs text-gray-600 mb-2 font-bold uppercase tracking-wide">Stealth Address:</p>
                                <code className="text-sm text-gray-800 break-all font-mono bg-gray-50 p-2 rounded-lg block">
                                  {payment.stealthAddress}
                                </code>
                              </CardBody>
                            </Card>

                          <Button
                              className="w-full h-14 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white font-bold hover:scale-[1.02] shadow-xl transition-all"
                            onClick={() => handleWithdraw(payment)}
                            isLoading={withdrawing === payment.txHash}
                              startContent={!withdrawing && <ArrowDown className="w-6 h-6" />}
                          >
                              {withdrawing === payment.txHash ? "Withdrawing..." : "Withdraw to Main Wallet"}
                          </Button>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}

                  {scannedPayments.length === 0 && !scanning && evmAddress && (
                    <Card className="bg-gradient-to-br from-gray-50/80 to-gray-100/80 border-2 border-gray-300 shadow-lg backdrop-blur-sm">
                      <CardBody className="p-16">
                        <div className="flex flex-col items-center gap-5 text-center">
                          <div className="relative">
                            <div className="absolute inset-0 bg-gray-300 rounded-full blur-xl opacity-30"></div>
                            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-xl">
                              <Eye className="w-12 h-12 text-gray-500" />
                  </div>
              </div>
                          <div>
                            <p className="text-gray-800 font-bold text-lg mb-2">No Pending Payments</p>
                            <p className="text-gray-600 text-base">Scan again later to check for new payments.</p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>
                  )}
                </div>
              </Tab>
            </Tabs>
          </CardBody>
        </Card>

        {/* Info Card - Compact */}
        <Card className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/10 to-indigo-500/10 border-2 border-indigo-300/50 shadow-xl rounded-2xl backdrop-blur-xl">
          <CardBody className="p-5">
            <div className="flex items-center gap-3 mb-4">
              <img src="/assets/axelar.png" alt="Axelar" className="w-10 h-10 rounded-full" />
              <h3 className="font-bold text-gray-900 text-base">How It Works</h3>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/60 backdrop-blur-sm border border-indigo-200">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0" style={{ backgroundColor: '#0d08e3' }}>
                  1
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-bold text-gray-900 mb-1 text-sm">Select Chains</p>
                  <p className="text-gray-600 text-xs">Choose source and destination</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/60 backdrop-blur-sm border border-indigo-200">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0" style={{ backgroundColor: '#0d08e3' }}>
                  2
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-bold text-gray-900 mb-1 text-sm">Enter Address</p>
                  <p className="text-gray-600 text-xs">Recipient stealth or regular address</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/60 backdrop-blur-sm border border-indigo-200">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0" style={{ backgroundColor: '#0d08e3' }}>
                  3
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-bold text-gray-900 mb-1 text-sm">Axelar Routing</p>
                  <p className="text-gray-600 text-xs">Payment routed via Axelar</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/60 backdrop-blur-sm border border-indigo-200">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0" style={{ backgroundColor: '#0d08e3' }}>
                  4
                </div>
                <div className="flex-1 pt-1">
                  <p className="font-bold text-gray-900 mb-1 text-sm">Private Delivery</p>
                  <p className="text-gray-600 text-xs">Funds delivered privately</p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
