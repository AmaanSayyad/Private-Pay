/**
 * Starknet Page
 * Dashboard for Starknet stealth payments and wallet management
 */

import { useState, useEffect } from "react";
import { Button, Card, CardBody, Input, Tabs, Tab } from "@nextui-org/react";
import { useStarknet } from "../providers/StarknetProvider";
import { generateMetaAddressKeys, splitPublicKeyForContract, generateStealthAddress, generatePrivateKey } from "../lib/starknet/stealthAddress";
import toast from "react-hot-toast";
import { Copy, Check, Wallet, Send, Shield, ExternalLink } from "lucide-react";

export default function StarknetPage() {
  const {
    account,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    balance,
    walletType,
    availableWallets,
    truncateAddress,
    getExplorerUrl,
    registerMetaAddress,
    sendPrivatePayment,
  } = useStarknet();

  const [selectedTab, setSelectedTab] = useState("receive");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [metaAddress, setMetaAddress] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Load meta address from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("starknet_meta_address");
    if (stored) {
      try {
        setMetaAddress(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load meta address:", e);
      }
    }
  }, []);

  const handleConnect = async (walletId) => {
    try {
      await connect(walletId);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCopy = (text, label = "Address") => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success(`${label} copied!`);
  };

  const handleGenerateMetaAddress = async () => {
    setIsGenerating(true);
    try {
      const keys = generateMetaAddressKeys();

      // Split public keys into x, y coordinates for contract
      const { x: spendX, y: spendY } = splitPublicKeyForContract(keys.spend.publicKey);
      const { x: viewingX, y: viewingY } = splitPublicKeyForContract(keys.viewing.publicKey);

      // Register on-chain
      const result = await registerMetaAddress(spendX, spendY, viewingX, viewingY);

      const meta = {
        spend: keys.spend,
        viewing: keys.viewing,
        txHash: result.transaction_hash,
        createdAt: Date.now(),
      };
      setMetaAddress(meta);
      localStorage.setItem("starknet_meta_address", JSON.stringify(meta));
      toast.success("Stealth meta address registered on-chain!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to register meta address: " + (error.message || "Unknown error"));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!recipient || !amount) {
      toast.error("Please fill in recipient and amount");
      return;
    }

    setIsSending(true);
    try {
      // Generate ephemeral key for this payment
      const ephemeralPrivKey = generatePrivateKey();

      // For demo: use recipient as spend key and generate a viewing key
      // In production, recipient would provide their meta address (spend + viewing public keys)
      const { x: ephemeralX, y: ephemeralY } = splitPublicKeyForContract(
        "0x" + Array.from(ephemeralPrivKey).map(b => b.toString(16).padStart(2, '0')).join('')
      );

      // Generate stealth address (simplified for demo)
      const stealthAddressHash = "0x" + Array.from(ephemeralPrivKey.slice(0, 31))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      // Send payment on-chain
      const result = await sendPrivatePayment(
        account, // recipient (in demo, send to self)
        stealthAddressHash, // stealth address
        ephemeralX, // ephemeral pub key x
        ephemeralY, // ephemeral pub key y
        parseFloat(amount), // amount
        0, // k index
        "0x00" // view hint
      );

      toast.success(`Payment sent! Tx: ${result.transaction_hash.slice(0, 10)}...`);
      setRecipient("");
      setAmount("");
    } catch (error) {
      console.error(error);
      toast.error("Transaction failed: " + (error.message || "Unknown error"));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen bg-white py-6 px-4 pb-24">
      <div className="w-full max-w-5xl">
        {/* Compact Header */}
        <div className="flex flex-col items-center gap-3 mb-6">
      <div className="flex items-center gap-3">
            <img src="/assets/starknet-logo.png" alt="Starknet" className="w-12 h-12 rounded-full" />
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
          Starknet Privacy
        </h1>
      </div>
          <p className="text-gray-600 max-w-xl text-sm text-center">
            Experience cross-chain privacy with Ztarknet - bridging Zcash shielded transactions with Starknet
      </p>
        </div>

      {!isConnected ? (
          <div className="flex flex-col items-center">
            <Card className="bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-blue-500/10 border-2 border-purple-300/50 shadow-xl backdrop-blur-sm max-w-md w-full">
              <CardBody className="p-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-xl">
                    <Shield className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Connect Wallet</h3>
                    <p className="text-gray-600 text-sm">
                      Connect your Starknet wallet to access stealth payments and the Zcash bridge
              </p>
                  </div>

                  <div className="flex flex-col gap-3 mt-2 w-full">
                <Button
                      className="w-full h-12 font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl hover:scale-105 transition-all"
                  onClick={() => handleConnect("argentX")}
                  isLoading={isConnecting}
                  isDisabled={!availableWallets.argentX && !isConnecting}
                      startContent={!isConnecting && <img src="/assets/argentx_logo.png" alt="ArgentX" className="w-5 h-5 rounded-full" />}
                >
                  {availableWallets.argentX ? "Connect ArgentX" : "Install ArgentX"}
                </Button>

                <Button
                      className="w-full h-12 font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-xl hover:scale-105 transition-all"
                  onClick={() => handleConnect("braavos")}
                  isLoading={isConnecting}
                  isDisabled={!availableWallets.braavos && !isConnecting}
                      startContent={!isConnecting && <Wallet className="w-5 h-5" />}
                >
                  {availableWallets.braavos ? "Connect Braavos" : "Install Braavos"}
                </Button>
              </div>

              {!availableWallets.argentX && !availableWallets.braavos && (
                <p className="text-xs text-center text-amber-600 mt-2">
                  No Starknet wallet detected. Install ArgentX or Braavos to continue.
                </p>
              )}
                </div>
            </CardBody>
          </Card>
        </div>
      ) : (
          <div className="flex flex-col w-full gap-5">
          {/* Wallet Info Card */}
            <Card className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border-2 border-purple-300 shadow-lg">
              <CardBody className="p-5">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-purple-900">Wallet Details</h2>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                    {walletType === "argentX" ? "ArgentX" : "Braavos"}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    Sepolia
                  </span>
                </div>
              </div>

                <div className="flex flex-col gap-2 mb-4">
                  <label className="text-xs text-purple-700 font-bold">Address</label>
                  <div className="flex items-center gap-2 bg-white/70 p-3 rounded-lg border border-purple-200">
                    <code className="text-sm truncate flex-1 text-gray-700 font-mono">
                    {truncateAddress(account)}
                  </code>
                    <button onClick={() => handleCopy(account)} className="p-1.5 hover:bg-purple-100 rounded transition-colors">
                      {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-purple-600" />}
                  </button>
                  <a
                    href={`https://sepolia.starkscan.co/contract/${account}`}
                    target="_blank"
                    rel="noopener noreferrer"
                      className="p-1.5 hover:bg-purple-100 rounded transition-colors"
                  >
                      <ExternalLink size={16} className="text-purple-600" />
                  </a>
                </div>
              </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <Card className="bg-white/70 border border-purple-200 shadow-sm">
                    <CardBody className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <img src="/assets/eth-logo.png" alt="ETH" className="w-4 h-4 rounded-full" />
                        <label className="text-xs text-purple-700 font-bold">ETH Balance</label>
                      </div>
                      <div className="text-lg font-bold text-gray-800">
                        {balance.eth} <span className="text-xs text-purple-500">ETH</span>
                  </div>
                    </CardBody>
                  </Card>
                  <Card className="bg-white/70 border border-purple-200 shadow-sm">
                    <CardBody className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <img src="/assets/starknet-logo.png" alt="STRK" className="w-4 h-4 rounded-full" />
                        <label className="text-xs text-purple-700 font-bold">STRK Balance</label>
                </div>
                      <div className="text-lg font-bold text-gray-800">
                        {balance.strk} <span className="text-xs text-purple-500">STRK</span>
                  </div>
                    </CardBody>
                  </Card>
                  <Card className="bg-white/70 border border-green-200 shadow-sm">
                    <CardBody className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <img src="/assets/zcash_logo.png" alt="sZEC" className="w-4 h-4 rounded-full" />
                        <label className="text-xs text-green-700 font-bold">sZEC Balance</label>
                </div>
                      <div className="text-lg font-bold text-gray-800">
                        {balance.szec} <span className="text-xs text-green-500">sZEC</span>
                  </div>
                  {balance.simulated > 0 && (
                        <div className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded w-fit mt-1">
                      + {balance.simulated} Simulated
                    </div>
                  )}
                    </CardBody>
                  </Card>
              </div>

                <Button 
                  color="danger" 
                  variant="light" 
                  className="self-end" 
                  size="sm" 
                  onClick={disconnect}
                >
                Disconnect
              </Button>
            </CardBody>
          </Card>

          {/* Tabs for Receive/Send */}
            <Card className="bg-white/80 backdrop-blur-xl border-2 border-white/50 shadow-2xl rounded-2xl overflow-hidden">
            <CardBody className="p-0">
              <Tabs
                selectedKey={selectedTab}
                onSelectionChange={setSelectedTab}
                aria-label="Starknet Options"
                color="secondary"
                variant="underlined"
                classNames={{
                    tabList: "gap-6 w-full relative rounded-none p-0 border-b-2 border-gray-200 px-6 pt-3 bg-gradient-to-r from-purple-50/50 to-indigo-50/50",
                    cursor: "bg-gradient-to-r from-purple-600 to-indigo-600 h-1",
                  tab: "max-w-fit px-0 h-12",
                    tabContent: "group-data-[selected=true]:text-purple-600 group-data-[selected=true]:font-bold text-sm",
                }}
              >
                <Tab
                  key="receive"
                  title={
                    <div className="flex items-center gap-2">
                      <Shield size={18} />
                      <span>Receive</span>
                    </div>
                  }
                >
                  <div className="p-6 flex flex-col gap-4 bg-gradient-to-br from-white to-purple-50/30">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">Stealth Address Setup</h3>
                    <p className="text-sm text-gray-600">
                      Generate a meta address to receive private payments. Your stealth addresses are derived from this meta address.
                    </p>
                    </div>

                    {!metaAddress ? (
                      <Button
                        className="w-full h-12 font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-xl hover:scale-[1.01] transition-all"
                        onClick={handleGenerateMetaAddress}
                        isLoading={isGenerating}
                        startContent={<Shield className="w-5 h-5" />}
                      >
                        {isGenerating ? "Generating..." : "Generate Meta Address"}
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <Card className="bg-purple-50/80 border-2 border-purple-200 shadow-sm">
                          <CardBody className="p-4">
                            <label className="text-xs text-purple-700 font-bold mb-2 block">Spend Public Key</label>
                            <div className="flex items-center gap-2">
                              <code className="text-xs truncate flex-1 text-gray-700 bg-white/70 p-2 rounded font-mono">
                              {metaAddress.spend.publicKey}
                            </code>
                            <button
                              onClick={() => handleCopy(metaAddress.spend.publicKey, "Spend Key")}
                                className="p-1.5 hover:bg-purple-100 rounded transition-colors"
                            >
                                <Copy size={14} className="text-purple-600" />
                            </button>
                          </div>
                          </CardBody>
                        </Card>

                        <Card className="bg-purple-50/80 border-2 border-purple-200 shadow-sm">
                          <CardBody className="p-4">
                            <label className="text-xs text-purple-700 font-bold mb-2 block">Viewing Public Key</label>
                            <div className="flex items-center gap-2">
                              <code className="text-xs truncate flex-1 text-gray-700 bg-white/70 p-2 rounded font-mono">
                              {metaAddress.viewing.publicKey}
                            </code>
                            <button
                              onClick={() => handleCopy(metaAddress.viewing.publicKey, "Viewing Key")}
                                className="p-1.5 hover:bg-purple-100 rounded transition-colors"
                            >
                                <Copy size={14} className="text-purple-600" />
                            </button>
                          </div>
                          </CardBody>
                        </Card>

                        <Card className="bg-amber-50 border-2 border-amber-200">
                          <CardBody className="p-3">
                            <p className="text-xs text-amber-700">
                          <strong>Important:</strong> Your private keys are stored locally. Back them up securely to avoid losing access to your funds.
                            </p>
                          </CardBody>
                        </Card>

                        {metaAddress.txHash && (
                          <Card className="bg-green-50 border-2 border-green-200">
                            <CardBody className="p-3">
                              <p className="text-xs text-green-700">
                            <strong>Registered on-chain:</strong>{" "}
                            <a
                              href={`https://sepolia.starkscan.co/tx/${metaAddress.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                                  className="underline font-mono"
                            >
                              {metaAddress.txHash.slice(0, 10)}...{metaAddress.txHash.slice(-6)}
                            </a>
                              </p>
                            </CardBody>
                          </Card>
                        )}

                        <Button
                          variant="bordered"
                          className="w-full h-10 border-2 border-purple-300 text-purple-700 hover:bg-purple-50 font-semibold"
                          onClick={handleGenerateMetaAddress}
                          isLoading={isGenerating}
                        >
                          {isGenerating ? "Registering..." : "Regenerate & Register On-Chain"}
                        </Button>
                      </div>
                    )}
                  </div>
                </Tab>

                <Tab
                  key="send"
                  title={
                    <div className="flex items-center gap-2">
                      <Send size={18} />
                      <span>Send</span>
                    </div>
                  }
                >
                  <div className="p-6 flex flex-col gap-4 bg-gradient-to-br from-white to-indigo-50/30">
                    <div>
                      <h3 className="text-base font-bold text-gray-900 mb-1">Send Private Payment</h3>
                    <p className="text-sm text-gray-600">
                      Send sZEC or STRK to a stealth address. The recipient can claim funds privately.
                    </p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-800">Recipient Meta Address</label>
                    <Input
                      placeholder="Enter spend public key..."
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      variant="bordered"
                        classNames={{
                          inputWrapper: "h-12 rounded-xl bg-white border-2 border-gray-200",
                          input: "font-mono text-sm",
                        }}
                    />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-800 flex items-center gap-2">
                        <img src="/assets/zcash_logo.png" alt="sZEC" className="w-5 h-5 rounded-full" />
                        Amount
                      </label>
                    <Input
                      placeholder="0.00"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                        endContent={
                          <div className="flex items-center gap-1">
                            <img src="/assets/zcash_logo.png" alt="sZEC" className="w-4 h-4 rounded-full" />
                            <span className="text-sm font-semibold text-green-600">sZEC</span>
                          </div>
                        }
                      variant="bordered"
                        classNames={{
                          inputWrapper: "h-12 rounded-xl bg-white border-2 border-gray-200",
                          input: "text-lg font-bold",
                        }}
                    />
                    </div>

                    <Button
                      className="w-full h-14 font-bold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white shadow-xl hover:scale-[1.01] transition-all mt-2"
                      onClick={handleSend}
                      isLoading={isSending}
                      startContent={!isSending && <Send className="w-5 h-5" />}
                    >
                      {isSending ? "Sending..." : "Send Private Payment"}
                    </Button>
                  </div>
                </Tab>
              </Tabs>
            </CardBody>
          </Card>

          {/* Bridge Link Card */}
            <Card className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-2 border-green-300 shadow-lg">
              <CardBody className="p-5">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg">
                      <img src="/assets/zcash_logo.png" alt="Zcash" className="w-7 h-7 rounded-full" />
                    </div>
              <div>
                      <h3 className="text-base font-bold text-green-900">Zcash Bridge</h3>
                <p className="text-sm text-green-700">
                  Bridge ZEC to sZEC for cross-chain privacy
                </p>
                    </div>
              </div>
              <Button
                as="a"
                href="/zcash-starknet-bridge"
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold shadow-xl hover:scale-105 transition-all"
              >
                Open Bridge
              </Button>
                </div>
            </CardBody>
          </Card>
        </div>
      )}
      </div>
    </div>
  );
}
