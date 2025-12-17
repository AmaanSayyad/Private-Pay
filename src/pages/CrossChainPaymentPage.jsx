import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody, Input, Select, SelectItem, Spinner, Chip, Accordion, AccordionItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@nextui-org/react";
import toast from "react-hot-toast";
import { Icons } from "../components/shared/Icons.jsx";
import { useAxelarPayment, TX_STATUS } from "../hooks/useAxelarPayment.js";
import { scanStealthPayments, deriveStealthPrivateKey, ERC20_ABI, GATEWAY_ABI } from "../lib/axelar/crossChainPayment.js";
import { AXELAR_CHAINS, getSupportedChains, getAxelarscanUrl, getAvailableTokens } from "../lib/axelar/index.js";
import { deriveKeysFromSignature } from "../lib/aptos/stealthAddress.js";

// Bridge contract address (same on all chains)
const BRIDGE_ADDRESS = import.meta.env.VITE_AXELAR_BRIDGE_ADDRESS || "0x1764681c26D04f0E9EBb305368cfda808A9F6f8f";

// Bridge ABI for meta address lookup and registration
const BRIDGE_ABI = [
  "function getMetaAddress(address user) external view returns (bytes spendPubKey, bytes viewingPubKey)",
  "function registerMetaAddress(bytes spendPubKey, bytes viewingPubKey) external",
];

// Network detection
const isMainnet = import.meta.env.VITE_NETWORK === "mainnet";

