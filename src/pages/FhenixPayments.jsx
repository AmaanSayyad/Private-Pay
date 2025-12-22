import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Card, CardBody, Tabs, Tab, Chip, Progress } from "@nextui-org/react";
import { Shield, Lock, Send, Wallet, CheckCircle2, AlertCircle, Loader2, Info, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { useFhenix } from "../hooks/useFhenix";
import { 
  confidentialTransfer, 
  getBalance, 
  getTokenInfo,
  devMint,
  checkWalletConnection,
  connectWallet,
  requestTestTokens
} from "../lib/fhenixContracts";
import { Icons } from "../components/shared/Icons.jsx";
import { MobilePageWrapper } from "../components/shared/MobileNav";
import { usePrivacy } from "../providers/PrivacyProvider";

export default function FhenixPayments() {
  const navigate = useNavigate();
  const { isInitialized, isInitializing, error, encrypt, isFallbackMode } = useFhenix();
  const { balanceHidden, toggleBalanceVisibility } = usePrivacy();

  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("transfer");
  const [balance, setBalance] = useState("0.00");
  const [tokenInfo, setTokenInfo] = useState({ name: "", symbol: "", decimals: 6 });
  const [encryptionState, setEncryptionState] = useState(null);
  const [txHash, setTxHash] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAccount, setWalletAccount] = useState(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [mintAmount, setMintAmount] = useState("100");
  const [isRequestingTokens, setIsRequestingTokens] = useState(false);
  const [requestAmount, setRequestAmount] = useState("100");

  // Check wallet connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      const status = await checkWalletConnection();
      setWalletConnected(status.isConnected);
      setWalletAccount(status.account);
      setIsCorrectNetwork(status.isCorrectNetwork);
    };
    checkConnection();
    
    // Listen for account changes
    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", checkConnection);
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
    
    return () => {
      if (typeof window !== "undefined" && window.ethereum) {
        window.ethereum.removeListener("accountsChanged", checkConnection);
        window.ethereum.removeListener("chainChanged", () => {});
      }
    };
  }, []);

  // Load token info and balance on mount
  useEffect(() => {
    const loadTokenInfo = async () => {
      try {
        const info = await getTokenInfo();
        setTokenInfo(info);
      } catch (err) {
        console.error("Failed to load token info:", err);
      }
    };
    loadTokenInfo();
  }, []);

  const loadBalance = async () => {
    try {
      if (typeof window === "undefined" || !window.ethereum) {
        return;
      }
      const provider = new (await import("ethers")).BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      
      const bal = await getBalance(account);
      // FHPAY has 6 decimals
      const formatted = (Number(bal) / 1_000_000).toFixed(6);
      setBalance(formatted);
    } catch (err) {
      console.error("Failed to load balance:", err);
    }
  };

  useEffect(() => {
    if (walletConnected) {
      loadBalance();
    }
  }, [walletConnected]);

  // Reinitialize CoFHE when wallet connects
  useEffect(() => {
    if (walletConnected && walletAccount && !isInitialized) {
      const reinitCoFHE = async () => {
        try {
          if (typeof window !== "undefined" && window.ethereum) {
            const provider = new (await import("ethers")).BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const { reinitFhenixFhe } = await import("../lib/fhenixFhe");
            await reinitFhenixFhe(provider, signer);
          }
        } catch (err) {
          console.error("Failed to reinitialize CoFHE:", err);
        }
      };
      reinitCoFHE();
    }
  }, [walletConnected, walletAccount, isInitialized]);

  const handleConnectWallet = async () => {
    try {
      const account = await connectWallet();
      setWalletAccount(account);
      setWalletConnected(true);
      
      // Check network
      const status = await checkWalletConnection();
      setIsCorrectNetwork(status.isCorrectNetwork);
      
      if (!status.isCorrectNetwork) {
        toast.error("Please switch to Arbitrum Sepolia network");
      }
    } catch (err) {
      toast.error(err.message || "Failed to connect wallet");
    }
  };

  const handleDevMint = async () => {
    if (!walletAccount) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isCorrectNetwork) {
      toast.error("Please switch to Arbitrum Sepolia network");
      return;
    }

    setIsMinting(true);
    try {
      const amount = parseFloat(mintAmount);
      if (amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      toast.loading("Minting test tokens...", { id: "mint" });
      const hash = await devMint(walletAccount, amount);
      toast.success(`Minted ${amount} ${tokenInfo.symbol || "FHPAY"}!`, { id: "mint" });
      toast.success(`Transaction: ${hash.substring(0, 10)}...`, { duration: 5000 });
      
      // Reload balance
      setTimeout(() => {
        loadBalance();
      }, 2000);
    } catch (err) {
      console.error("Mint error:", err);
      toast.error(err.message || "Mint failed. Only contract owner can mint.", { id: "mint" });
    } finally {
      setIsMinting(false);
    }
  };

  const handleRequestTestTokens = async () => {
    if (!walletAccount) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!isCorrectNetwork) {
      toast.error("Please switch to Arbitrum Sepolia network");
      return;
    }

    setIsRequestingTokens(true);
    try {
      const amount = parseFloat(requestAmount);
      if (amount <= 0) {
        toast.error("Please enter a valid amount");
        return;
      }

      toast.loading("Requesting test tokens...", { id: "request" });
      const result = await requestTestTokens(walletAccount, amount);
      
      if (result.success) {
        toast.success(`Successfully minted ${amount} ${tokenInfo.symbol || "FHPAY"} to your address!`, { id: "request" });
        if (result.txHash) {
          toast.success(`Transaction: ${result.txHash.substring(0, 10)}...`, { duration: 5000 });
        }
        
        // Reload balance after a delay
        setTimeout(() => {
          loadBalance();
        }, 3000);
      } else {
        toast.error(result.message || "Failed to request test tokens", { id: "request" });
      }
    } catch (err) {
      console.error("Request tokens error:", err);
      toast.error(err.message || "Failed to request test tokens", { id: "request" });
    } finally {
      setIsRequestingTokens(false);
    }
  };


  const handleTransfer = async () => {
    if (!isInitialized) {
      toast.error("Fhenix FHE client başlatılmadı. Lütfen cüzdanınızı bağlayın.");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Geçerli bir miktar girin.");
      return;
    }

    if (!recipient || !recipient.startsWith("0x") || recipient.length !== 42) {
      toast.error("Geçerli bir Ethereum adresi girin (0x ile başlamalı).");
      return;
    }

    setLoading(true);
    setEncryptionState("Extract");
    setTxHash(null);

    try {
      // Step 1: Encrypt amount
      toast.loading("Miktar şifreleniyor...", { id: "encrypt" });
      setEncryptionState("Pack");
      
      const encryptedAmount = await encrypt(parseFloat(amount));
      
      if (!encryptedAmount) {
        throw new Error("Şifreleme başarısız oldu.");
      }

      setEncryptionState("Prove");
      toast.loading("İşlem hazırlanıyor...", { id: "tx" });

      // Step 2: Send confidential transfer
      const hash = await confidentialTransfer(recipient, encryptedAmount);
      
      setTxHash(hash);
      setEncryptionState("Done");
      toast.success("Gizli transfer başarılı!", { id: "tx" });
      toast.success(`Transaction: ${hash.substring(0, 10)}...`, { duration: 5000 });

      // Reset form
      setAmount("");
      setRecipient("");
      
      // Reload balance
      setTimeout(() => {
        loadBalance();
      }, 2000);

    } catch (err) {
      console.error("Transfer error:", err);
      setEncryptionState(null);
      toast.error(err.message || "Transfer başarısız oldu.", { id: "tx" });
      toast.error(err.message || "Transfer başarısız oldu.", { id: "encrypt" });
    } finally {
      setLoading(false);
      setTimeout(() => setEncryptionState(null), 3000);
    }
  };

  const getEncryptionStateLabel = (state) => {
    if (!state) return "";
    const labels = {
      Extract: "Veri hazırlanıyor...",
      Pack: "Şifreleme yapılıyor...",
      Prove: "İşlem doğrulanıyor...",
      Verify: "Doğrulama kontrol ediliyor...",
      Replace: "Sonuç hazırlanıyor...",
      Done: "Tamamlandı!",
    };
    return labels[state] || state;
  };

  return (
    <MobilePageWrapper>
      <div className="flex flex-col items-center w-full min-h-screen bg-gradient-to-br from-white via-blue-50/30 to-blue-50/30 py-6 px-4 pb-24">
        <div className="w-full max-w-5xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button
              isIconOnly
              variant="light"
              className="text-gray-600"
              onClick={() => navigate("/")}
            >
              <Icons.back className="w-5 h-5" />
            </Button>
            <div className="flex flex-col items-center gap-3 flex-1">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-xl">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-extrabold text-blue-600">
                  Fhenix Confidential Payments
                </h1>
              </div>
              <p className="text-gray-600 max-w-xl text-sm text-center">
                Fully Homomorphic Encryption (FHE) powered confidential payments on Arbitrum Sepolia
              </p>
            </div>
            <div className="w-10" /> {/* Spacer for alignment */}
          </div>

          {/* Wallet Connection Card */}
          {!walletConnected && (
            <Card className="bg-blue-50 border-2 border-blue-200 shadow-xl mb-5">
              <CardBody className="p-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center shadow-xl">
                    <Wallet className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                      Connect MetaMask Wallet
                    </h3>
                    <p className="text-gray-600 text-sm">
                      Connect your MetaMask wallet to start using Fhenix confidential payments
                    </p>
                  </div>
                  <Button
                    className="w-full h-12 font-bold bg-blue-600 text-white shadow-xl hover:scale-105 transition-all"
                    onClick={handleConnectWallet}
                    startContent={<Wallet className="w-5 h-5" />}
                  >
                    Connect MetaMask
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Network Warning */}
          {walletConnected && !isCorrectNetwork && (
            <Card className="bg-blue-50 border-2 border-blue-300 shadow-xl mb-5">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 text-blue-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-blue-900">
                      Wrong Network
                    </p>
                    <p className="text-xs text-blue-700">
                      Please switch to Arbitrum Sepolia (Chain ID: 421614) in MetaMask
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Status & Balance Card */}
          {walletConnected && (
            <Card className="bg-blue-50 border-2 border-blue-200 shadow-xl mb-5">
              <CardBody className="gap-4">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-blue-900">Wallet Status</h2>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onClick={toggleBalanceVisibility}
                      className="text-blue-600 hover:bg-blue-100"
                    >
                      {balanceHidden ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Chip
                      size="sm"
                      className={isInitialized ? "bg-blue-100 text-blue-700" : isInitializing ? "bg-blue-100 text-blue-600" : "bg-blue-50 text-blue-500"}
                      variant="flat"
                    >
                      {isInitialized ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="size-3" />
                          FHE Ready
                        </div>
                      ) : isInitializing ? (
                        <div className="flex items-center gap-1">
                          <Loader2 className="size-3 animate-spin" />
                          Initializing...
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="size-3" />
                          Not Ready
                        </div>
                      )}
                    </Chip>
                    <Chip 
                      size="sm" 
                      className={isCorrectNetwork ? "bg-blue-100 text-blue-700" : "bg-blue-50 text-blue-500"} 
                      variant="flat"
                    >
                      {isCorrectNetwork ? "Arbitrum Sepolia" : "Wrong Network"}
                    </Chip>
                  </div>
                </div>

                {walletAccount && (
                  <div className="flex items-center gap-2 text-xs text-gray-600 bg-white/70 p-2 rounded-lg">
                    <Wallet className="size-3" />
                    <span className="font-mono">{walletAccount.substring(0, 6)}...{walletAccount.substring(walletAccount.length - 4)}</span>
                  </div>
                )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1 bg-white/70 p-4 rounded-xl border border-blue-200">
                  <label className="text-xs text-blue-700 font-semibold flex items-center gap-1">
                    <Shield className="w-4 h-4" />
                    FHPAY Balance
                  </label>
                  <div className="text-2xl font-bold text-gray-800">
                    {balanceHidden ? "***" : balance}{" "}
                    <span className="text-sm text-blue-500">{tokenInfo.symbol || "FHPAY"}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 bg-white/70 p-4 rounded-xl border border-blue-200">
                  <label className="text-xs text-blue-700 font-semibold flex items-center gap-1">
                    <Lock className="w-4 h-4" />
                    Encryption Mode
                  </label>
                  <div className="text-lg font-bold text-gray-800">
                    {isFallbackMode ? (
                      <span className="text-blue-500">Fallback</span>
                    ) : (
                      <span className="text-blue-600">CoFHE</span>
                    )}
                  </div>
                </div>
              </div>

              {error && (
                <Chip className="bg-blue-50 text-blue-600 w-full justify-center" variant="flat">
                  Error: {error}
                </Chip>
              )}

              {isFallbackMode && (
                <Chip className="bg-blue-50 text-blue-500 w-full justify-center" variant="flat">
                  Fallback mode: CoFHE not available, using local encryption
                </Chip>
              )}

              {/* Request Test Tokens Section */}
              <Card className="bg-blue-50 border-2 border-blue-200 mt-4">
                <CardBody className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900 mb-1">
                        Request Test Tokens
                      </p>
                      <p className="text-xs text-blue-700">
                        Request test tokens. Owner wallet will mint and send tokens to your address.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Amount"
                      type="number"
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value)}
                      className="flex-1"
                      size="sm"
                      variant="bordered"
                      classNames={{
                        inputWrapper: "h-10",
                      }}
                    />
                    <Button
                      className="bg-blue-600 text-white font-semibold"
                      size="sm"
                      onClick={handleRequestTestTokens}
                      isLoading={isRequestingTokens}
                      disabled={!isCorrectNetwork || !walletAccount}
                    >
                      Request
                    </Button>
                  </div>
                </CardBody>
              </Card>

              {/* Dev Mint Section (Owner Only) */}
              <Card className="bg-blue-50 border-2 border-blue-200 mt-4">
                <CardBody className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Info className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-blue-900 mb-1">
                        Direct Mint (Owner Only)
                      </p>
                      <p className="text-xs text-blue-700">
                        Mint test tokens directly. Only contract owner can use this.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Amount"
                      type="number"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(e.target.value)}
                      className="flex-1"
                      size="sm"
                      variant="bordered"
                      classNames={{
                        inputWrapper: "h-10",
                      }}
                    />
                    <Button
                      className="bg-blue-600 text-white font-semibold"
                      size="sm"
                      onClick={handleDevMint}
                      isLoading={isMinting}
                      disabled={!isCorrectNetwork || !walletAccount}
                    >
                      Mint
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </CardBody>
          </Card>
          )}

          {/* Main Content Card */}
          <Card className="bg-white/80 backdrop-blur-xl border-2 border-white/50 shadow-2xl rounded-2xl overflow-hidden">
            <CardBody className="p-0">
              <Tabs
                selectedKey={activeTab}
                onSelectionChange={(key) => setActiveTab(key)}
                aria-label="Fhenix Options"
                color="primary"
                variant="underlined"
                classNames={{
                  tabList:
                    "gap-6 w-full relative rounded-none p-0 border-b-2 border-gray-200 px-6 pt-3 bg-blue-50/50",
                  cursor: "bg-blue-600 h-1",
                  tab: "max-w-fit px-0 h-12",
                  tabContent:
                    "group-data-[selected=true]:text-blue-600 group-data-[selected=true]:font-bold text-sm",
                }}
              >
                <Tab
                  key="transfer"
                  title={
                    <div className="flex items-center gap-2">
                      <Send size={18} />
                      <span>Transfer</span>
                    </div>
                  }
                >
                  <div className="p-6 flex flex-col gap-4 bg-white">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
                        <Send className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">
                          Send Confidential Payment
                        </h3>
                        <p className="text-sm text-gray-600">
                          Transfer FHPAY tokens with fully encrypted amounts. Only you and the recipient can see the actual value.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-blue-600" />
                          Recipient Address
                        </label>
                        <Input
                          placeholder="0x..."
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          variant="bordered"
                          disabled={loading || !isInitialized}
                          classNames={{
                            inputWrapper:
                              "h-12 rounded-xl bg-white border-2 border-gray-200 hover:border-blue-300",
                            input: "font-mono text-sm",
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-600" />
                          Amount ({tokenInfo.symbol || "FHPAY"})
                        </label>
                        <Input
                          placeholder="0.00"
                          type="number"
                          step="0.000001"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          disabled={loading || !isInitialized}
                          endContent={
                            <Button
                              size="sm"
                              variant="light"
                              onClick={async () => {
                                if (!balanceHidden && isInitialized) {
                                  await loadBalance();
                                  setAmount(balance);
                                }
                              }}
                              className="min-w-fit text-blue-600"
                              disabled={!isInitialized || balanceHidden}
                            >
                              Max
                            </Button>
                          }
                          variant="bordered"
                          classNames={{
                            inputWrapper:
                              "h-12 rounded-xl bg-white border-2 border-gray-200 hover:border-blue-300",
                            input: "text-lg font-bold",
                          }}
                        />
                      </div>

                      {encryptionState && (
                        <Card className="bg-blue-50 border-2 border-blue-200">
                          <CardBody className="p-4">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-blue-700 font-semibold">
                                  {getEncryptionStateLabel(encryptionState)}
                                </span>
                                <span className="text-blue-500">{encryptionState}</span>
                              </div>
                              <Progress 
                                value={
                                  encryptionState === "Extract" ? 16 :
                                  encryptionState === "Pack" ? 33 :
                                  encryptionState === "Prove" ? 50 :
                                  encryptionState === "Verify" ? 66 :
                                  encryptionState === "Replace" ? 83 :
                                  100
                                }
                                className="w-full"
                                size="sm"
                                color="primary"
                              />
                            </div>
                          </CardBody>
                        </Card>
                      )}

                      {txHash && (
                        <Card className="bg-blue-50 border-2 border-blue-200">
                          <CardBody className="p-4">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="size-5 text-blue-600" />
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-blue-900">Transaction Successful!</p>
                                <a
                                  href={`${import.meta.env.VITE_ARBITRUM_SEPOLIA_EXPLORER || "https://sepolia.arbiscan.io"}/tx/${txHash}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-700 underline font-mono"
                                >
                                  View on Arbiscan: {txHash.substring(0, 10)}...{txHash.substring(txHash.length - 8)}
                                </a>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      )}

                    <Button
                      className="w-full h-14 font-bold bg-blue-600 text-white shadow-xl hover:scale-[1.01] transition-all mt-2"
                      onClick={handleTransfer}
                      disabled={loading || !isInitialized || !amount || !recipient || !walletConnected || !isCorrectNetwork}
                      isLoading={loading}
                      startContent={!loading && <Send className="w-5 h-5" />}
                    >
                      {loading ? "Processing..." : "Send Confidential Transfer"}
                    </Button>
                    
                    {(!walletConnected || !isCorrectNetwork) && (
                      <p className="text-xs text-center text-gray-500 mt-2">
                        {!walletConnected && "Connect wallet to send transfers"}
                        {walletConnected && !isCorrectNetwork && "Switch to Arbitrum Sepolia network"}
                      </p>
                    )}
                    </div>
                  </div>
                </Tab>

                <Tab
                  key="info"
                  title={
                    <div className="flex items-center gap-2">
                      <Info size={18} />
                      <span>Info</span>
                    </div>
                  }
                >
                  <div className="p-6 flex flex-col gap-4 bg-white">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
                        <Info className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 mb-1">
                          About Fhenix FHE
                        </h3>
                        <p className="text-sm text-gray-600">
                          Learn how Fully Homomorphic Encryption protects your payment privacy
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <Card className="bg-blue-50 border-2 border-blue-200">
                        <CardBody className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                              <Lock className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 mb-1">Fully Homomorphic Encryption</p>
                              <p className="text-sm text-gray-600">
                                Amounts are encrypted before being sent to the blockchain. Only you and the recipient can decrypt the actual values using your private keys.
                              </p>
                            </div>
                          </div>
                        </CardBody>
                      </Card>

                      <Card className="bg-blue-50 border-2 border-blue-200">
                        <CardBody className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                              <Shield className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 mb-1">Confidential Transfers</p>
                              <p className="text-sm text-gray-600">
                                All transactions use FHE to keep payment amounts private on-chain. The blockchain only sees encrypted values, not actual amounts.
                              </p>
                            </div>
                          </div>
                        </CardBody>
                      </Card>

                      <Card className="bg-blue-50 border-2 border-blue-200">
                        <CardBody className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                              <Wallet className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 mb-1">Network</p>
                              <p className="text-sm text-gray-600">
                                Arbitrum Sepolia Testnet (Chain ID: 421614)
                              </p>
                              <p className="text-xs text-gray-500 mt-1">
                                Contract: 0xf7554dBFdf4633bB4b2c1E708945bB83c9071C12
                              </p>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    </div>
                  </div>
                </Tab>
              </Tabs>
            </CardBody>
          </Card>
        </div>
      </div>
    </MobilePageWrapper>
  );
}

