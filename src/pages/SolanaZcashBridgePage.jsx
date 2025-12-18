import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Button, 
  Card, 
  CardBody, 
  Input, 
  Tabs, 
  Tab,
  Chip,
  Progress,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Tooltip,
  Spinner,
} from "@nextui-org/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useZcash } from "../providers/ZcashProvider";
import { useSolana } from "../providers/SolanaProvider";
import { SolanaZcashBridgeClient } from "../lib/solanaZcashBridge/client";
import { 
  generateStealthMetaAddress,
  isValidZcashAddress,
  formatSolAmount,
  formatZecAmount,
  BridgeStatus,
  BridgeDirection,
  BRIDGE_CONSTANTS,
} from "../lib/solanaZcashBridge/index";
import { Icons } from "../components/shared/Icons";
import toast from "react-hot-toast";
import { 
  ArrowDown, 
  ArrowLeftRight, 
  Shield, 
  Lock,
  Zap,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export default function SolanaZcashBridgePage() {
  const navigate = useNavigate();
  const { publicKey, connected, wallet } = useWallet();
  const { connection, heliusClient } = useSolana();
  const { zcashAccount, isConnected: isZcashConnected } = useZcash();

  const [activeTab, setActiveTab] = useState("deposit");
  const [bridgeClient, setBridgeClient] = useState(null);
  const [bridgeStats, setBridgeStats] = useState(null);

  const [depositAmount, setDepositAmount] = useState("");
  const [zcashDestAddress, setZcashDestAddress] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositResult, setDepositResult] = useState(null);

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [zcashTxId, setZcashTxId] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawResult, setWithdrawResult] = useState(null);

  const [stealthMetaAddress, setStealthMetaAddress] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPrivateKeys, setShowPrivateKeys] = useState(false);

  const [priorityFee, setPriorityFee] = useState(null);
  const [transactionHistory, setTransactionHistory] = useState([]);
  const [pendingTickets, setPendingTickets] = useState([]);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (connected && connection && wallet) {
      const client = new SolanaZcashBridgeClient(connection, wallet.adapter, heliusClient);
      client.initialize().then(() => {
        setBridgeClient(client);
        loadBridgeStats(client);
        loadPriorityFee(client);
      });
    }
  }, [connected, connection, wallet, heliusClient]);

  const loadBridgeStats = async (client) => {
    try {
      const stats = await client.getBridgeStats();
      if (stats) {
        setBridgeStats(stats);
      }
    } catch (error) {
      console.error("Failed to load bridge stats:", error);
    }
  };

  const loadPriorityFee = async (client) => {
    try {
      const fee = await client.estimatePriorityFee();
      setPriorityFee(fee);
    } catch (error) {
      console.error("Failed to estimate priority fee:", error);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleDeposit = async () => {
    if (!bridgeClient) {
      toast.error("Bridge not initialized");
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    if (!isValidZcashAddress(zcashDestAddress)) {
      toast.error("Invalid Zcash address");
      return;
    }

    setIsDepositing(true);
    try {
      const result = await bridgeClient.initiateDeposit(amount, zcashDestAddress);
      setDepositResult(result);
      toast.success(`Deposit initiated! Ticket #${result.ticketId}`);
      
      setPendingTickets(prev => [...prev, {
        ...result,
        type: "deposit",
        direction: BridgeDirection.SOL_TO_ZEC,
      }]);

      setDepositAmount("");
      setZcashDestAddress("");
    } catch (error) {
      console.error("Deposit failed:", error);
      toast.error(error.message || "Deposit failed");
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!bridgeClient) {
      toast.error("Bridge not initialized");
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Invalid amount");
      return;
    }

    if (!zcashTxId || zcashTxId.length !== 64) {
      toast.error("Invalid Zcash transaction ID");
      return;
    }

    setIsWithdrawing(true);
    try {
      const result = await bridgeClient.initiateWithdrawal(amount, zcashTxId, null);
      setWithdrawResult(result);
      toast.success(`Withdrawal initiated! Ticket #${result.ticketId}`);
      
      setPendingTickets(prev => [...prev, {
        ...result,
        type: "withdrawal",
        direction: BridgeDirection.ZEC_TO_SOL,
      }]);

      setWithdrawAmount("");
      setZcashTxId("");
    } catch (error) {
      console.error("Withdrawal failed:", error);
      toast.error(error.message || "Withdrawal failed");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleGenerateStealthAddress = async () => {
    const metaAddress = generateStealthMetaAddress();
    setStealthMetaAddress(metaAddress);
    onOpen();
  };

  const handleRegisterStealthAddress = async () => {
    if (!bridgeClient || !stealthMetaAddress) {
      toast.error("Generate a stealth address first");
      return;
    }

    setIsRegistering(true);
    try {
      await bridgeClient.registerStealthMetaAddress(
        Buffer.from(stealthMetaAddress.spendingPublicKey, "hex"),
        Buffer.from(stealthMetaAddress.viewingPublicKey, "hex")
      );
      toast.success("Stealth address registered on-chain!");
      onClose();
    } catch (error) {
      console.error("Registration failed:", error);
      toast.error(error.message || "Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  const refreshTicketStatus = async (ticket) => {
    if (!bridgeClient) return;

    try {
      let status;
      if (ticket.type === "deposit") {
        status = await bridgeClient.getDepositStatus(ticket.ticketId);
      } else {
        status = await bridgeClient.getWithdrawalStatus(ticket.ticketId);
      }

      if (status) {
        setPendingTickets(prev => 
          prev.map(t => 
            t.ticketId === ticket.ticketId ? { ...t, ...status } : t
          )
        );
      }
    } catch (error) {
      console.error("Failed to refresh ticket status:", error);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return "success";
      case "pending":
      case "initiated":
        return "warning";
      case "failed":
      case "expired":
        return "danger";
      default:
        return "default";
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case "completed":
        return <CheckCircle2 className="w-4 h-4" />;
      case "pending":
      case "initiated":
        return <Clock className="w-4 h-4" />;
      case "failed":
      case "expired":
        return <XCircle className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex min-h-screen w-full items-start justify-center py-20 px-4 md:px-10 bg-gradient-to-br from-white to-amber-50/30">
      <div className="w-full max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              isIconOnly
              variant="light"
              className="text-gray-600"
              onClick={() => navigate("/")}
            >
              <Icons.back className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="bg-gradient-to-r from-purple-600 to-amber-500 bg-clip-text text-transparent">
                  Solana ↔ Zcash Bridge
                </span>
                <Chip size="sm" color="warning" variant="flat">
                  Privacy
                </Chip>
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Cross-chain privacy bridge powered by Helius
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {connected && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 rounded-full border border-purple-200">
                <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                <span className="text-purple-700 text-sm font-medium">
                  {bridgeClient ? "Bridge Ready" : "Connecting..."}
                </span>
              </div>
            )}
            <WalletMultiButton 
              className="!bg-[#0d08e3] !rounded-xl !h-10 hover:!bg-[#0e0dc6] !text-white" 
              style={{ backgroundColor: '#0d08e3' }}
            />
          </div>
        </div>

        <Card className="bg-white border border-gray-200 shadow-sm mb-6">
          <CardBody className="flex flex-row items-center justify-between py-3 px-4">
            <div className="flex items-center gap-4">
              <Shield className="w-5 h-5 text-purple-600" />
              <span className="text-gray-900 font-medium">
                Privacy-Preserving Bridge with Helius Monitoring
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Lock className="w-4 h-4" />
                <span>ZK Proofs</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Zap className="w-4 h-4" />
                <span>Priority Fees</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <Shield className="w-4 h-4" />
                <span>Shielded Transfers</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {bridgeStats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
              <CardBody className="py-4">
                <p className="text-purple-600 text-xs font-medium">Total Deposits</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatSolAmount(bridgeStats.totalDeposits)} SOL
                </p>
              </CardBody>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
              <CardBody className="py-4">
                <p className="text-amber-600 text-xs font-medium">Total Withdrawals</p>
                <p className="text-2xl font-bold text-amber-900">
                  {formatSolAmount(bridgeStats.totalWithdrawals)} SOL
                </p>
              </CardBody>
            </Card>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
              <CardBody className="py-4">
                <p className="text-blue-600 text-xs font-medium">Bridge Fee</p>
                <p className="text-2xl font-bold text-blue-900">
                  {bridgeStats.feeBps / 100}%
                </p>
              </CardBody>
            </Card>
            <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
              <CardBody className="py-4">
                <p className="text-emerald-600 text-xs font-medium">Status</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {bridgeStats.isPaused ? "Paused" : "Active"}
                </p>
              </CardBody>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardBody className="p-6">
                <Tabs 
                  selectedKey={activeTab}
                  onSelectionChange={setActiveTab}
                  variant="underlined"
                  color="primary"
                  classNames={{
                    tabList: "gap-6",
                    cursor: "w-full bg-purple-500",
                    tab: "max-w-fit px-0 h-12",
                    tabContent: "group-data-[selected=true]:text-purple-600 font-medium"
                  }}
                >
                  <Tab
                    key="deposit"
                    title={
                      <div className="flex items-center gap-2">
                        <ArrowDown className="w-4 h-4" />
                        <span>Deposit (SOL → ZEC)</span>
                      </div>
                    }
                  >
                    <div className="pt-6 space-y-6">
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-gray-600 text-sm">From Solana</span>
                          {priorityFee && (
                            <Tooltip content="Estimated priority fee for fast confirmation">
                              <Chip size="sm" color="secondary" variant="flat">
                                ~{priorityFee.medium / 1000000} SOL fee
                              </Chip>
                            </Tooltip>
                          )}
                        </div>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          size="lg"
                          classNames={{
                            input: "text-2xl font-bold",
                            inputWrapper: "bg-white border-gray-200",
                          }}
                          endContent={
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 font-medium">SOL</span>
                            </div>
                          }
                        />
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                          <span>Min: {BRIDGE_CONSTANTS.MIN_DEPOSIT_SOL} SOL</span>
                          <span>Max: {BRIDGE_CONSTANTS.MAX_DEPOSIT_SOL} SOL</span>
                        </div>
                      </div>

                      <div className="flex justify-center">
                        <div className="p-3 bg-purple-100 rounded-full">
                          <ArrowDown className="w-5 h-5 text-purple-600" />
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-gray-600 text-sm">To Zcash (Shielded)</span>
                          <Chip size="sm" color="warning" variant="flat">
                            <Shield className="w-3 h-3 mr-1" />
                            Private
                          </Chip>
                        </div>
                        <Input
                          type="text"
                          placeholder="zs1... or u1... address"
                          value={zcashDestAddress}
                          onChange={(e) => setZcashDestAddress(e.target.value)}
                          size="lg"
                          classNames={{
                            input: "text-sm font-mono",
                            inputWrapper: "bg-white border-gray-200",
                          }}
                        />
                        {zcashDestAddress && !isValidZcashAddress(zcashDestAddress) && (
                          <p className="text-red-500 text-xs mt-2">
                            Invalid Zcash address format
                          </p>
                        )}
                      </div>

                      <Button
                        color="primary"
                        size="lg"
                        className="w-full font-bold bg-gradient-to-r from-purple-600 to-indigo-600"
                        onClick={handleDeposit}
                        isLoading={isDepositing}
                        isDisabled={!connected || !depositAmount || !isValidZcashAddress(zcashDestAddress)}
                      >
                        {!connected ? "Connect Wallet" : "Initiate Deposit"}
                      </Button>

                      {depositResult && (
                        <Card className="bg-emerald-50 border-emerald-200">
                          <CardBody className="py-3">
                            <div className="flex items-center gap-2 text-emerald-700">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="font-medium">Deposit Initiated</span>
                            </div>
                            <div className="mt-2 text-sm text-emerald-600">
                              <p>Ticket ID: #{depositResult.ticketId}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono text-xs truncate">
                                  {depositResult.signature}
                                </span>
                                <button onClick={() => handleCopy(depositResult.signature)}>
                                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      )}
                    </div>
                  </Tab>

                  <Tab
                    key="withdraw"
                    title={
                      <div className="flex items-center gap-2">
                        <ArrowDown className="w-4 h-4 rotate-180" />
                        <span>Withdraw (ZEC → SOL)</span>
                      </div>
                    }
                  >
                    <div className="pt-6 space-y-6">
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-4 border border-amber-100">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-gray-600 text-sm">From Zcash</span>
                          <Chip size="sm" color="warning" variant="flat">
                            <Shield className="w-3 h-3 mr-1" />
                            Shielded Proof
                          </Chip>
                        </div>
                        <Input
                          type="number"
                          placeholder="0.0"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          size="lg"
                          classNames={{
                            input: "text-2xl font-bold",
                            inputWrapper: "bg-white border-gray-200",
                          }}
                          endContent={
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 font-medium">ZEC</span>
                            </div>
                          }
                        />
                      </div>

                      <Input
                        type="text"
                        label="Zcash Transaction ID"
                        placeholder="Enter the Zcash shielded transaction ID"
                        value={zcashTxId}
                        onChange={(e) => setZcashTxId(e.target.value)}
                        description="The transaction ID from your Zcash shielded transfer to the bridge"
                        classNames={{
                          input: "font-mono text-sm",
                        }}
                      />

                      <div className="flex justify-center">
                        <div className="p-3 bg-amber-100 rounded-full">
                          <ArrowDown className="w-5 h-5 text-amber-600 rotate-180" />
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-gray-600 text-sm">To Solana</span>
                        </div>
                        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
                          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                            <Zap className="w-4 h-4 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">Your Wallet</p>
                            <p className="text-xs text-gray-500 font-mono truncate">
                              {connected ? publicKey?.toBase58() : "Not connected"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Button
                        color="warning"
                        size="lg"
                        className="w-full font-bold"
                        onClick={handleWithdraw}
                        isLoading={isWithdrawing}
                        isDisabled={!connected || !withdrawAmount || !zcashTxId}
                      >
                        {!connected ? "Connect Wallet" : "Initiate Withdrawal"}
                      </Button>

                      {withdrawResult && (
                        <Card className="bg-emerald-50 border-emerald-200">
                          <CardBody className="py-3">
                            <div className="flex items-center gap-2 text-emerald-700">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="font-medium">Withdrawal Initiated</span>
                            </div>
                            <div className="mt-2 text-sm text-emerald-600">
                              <p>Ticket ID: #{withdrawResult.ticketId}</p>
                            </div>
                          </CardBody>
                        </Card>
                      )}
                    </div>
                  </Tab>

                  <Tab
                    key="stealth"
                    title={
                      <div className="flex items-center gap-2">
                        <EyeOff className="w-4 h-4" />
                        <span>Stealth Address</span>
                      </div>
                    }
                  >
                    <div className="pt-6 space-y-6">
                      <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <EyeOff className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">Stealth Addresses</h3>
                            <p className="text-sm text-gray-500">
                              Receive private payments on Solana
                            </p>
                          </div>
                        </div>

                        <p className="text-gray-600 text-sm mb-6">
                          Generate a stealth meta-address that allows senders to create 
                          one-time addresses for you. Only you can detect and claim these payments
                          using your private viewing key.
                        </p>

                        <Button
                          color="default"
                          variant="flat"
                          size="lg"
                          className="w-full font-medium"
                          onClick={handleGenerateStealthAddress}
                          isDisabled={!connected}
                        >
                          <Shield className="w-4 h-4 mr-2" />
                          Generate Stealth Meta-Address
                        </Button>
                      </div>

                      {stealthMetaAddress && (
                        <Card className="bg-purple-50 border-purple-200">
                          <CardBody className="space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-purple-900">Your Meta-Address</h4>
                              <Button
                                size="sm"
                                variant="flat"
                                color="secondary"
                                onClick={() => setShowPrivateKeys(!showPrivateKeys)}
                              >
                                {showPrivateKeys ? (
                                  <>
                                    <EyeOff className="w-4 h-4 mr-1" />
                                    Hide Keys
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4 mr-1" />
                                    Show Keys
                                  </>
                                )}
                              </Button>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-purple-600 font-medium">
                                  Meta-Address (share this)
                                </label>
                                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-purple-100">
                                  <code className="text-xs truncate flex-1 text-gray-700">
                                    {stealthMetaAddress.metaAddress}
                                  </code>
                                  <button onClick={() => handleCopy(stealthMetaAddress.metaAddress)}>
                                    <Copy className="w-4 h-4 text-purple-600" />
                                  </button>
                                </div>
                              </div>

                              {showPrivateKeys && (
                                <>
                                  <div>
                                    <label className="text-xs text-red-600 font-medium">
                                      Spending Private Key (KEEP SECRET)
                                    </label>
                                    <div className="flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200">
                                      <code className="text-xs truncate flex-1 text-gray-700">
                                        {stealthMetaAddress.spendingPrivateKey}
                                      </code>
                                      <button onClick={() => handleCopy(stealthMetaAddress.spendingPrivateKey)}>
                                        <Copy className="w-4 h-4 text-red-600" />
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs text-amber-600 font-medium">
                                      Viewing Private Key (for scanning)
                                    </label>
                                    <div className="flex items-center gap-2 bg-amber-50 p-2 rounded-lg border border-amber-200">
                                      <code className="text-xs truncate flex-1 text-gray-700">
                                        {stealthMetaAddress.viewingPrivateKey}
                                      </code>
                                      <button onClick={() => handleCopy(stealthMetaAddress.viewingPrivateKey)}>
                                        <Copy className="w-4 h-4 text-amber-600" />
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>

                            <Button
                              color="secondary"
                              className="w-full"
                              onClick={handleRegisterStealthAddress}
                              isLoading={isRegistering}
                            >
                              Register On-Chain
                            </Button>
                          </CardBody>
                        </Card>
                      )}
                    </div>
                  </Tab>
                </Tabs>
              </CardBody>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-white border border-gray-200 shadow-lg">
              <CardBody className="p-4">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pending Tickets
                </h3>

                {pendingTickets.length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-4">
                    No pending transactions
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pendingTickets.map((ticket, idx) => (
                      <div 
                        key={idx}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {ticket.type === "deposit" ? (
                              <ArrowDown className="w-4 h-4 text-purple-600" />
                            ) : (
                              <ArrowDown className="w-4 h-4 text-amber-600 rotate-180" />
                            )}
                            <span className="font-medium text-sm">
                              {ticket.type === "deposit" ? "Deposit" : "Withdrawal"} #{ticket.ticketId}
                            </span>
                          </div>
                          <Chip size="sm" color={getStatusColor(ticket.status)} variant="flat">
                            {getStatusIcon(ticket.status)}
                            <span className="ml-1">{ticket.status}</span>
                          </Chip>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {formatSolAmount(ticket.amount)} {ticket.type === "deposit" ? "SOL" : "ZEC"}
                          </span>
                          <button 
                            onClick={() => refreshTicketStatus(ticket)}
                            className="p-1 hover:bg-gray-200 rounded"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            <Card className="bg-gradient-to-br from-slate-50 to-gray-50 border border-gray-200">
              <CardBody className="p-4">
                <h3 className="font-bold text-gray-900 mb-4">How It Works</h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs">
                      1
                    </div>
                    <p>Deposit SOL to the bridge and specify a Zcash shielded address</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs">
                      2
                    </div>
                    <p>Bridge operator monitors via Helius webhooks and releases ZEC</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold text-xs">
                      3
                    </div>
                    <p>For withdrawals, send ZEC to bridge and provide proof to claim SOL</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="bg-amber-50 border border-amber-200">
              <CardBody className="p-4">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="font-bold text-sm">Privacy Notice</span>
                </div>
                <p className="text-xs text-amber-600">
                  Zcash shielded transactions provide strong privacy. The bridge 
                  operator cannot see shielded balances or transaction details.
                  Only commitments and nullifiers are verified.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>

        <Modal isOpen={isOpen} onClose={onClose} size="lg">
          <ModalContent>
            <ModalHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Stealth Address Generated
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700 text-sm font-medium mb-2">
                    ⚠️ Save your private keys securely!
                  </p>
                  <p className="text-red-600 text-xs">
                    These keys are required to claim payments sent to your stealth addresses.
                    If you lose them, you will lose access to those funds forever.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Spending Private Key
                    </label>
                    <code className="block text-xs bg-gray-100 p-2 rounded mt-1 break-all">
                      {stealthMetaAddress?.spendingPrivateKey}
                    </code>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Viewing Private Key
                    </label>
                    <code className="block text-xs bg-gray-100 p-2 rounded mt-1 break-all">
                      {stealthMetaAddress?.viewingPrivateKey}
                    </code>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="flat" onPress={onClose}>
                Cancel
              </Button>
              <Button 
                color="primary" 
                onPress={handleRegisterStealthAddress}
                isLoading={isRegistering}
              >
                I've Saved My Keys - Register
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      </div>
    </div>
  );
}