// Fallback tokens if API fails
const FALLBACK_TOKENS = isMainnet
  ? [{ symbol: "axlUSDC", name: "Axelar USDC", decimals: 6 }]
  : [{ symbol: "TUSDC", name: "Test USDC", decimals: 6 }]; // Our deployed test token at 0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B

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

  const [sourceChain, setSourceChain] = useState("");
  const [destinationChain, setDestinationChain] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("");
  const [availableTokens, setAvailableTokens] = useState(FALLBACK_TOKENS);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [estimatingGas, setEstimatingGas] = useState(false);

  // Stealth mode state
  const [stealthMode, setStealthMode] = useState(null); // null = checking, true = stealth, false = direct
  const [recipientMetaAddress, setRecipientMetaAddress] = useState(null);
  const [checkingStealthKeys, setCheckingStealthKeys] = useState(false);

  // Scanning State
  const [scanning, setScanning] = useState(false);
  const [scannedPayments, setScannedPayments] = useState([]);
  const [withdrawing, setWithdrawing] = useState(null); // ID of payment being withdrawn

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
        const bridgeContract = new ethers.Contract(BRIDGE_ADDRESS, BRIDGE_ABI, provider);

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
  }, [evmAddress]);

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
      const bridgeContract = new ethers.Contract(BRIDGE_ADDRESS, BRIDGE_ABI, signer);
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

  // Scan for payments
  const handleScanPayments = async () => {
    if (!evmAddress) return;

    setScanning(true);
    setScannedPayments([]);

    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // 1. Get keys (either from session or ask to sign)
      let signatureHash = sessionStorage.getItem(`stealth_sig_${evmAddress}`);

      if (!signatureHash) {
        const message = "Sign this message to enable Stealth Payments on PrivatePay.\n\nThis signature will be used to generate your unique stealth keys deterministically.\n\nIMPORTANT: Signing this does not cost gas.";
        const signature = await signer.signMessage(message);
        signatureHash = ethers.keccak256(signature);
        sessionStorage.setItem(`stealth_sig_${evmAddress}`, signatureHash);
      }

      const keys = deriveKeysFromSignature(signatureHash);

      // 2. Scan
      console.log("Scanning for payments...");
      const payments = await scanStealthPayments({
        provider,
        bridgeAddress: BRIDGE_ADDRESS,
        viewingPrivateKey: keys.viewing.privateKey,
        spendPublicKey: keys.spend.publicKey,
        fromBlock: 0, // In prod, optimize this
      });

      console.log("Found payments:", payments);
      setScannedPayments(payments);

      if (payments.length === 0) {
        toast("No stealth payments found", { icon: "🔍" });
      } else {
        toast.success(`Found ${payments.length} payments!`);
      }

    } catch (error) {
      console.error("Scanning error:", error);
      toast.error("Failed to scan payments");
    } finally {
      setScanning(false);
    }
  };

  // Withdraw funds
  const handleWithdraw = async (payment) => {
    setWithdrawing(payment.txHash);
    const toastId = toast.loading("Initializing withdrawal...");

    try {
      const { ethers } = await import("ethers");
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

      // 4. Resolve Token Address
      // We need the Axelar Gateway to find the token address for the symbol
      const bridgeContract = new ethers.Contract(BRIDGE_ADDRESS, BRIDGE_ABI, provider);
      // Note: BRIDGE_ABI in this file is minimal, we need to ensure it has 'gateway()'
      // The ABI defined at the top of this file is missing 'gateway()'. 
      // Let's use the full ABI from the hook if possible, or just add it dynamically.
      // Actually, we imported GATEWAY_ABI, but we need to call bridge.gateway() first.

      // Let's use a direct call for gateway address since we know the bridge ABI has it
      // (It was added in the previous steps to the contract)
      const bridgeGatewayABI = ["function gateway() external view returns (address)"];
      const bridgeForGateway = new ethers.Contract(BRIDGE_ADDRESS, bridgeGatewayABI, provider);
      const gatewayAddress = await bridgeForGateway.gateway();

      const gatewayContract = new ethers.Contract(gatewayAddress, GATEWAY_ABI, provider);
      const tokenAddress = await gatewayContract.tokenAddresses(payment.symbol);

      if (tokenAddress === ethers.ZeroAddress) {
        throw new Error(`Token ${payment.symbol} not found on this chain`);
      }

      const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, stealthWallet); // Connected to stealth wallet

      // 5. Check Stealth Wallet ETH Balance for Gas
      const gasPrice = (await provider.getFeeData()).gasPrice;
      const gasLimit = 100000n; // Standard ERC20 transfer is ~65k, buffer to 100k
      const gasCost = gasPrice * gasLimit;

      const stealthBalance = await provider.getBalance(stealthWallet.address);

      if (stealthBalance < gasCost) {
        toast.loading(`Stealth wallet needs gas. Sending ETH...`, { id: toastId });

        // Send ETH from Main Wallet -> Stealth Wallet
        // Add a buffer to gas cost (e.g. 2x) to be safe
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

      // Get full token balance to sweep
      const tokenBalance = await tokenContract.balanceOf(stealthWallet.address);

      if (tokenBalance === 0n) {
        throw new Error("Stealth wallet has 0 token balance. Already withdrawn?");
      }

      const withdrawTx = await tokenContract.transfer(evmAddress, tokenBalance);
      await withdrawTx.wait();

      toast.success("Withdrawal complete! Funds sent to your wallet.", { id: toastId });

      // Remove from list or mark as withdrawn
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
        const provider = new ethers.BrowserProvider(window.ethereum);
        const bridgeContract = new ethers.Contract(BRIDGE_ADDRESS, BRIDGE_ABI, provider);

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
  }, [recipientAddress]);

  // Fetch available tokens when chains change
  useEffect(() => {
    async function fetchTokens() {
      if (!sourceChain || !destinationChain) {
        setAvailableTokens(FALLBACK_TOKENS);
        return;
      }

      setLoadingTokens(true);
      try {
        const tokens = await getAvailableTokens(sourceChain, destinationChain);
        if (tokens.length > 0) {
          setAvailableTokens(tokens);
          // Auto-select first token if none selected
          if (!selectedToken || !tokens.find(t => t.symbol === selectedToken)) {
            setSelectedToken(tokens[0].symbol);
          }
        } else {
          setAvailableTokens(FALLBACK_TOKENS);
          setSelectedToken(FALLBACK_TOKENS[0].symbol);
        }
      } catch (err) {
        console.error("Error fetching tokens:", err);
        setAvailableTokens(FALLBACK_TOKENS);
      } finally {
        setLoadingTokens(false);
      }
    }

    fetchTokens();
  }, [sourceChain, destinationChain]);

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

  const switchToSepolia = async () => {
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }], // Sepolia chainId
      });
    } catch (err) {
      // Chain not added, add it
      if (err.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0xaa36a7",
            chainName: "Sepolia Testnet",
            rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
            nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          }],
        });
      }
    }
  };

  const isOnSepolia = chainId === 11155111;

  // Get all available chains
  const availableChains = useMemo(() => {
    return getSupportedChains();
  }, []);

  // Filter destination chains (exclude source)
  const destinationChains = useMemo(() => {
    return availableChains.filter(chain => chain.key !== sourceChain);
  }, [availableChains, sourceChain]);

  // Handle gas estimation
  const handleEstimateGas = async () => {
    if (!sourceChain || !destinationChain) {
      toast.error("Select source and destination chains");
      return;
    }

    setEstimatingGas(true);
    try {
      const estimate = await estimateGas({ sourceChain, destinationChain });
      toast.success(`Gas estimated: ${(Number(estimate) / 1e18).toFixed(6)} ETH`);
    } catch (err) {
      toast.error("Failed to estimate gas");
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
    if (!isOnSepolia) {
      toast.error("Please switch to Sepolia network");
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

  return (
    <div className="flex min-h-screen w-full items-start justify-center py-20 px-4 md:px-10 bg-gradient-to-br from-white to-indigo-50/30">
      <div className="relative flex flex-col gap-4 w-full max-w-md">
        <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl p-6">
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center justify-between w-full mb-2">
              <h1 className="font-bold text-xl text-gray-900">Cross-Chain Payment</h1>
              <Button
                onClick={() => navigate("/")}
                className="bg-white border border-gray-200 rounded-full px-4 h-10 flex items-center gap-2"
                variant="flat"
              >
                <Icons.back className="size-4" />
                <span className="text-sm">Back</span>
              </Button>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
              <button
                onClick={() => setActiveTab("send")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "send" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                Send
              </button>
              <button
                onClick={() => setActiveTab("receive")}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "receive" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                Receive
              </button>
            </div>

            {/* EVM Wallet Connection (Common) */}
            {!evmAddress ? (
              <Button
                color="primary"
                onClick={connectEvmWallet}
                isLoading={evmConnecting}
                className="w-full rounded-xl h-12 mb-2"
                startContent={
                  <svg className="w-5 h-5" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M32.9582 1L19.8241 10.7183L22.2665 4.99099L32.9582 1Z" fill="#E17726" />
                    <path d="M2.04858 1L15.0707 10.809L12.7402 4.99098L2.04858 1Z" fill="#E27625" />
                  </svg>
                }
              >
                Connect MetaMask
              </Button>
            ) : (
              <div className="bg-green-50 border border-green-200 p-3 rounded-xl mb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-green-600 font-medium">Connected</p>
                    <p className="text-sm font-mono text-green-800">
                      {evmAddress.slice(0, 6)}...{evmAddress.slice(-4)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isOnSepolia && (
                      <Button
                        size="sm"
                        color="warning"
                        variant="flat"
                        onClick={switchToSepolia}
                        className="rounded-lg"
                      >
                        Switch to Sepolia
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SEND TAB */}
            {activeTab === "send" && (
              <>
                <p className="text-sm text-gray-500 mb-2">
                  Send private stealth payments across blockchains via Axelar
                </p>

                {/* Chain Selection */}
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    label="From Chain"
                    placeholder="Select source"
                    selectedKeys={sourceChain ? [sourceChain] : []}
                    onSelectionChange={(keys) => setSourceChain(Array.from(keys)[0])}
                    variant="bordered"
                    classNames={{
                      trigger: "rounded-xl",
                      value: "text-foreground",
                    }}
                  >
                    {availableChains.map((chain) => (
                      <SelectItem key={chain.key} textValue={chain.name}>
                        {chain.name}
                      </SelectItem>
                    ))}
                  </Select>

                  <Select
                    label="To Chain"
                    placeholder="Select destination"
                    selectedKeys={destinationChain ? [destinationChain] : []}
                    onSelectionChange={(keys) => setDestinationChain(Array.from(keys)[0])}
                    variant="bordered"
                    isDisabled={!sourceChain}
                    classNames={{
                      trigger: "rounded-xl",
                      value: "text-foreground",
                    }}
                  >
                    {destinationChains.map((chain) => (
                      <SelectItem key={chain.key} textValue={chain.name}>
                        {chain.name}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                {/* Token Selection */}
                <Select
                  label="Token"
                  placeholder={loadingTokens ? "Loading tokens..." : "Select token"}
                  selectedKeys={selectedToken ? [selectedToken] : []}
                  onSelectionChange={(keys) => setSelectedToken(Array.from(keys)[0])}
                  variant="bordered"
                  classNames={{
                    trigger: "rounded-xl",
                    value: "text-foreground",
                  }}
                  disallowEmptySelection
                  isDisabled={loadingTokens}
                >
                  {availableTokens.map((token) => (
                    <SelectItem key={token.symbol} textValue={token.symbol}>
                      <div className="flex items-center gap-2">
                        {token.image && (
                          <img src={token.image} alt={token.symbol} className="w-5 h-5 rounded-full" />
                        )}
                        <span>{token.symbol}</span>
                        <span className="text-xs text-gray-500">({token.name})</span>
                      </div>
                    </SelectItem>
                  ))}
                </Select>

                {/* Recipient Address */}
                <div className="flex flex-col gap-2">
                  <Input
                    label="Recipient Address"
                    placeholder="0x..."
                    value={recipientAddress}
                    onChange={(e) => setRecipientAddress(e.target.value)}
                    variant="bordered"
                    classNames={{
                      inputWrapper: "rounded-xl",
                    }}
                    endContent={
                      checkingStealthKeys && (
                        <Spinner size="sm" />
                      )
                    }
                  />
                  {/* Stealth Mode Indicator */}
                  {recipientAddress && recipientAddress.length === 42 && !checkingStealthKeys && (
                    <div className="flex items-center gap-2">
                      {stealthMode ? (
                        <Chip color="success" variant="flat" size="sm" startContent={<span>🔒</span>}>
                          Stealth Mode - Private Transfer
                        </Chip>
                      ) : (
                        <Chip color="warning" variant="flat" size="sm" startContent={<span>⚠️</span>}>
                          Direct Mode - Recipient not registered for stealth
                        </Chip>
                      )}
                    </div>
                  )}
                </div>

                {/* Amount */}
                <Input
                  label="Amount"
                  placeholder="0.00"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  variant="bordered"
                  endContent={
                    <span className="text-gray-500 text-sm">{selectedToken}</span>
                  }
                  classNames={{
                    inputWrapper: "rounded-xl",
                  }}
                />

                {/* Gas Estimate Button */}
                <Button
                  color="default"
                  variant="flat"
                  onClick={handleEstimateGas}
                  isLoading={estimatingGas}
                  isDisabled={!sourceChain || !destinationChain}
                  className="w-full rounded-xl"
                >
                  Estimate Gas Fee
                </Button>

                {gasEstimate && (
                  <div className="bg-gray-50 p-3 rounded-xl text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Gas:</span>
                      <span className="font-mono">{(Number(gasEstimate) / 1e18).toFixed(6)} ETH</span>
                    </div>
                  </div>
                )}

                {/* Status Display */}
                {txStatus !== TX_STATUS.IDLE && (
                  <div className={`bg-gray-50 p-3 rounded-xl ${getStatusColor()}`}>
                    <div className="flex items-center gap-2">
                      {isProcessing && <Spinner size="sm" />}
                      <span className="text-sm font-medium">{getStatusLabel()}</span>
                    </div>
                    {txHash && (
                      <a
                        href={getAxelarscanUrl(txHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:underline mt-1 block"
                      >
                        View on Axelarscan →
                      </a>
                    )}
                  </div>
                )}

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 p-3 rounded-xl text-red-600 text-sm">
                    {error}
                  </div>
                )}

                {/* Send Button */}
                <Button
                  color="primary"
                  onClick={handleSendPayment}
                  isLoading={loading}
                  isDisabled={!evmAddress || !isOnSepolia || !sourceChain || !destinationChain || !recipientAddress || !amount || isProcessing}
                  className="w-full rounded-xl h-12"
                  size="lg"
                >
                  {!evmAddress ? "Connect Wallet First" : isProcessing ? "Processing..." : "Send Cross-Chain Payment"}
                </Button>

                {/* Reset Button (show after completion/failure) */}
                {(isComplete || isFailed) && (
                  <Button
                    color="default"
                    variant="flat"
                    onClick={reset}
                    className="w-full rounded-xl"
                  >
                    New Payment
                  </Button>
                )}
              </>
            )}

            {/* RECEIVE TAB */}
            {activeTab === "receive" && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-500">
                  Scan for private payments sent to your stealth address.
                </p>

                {/* Stealth Registration Section */}
                {evmAddress && !isRegistered && (
                  <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-2xl border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-purple-900">Enable Stealth Payments</span>
                        <span className="text-xs text-purple-700">Register to receive private payments</span>
                      </div>
                      <Button
                        color="secondary"
                        variant="flat"
                        size="sm"
                        onClick={handleRegisterWithSignature}
                        isLoading={registering}
                        className="rounded-xl"
                      >
                        ✍️ Sign to Register
                      </Button>
                    </div>
                  </div>
                )}

                {evmAddress && isRegistered && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-xl border border-green-200">
                    <div className="flex items-center gap-2">
                      <span className="text-green-600">✓</span>
                      <span className="text-sm text-green-800">You're registered for stealth payments</span>
                    </div>
                  </div>
                )}

                {/* Scan Button */}
                <Button
                  color="primary"
                  onClick={handleScanPayments}
                  isLoading={scanning}
                  isDisabled={!evmAddress}
                  className="w-full rounded-xl h-12"
                  size="lg"
                  startContent={!scanning && <span>🔍</span>}
                >
                  {scanning ? "Scanning Blockchain..." : "Scan for Payments"}
                </Button>

                {/* Results List */}
                {scannedPayments.length > 0 && (
                  <div className="flex flex-col gap-3 mt-2">
                    <h3 className="font-semibold text-gray-900">Found Payments</h3>
                    {scannedPayments.map((payment, idx) => (
                      <Card key={idx} className="bg-gray-50 border border-gray-200 shadow-none">
                        <CardBody className="p-3">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">
                                {ethers.formatUnits(payment.amount, 6)} {payment.symbol}
                              </span>
                              <Chip size="sm" color="success" variant="flat">Verified</Chip>
                            </div>
                            <span className="text-xs text-gray-500">
                              Block {payment.blockNumber}
                            </span>
                          </div>

                          <div className="text-xs text-gray-500 break-all mb-3">
                            Stealth Address: {payment.stealthAddress}
                          </div>

                          <Button
                            size="sm"
                            color="secondary"
                            variant="flat"
                            className="w-full"
                            onClick={() => handleWithdraw(payment)}
                            isLoading={withdrawing === payment.txHash}
                          >
                            Withdraw to Main Wallet
                          </Button>
                        </CardBody>
                      </Card>
                    ))}
                  </div>
                )}

                {scannedPayments.length === 0 && !scanning && (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No pending payments found.
                  </div>
                )}
              </div>
            )}

          </CardBody>
        </Card>

        {/* Info Card */}
        <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl">
          <CardBody className="p-4">
            <h3 className="font-semibold text-gray-900 mb-2">How it works</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Select source and destination chains</li>
              <li>• Enter recipient stealth address</li>
              <li>• Payment is routed via Axelar network</li>
              <li>• Recipient receives funds privately</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
