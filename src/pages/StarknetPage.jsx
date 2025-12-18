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
    <div className="flex flex-col items-center justify-center w-full min-h-[80vh] gap-8 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Shield className="w-10 h-10 text-purple-500" />
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
          Starknet Privacy
        </h1>
      </div>

      <p className="text-gray-600 max-w-lg text-center">
        Experience cross-chain privacy with Ztarknet - bridging Zcash shielded transactions with Starknet.
      </p>

      {!isConnected ? (
        <div className="flex flex-col items-center gap-6">
          <Card className="max-w-md">
            <CardBody className="gap-4 p-6">
              <h2 className="text-xl font-bold text-center">Connect Wallet</h2>
              <p className="text-sm text-gray-600 text-center">
                Connect your Starknet wallet to access stealth payments and the Zcash bridge.
              </p>

              <div className="flex flex-col gap-3 mt-2">
                <Button
                  color="secondary"
                  variant="shadow"
                  size="lg"
                  className="font-bold"
                  onClick={() => handleConnect("argentX")}
                  isLoading={isConnecting}
                  isDisabled={!availableWallets.argentX && !isConnecting}
                  startContent={<img src="/assets/argentx_logo.png" alt="ArgentX" className="w-5 h-5 rounded-full" />}
                >
                  {availableWallets.argentX ? "Connect ArgentX" : "Install ArgentX"}
                </Button>

                <Button
                  color="warning"
                  variant="shadow"
                  size="lg"
                  className="font-bold"
                  onClick={() => handleConnect("braavos")}
                  isLoading={isConnecting}
                  isDisabled={!availableWallets.braavos && !isConnecting}
                  startContent={<Wallet className="w-5 h-5" />}
                >
                  {availableWallets.braavos ? "Connect Braavos" : "Install Braavos"}
                </Button>
              </div>

              {!availableWallets.argentX && !availableWallets.braavos && (
                <p className="text-xs text-center text-amber-600 mt-2">
                  No Starknet wallet detected. Install ArgentX or Braavos to continue.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col w-full max-w-2xl gap-6">
          {/* Wallet Info Card */}
          <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-100">
            <CardBody className="gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-purple-900">Wallet Details</h2>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">
                    {walletType === "argentX" ? "ArgentX" : "Braavos"}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">
                    Sepolia
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-purple-700 font-semibold">Address</label>
                <div className="flex items-center gap-2 bg-white/50 p-2 rounded-lg border border-purple-100">
                  <code className="text-sm truncate flex-1 text-gray-700">
                    {truncateAddress(account)}
                  </code>
                  <button onClick={() => handleCopy(account)} className="p-1 hover:bg-purple-100 rounded">
                    {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-purple-400" />}
                  </button>
                  <a
                    href={`https://sepolia.starkscan.co/contract/${account}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-purple-100 rounded"
                  >
                    <ExternalLink size={16} className="text-purple-400" />
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-purple-700 font-semibold">ETH Balance</label>
                  <div className="text-xl font-bold text-gray-800">
                    {balance.eth} <span className="text-sm text-purple-500">ETH</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-purple-700 font-semibold">STRK Balance</label>
                  <div className="text-xl font-bold text-gray-800">
                    {balance.strk} <span className="text-sm text-purple-500">STRK</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-purple-700 font-semibold">sZEC Balance</label>
                  <div className="text-xl font-bold text-gray-800">
                    {balance.szec} <span className="text-sm text-green-500">sZEC</span>
                  </div>
                  {balance.simulated > 0 && (
                    <div className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded w-fit">
                      + {balance.simulated} Simulated
                    </div>
                  )}
                </div>
              </div>

              <Button color="danger" variant="light" className="self-end" size="sm" onClick={disconnect}>
                Disconnect
              </Button>
            </CardBody>
          </Card>

          {/* Tabs for Receive/Send */}
          <Card>
            <CardBody className="p-0">
              <Tabs
                selectedKey={selectedTab}
                onSelectionChange={setSelectedTab}
                aria-label="Starknet Options"
                color="secondary"
                variant="underlined"
                classNames={{
                  tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider px-6",
                  tab: "max-w-fit px-0 h-12",
                  tabContent: "group-data-[selected=true]:text-purple-600",
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
                  <div className="p-6 flex flex-col gap-4">
                    <h3 className="text-lg font-bold">Stealth Address Setup</h3>
                    <p className="text-sm text-gray-600">
                      Generate a meta address to receive private payments. Your stealth addresses are derived from this meta address.
                    </p>

                    {!metaAddress ? (
                      <Button
                        color="secondary"
                        variant="shadow"
                        size="lg"
                        onClick={handleGenerateMetaAddress}
                        isLoading={isGenerating}
                        className="font-bold"
                      >
                        Generate Meta Address
                      </Button>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                          <label className="text-xs text-purple-700 font-semibold">Spend Public Key</label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs truncate flex-1 text-gray-700 bg-white/50 p-2 rounded">
                              {metaAddress.spend.publicKey}
                            </code>
                            <button
                              onClick={() => handleCopy(metaAddress.spend.publicKey, "Spend Key")}
                              className="p-1 hover:bg-purple-100 rounded"
                            >
                              <Copy size={14} className="text-purple-400" />
                            </button>
                          </div>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                          <label className="text-xs text-purple-700 font-semibold">Viewing Public Key</label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs truncate flex-1 text-gray-700 bg-white/50 p-2 rounded">
                              {metaAddress.viewing.publicKey}
                            </code>
                            <button
                              onClick={() => handleCopy(metaAddress.viewing.publicKey, "Viewing Key")}
                              className="p-1 hover:bg-purple-100 rounded"
                            >
                              <Copy size={14} className="text-purple-400" />
                            </button>
                          </div>
                        </div>

                        <div className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg">
                          <strong>Important:</strong> Your private keys are stored locally. Back them up securely to avoid losing access to your funds.
                        </div>

                        {metaAddress.txHash && (
                          <div className="text-xs text-green-600 bg-green-50 p-3 rounded-lg">
                            <strong>Registered on-chain:</strong>{" "}
                            <a
                              href={`https://sepolia.starkscan.co/tx/${metaAddress.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              {metaAddress.txHash.slice(0, 10)}...{metaAddress.txHash.slice(-6)}
                            </a>
                          </div>
                        )}

                        <Button
                          color="secondary"
                          variant="bordered"
                          size="md"
                          onClick={handleGenerateMetaAddress}
                          isLoading={isGenerating}
                          className="font-bold mt-2"
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
                  <div className="p-6 flex flex-col gap-4">
                    <h3 className="text-lg font-bold">Send Private Payment</h3>
                    <p className="text-sm text-gray-600">
                      Send sZEC or STRK to a stealth address. The recipient can claim funds privately.
                    </p>

                    <Input
                      label="Recipient Meta Address"
                      placeholder="Enter spend public key..."
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      variant="bordered"
                    />

                    <Input
                      label="Amount"
                      placeholder="0.00"
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      endContent={<span className="text-sm text-gray-500">sZEC</span>}
                      variant="bordered"
                    />

                    <Button
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold h-12 mt-2"
                      size="lg"
                      onClick={handleSend}
                      isLoading={isSending}
                    >
                      {isSending ? "Sending..." : "Send Private Payment"}
                    </Button>
                  </div>
                </Tab>
              </Tabs>
            </CardBody>
          </Card>

          {/* Bridge Link Card */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-100">
            <CardBody className="flex flex-row items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-green-900">Zcash Bridge</h3>
                <p className="text-sm text-green-700">
                  Bridge ZEC to sZEC for cross-chain privacy
                </p>
              </div>
              <Button
                as="a"
                href="/zcash-starknet-bridge"
                color="success"
                variant="shadow"
                className="font-bold"
              >
                Open Bridge
              </Button>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
