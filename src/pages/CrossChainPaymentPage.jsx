import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody, Input, Select, SelectItem, Spinner } from "@nextui-org/react";
import toast from "react-hot-toast";
import { Icons } from "../components/shared/Icons.jsx";
import { useAxelarPayment, TX_STATUS } from "../hooks/useAxelarPayment.js";
import { AXELAR_CHAINS, getSupportedChains, getAxelarscanUrl } from "../lib/axelar/index.js";

// Supported tokens for cross-chain transfers (per Axelar official docs)
const SUPPORTED_TOKENS = [
  { symbol: "aUSDC", name: "aUSDC", decimals: 6 },
];

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
  const [selectedToken, setSelectedToken] = useState("aUSDC");
  const [estimatingGas, setEstimatingGas] = useState(false);

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

      // Use direct address mode for testing
      // In production, you would fetch meta address from registry for stealth payments
      const result = await sendCrossChainPayment({
        sourceChain,
        destinationChain,
        directAddress: recipientAddress, // Direct transfer mode
        amount: parseFloat(amount),
        tokenSymbol: selectedToken,
        signer,
      });

      if (result.success) {
        toast.success("Cross-chain payment initiated!");
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
                    {isOnSepolia && (
                      <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">
                        Sepolia ✓
                      </span>
                    )}
                    <Button
                      size="sm"
                      color="danger"
                      variant="flat"
                      onClick={() => {
                        setEvmAddress(null);
                        setChainId(null);
                      }}
                      className="rounded-lg"
                    >
                      Disconnect
                    </Button>
                  </div>
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
              placeholder="Select token"
              selectedKeys={selectedToken ? [selectedToken] : []}
              onSelectionChange={(keys) => setSelectedToken(Array.from(keys)[0])}
              variant="bordered"
              classNames={{
                trigger: "rounded-xl",
                value: "text-foreground",
              }}
              disallowEmptySelection
              defaultSelectedKeys={["aUSDC"]}
            >
              {SUPPORTED_TOKENS.map((token) => (
                <SelectItem key={token.symbol} textValue={token.name}>
                  {token.name}
                </SelectItem>
              ))}
            </Select>

            {/* Recipient Address */}
            <Input
              label="Recipient Address"
              placeholder="0x..."
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              variant="bordered"
              classNames={{
                inputWrapper: "rounded-xl",
              }}
            />

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
    </div>
  );
}
