import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody, Input, Select, SelectItem, Spinner, Chip, Accordion, AccordionItem, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@nextui-org/react";
import toast from "react-hot-toast";
import { Icons } from "../components/shared/Icons.jsx";
import { useAxelarPayment, TX_STATUS } from "../hooks/useAxelarPayment.js";
import { AXELAR_CHAINS, getSupportedChains, getAxelarscanUrl, getAvailableTokens } from "../lib/axelar/index.js";
import { generateMetaAddressKeys } from "../lib/aptos/stealthAddress.js";

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
  
  // Registration state
  const [isRegistered, setIsRegistered] = useState(false);
  const [checkingRegistration, setCheckingRegistration] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState(null);
  const [registering, setRegistering] = useState(false);
  const { isOpen: isKeysModalOpen, onOpen: onKeysModalOpen, onClose: onKeysModalClose } = useDisclosure();

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

  // Generate stealth keys
  const handleGenerateKeys = () => {
    try {
      const keys = generateMetaAddressKeys();
      setGeneratedKeys(keys);
      onKeysModalOpen();
      toast.success("Keys generated! Save your private keys securely.");
    } catch (error) {
      toast.error("Failed to generate keys");
      console.error(error);
    }
  };

  // Register meta address on bridge contract
  const handleRegisterMetaAddress = async () => {
    if (!generatedKeys || !evmAddress) {
      toast.error("Please generate keys and connect wallet first");
      return;
    }

    setRegistering(true);
    try {
      const { ethers } = await import("ethers");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const bridgeContract = new ethers.Contract(BRIDGE_ADDRESS, BRIDGE_ABI, signer);

      const spendPubKey = `0x${generatedKeys.spend.publicKey}`;
      const viewingPubKey = `0x${generatedKeys.viewing.publicKey}`;

      console.log("Registering meta address...");
      console.log("  spendPubKey:", spendPubKey);
      console.log("  viewingPubKey:", viewingPubKey);

      const tx = await bridgeContract.registerMetaAddress(spendPubKey, viewingPubKey);
      await tx.wait();

      toast.success("Registered for stealth payments!");
      setIsRegistered(true);
      onKeysModalClose();
    } catch (error) {
      console.error("Registration error:", error);
      toast.error(error.message || "Failed to register");
    } finally {
      setRegistering(false);
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

            <p className="text-sm text-gray-500 mb-2">
              Send private stealth payments across blockchains via Axelar
            </p>

            {/* EVM Wallet Connection */}
            {!evmAddress ? (
              <Button
                color="primary"
                onClick={connectEvmWallet}
                isLoading={evmConnecting}
                className="w-full rounded-xl h-12 mb-2"
                startContent={
                  <svg className="w-5 h-5" viewBox="0 0 35 33" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M32.9582 1L19.8241 10.7183L22.2665 4.99099L32.9582 1Z" fill="#E17726"/>
                    <path d="M2.04858 1L15.0707 10.809L12.7402 4.99098L2.04858 1Z" fill="#E27625"/>
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
                    onClick={handleGenerateKeys}
                    isLoading={checkingRegistration}
                    className="rounded-xl"
                  >
                    🔒 Register
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

      {/* Keys Generation Modal */}
      <Modal isOpen={isKeysModalOpen} onClose={onKeysModalClose} size="lg">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <span>🔐 Your Stealth Keys</span>
            <span className="text-sm font-normal text-gray-500">Save these keys securely - you'll need them to receive payments</span>
          </ModalHeader>
          <ModalBody>
            {generatedKeys && (
              <div className="flex flex-col gap-4">
                <div className="bg-red-50 border border-red-200 p-3 rounded-xl">
                  <p className="text-sm text-red-800 font-semibold">⚠️ Important: Save your private keys!</p>
                  <p className="text-xs text-red-700 mt-1">These private keys are needed to claim received payments. Store them securely and never share them.</p>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Spend Private Key (SAVE THIS!)</p>
                  <code className="text-xs break-all text-red-600">{generatedKeys.spend.privateKey}</code>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Viewing Private Key (SAVE THIS!)</p>
                  <code className="text-xs break-all text-red-600">{generatedKeys.viewing.privateKey}</code>
                </div>

                <div className="bg-blue-50 p-3 rounded-xl">
                  <p className="text-xs text-blue-500 mb-1">Spend Public Key (will be registered)</p>
                  <code className="text-xs break-all">{generatedKeys.spend.publicKey}</code>
                </div>

                <div className="bg-blue-50 p-3 rounded-xl">
                  <p className="text-xs text-blue-500 mb-1">Viewing Public Key (will be registered)</p>
                  <code className="text-xs break-all">{generatedKeys.viewing.publicKey}</code>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="danger" variant="light" onPress={onKeysModalClose}>
              Cancel
            </Button>
            <Button 
              color="primary" 
              onPress={handleRegisterMetaAddress}
              isLoading={registering}
            >
              I've Saved My Keys - Register
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
