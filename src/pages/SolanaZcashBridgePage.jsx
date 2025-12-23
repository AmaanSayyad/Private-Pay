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
  const [bridgeError, setBridgeError] = useState(null);
  const [isMinting, setIsMinting] = useState(false);
  const [wZecBalance, setWZecBalance] = useState(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (connected && connection && wallet) {
      const client = new SolanaZcashBridgeClient(connection, wallet.adapter, heliusClient);
      client.initialize().then(() => {
        setBridgeClient(client);
        if (client.isInitialized && client.program) {
          loadBridgeStats(client);
          setBridgeError(null);
        } else {
          setBridgeError("Bridge program not deployed on devnet. Demo mode active.");
        }
        loadPriorityFee(client);
      }).catch((error) => {
        console.error("Failed to initialize bridge client:", error);
        setBridgeError("Failed to connect to bridge program.");
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
      // Silently set demo stats for UI display
      // Set demo stats for UI display
      setBridgeStats({
        totalDeposits: 0,
        totalWithdrawals: 0,
        feeBps: 30,
        isPaused: false,
      });
    }
  };

  const loadPriorityFee = async (client) => {
    try {
      const fee = await client.estimatePriorityFee();
      // Normalize the fee response format
      if (fee?.priorityFeeLevels) {
        setPriorityFee(fee.priorityFeeLevels);
      } else if (fee?.priorityFeeEstimate) {
        setPriorityFee({
          low: Math.floor(fee.priorityFeeEstimate * 0.5),
          medium: fee.priorityFeeEstimate,
          high: Math.floor(fee.priorityFeeEstimate * 2),
        });
      } else {
        // Use the fee object directly if it has low/medium/high
        setPriorityFee(fee);
      }
    } catch (error) {
      console.warn("Failed to estimate priority fee, using defaults:", error.message);
      setPriorityFee({ low: 1000, medium: 5000, high: 10000 });
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleMintTestTokens = async () => {
    if (!bridgeClient) {
      toast.error("Bridge not initialized");
      return;
    }

    setIsMinting(true);
    try {
      const result = await bridgeClient.mintTestTokens(100);
      setWZecBalance(result.balance);
      toast.success(`Minted 100 wZEC! New balance: ${result.balance} wZEC`);
    } catch (error) {
      console.error("Mint failed:", error);
      toast.error(error.message || "Failed to mint test tokens");
    } finally {
      setIsMinting(false);
    }
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
    <div className="flex flex-col items-center w-full min-h-screen py-12 px-4 pb-24">
      <div className="w-full max-w-6xl">
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="flex items-center gap-4">
            <img src="/assets/solana_logo.png" alt="Solana" className="w-12 h-12 rounded-full" />
            <ArrowLeftRight className="w-8 h-8 text-gray-400" />
            <img src="/assets/zcash_logo.png" alt="Zcash" className="w-12 h-12 rounded-full" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-amber-500 bg-clip-text text-transparent mb-2 px-4 text-center">
              Solana ↔ Zcash Bridge
            </h1>
            <p className="text-gray-600 max-w-lg px-4 text-center text-sm sm:text-base">
              Cross-chain privacy bridge powered by Helius. Transfer between Solana and Zcash with zero-knowledge privacy.
            </p>
          </div>
          <div className="flex items-center gap-3">

            {connected && (
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full border ${bridgeError ? 'bg-amber-50 border-amber-200' : 'bg-purple-50 border-purple-200'}`}>
                <div className={`w-2 h-2 rounded-full animate-pulse ${bridgeError ? 'bg-amber-500' : 'bg-purple-500'}`} />
                <span className={`text-sm font-medium ${bridgeError ? 'text-amber-700' : 'text-purple-700'} flex items-center gap-1`}>
                  {bridgeError ? "Demo Mode" : bridgeClient ? (
                    <>
                      <Zap className="w-3 h-3 fill-current" />
                      Powered by Helius
                    </>
                  ) : "Connecting..."}
                </span>
              </div>
            )}
            {connected && (
              <Button
                size="sm"
                className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white font-semibold"
                onClick={handleMintTestTokens}
                isLoading={isMinting}
              >
                {isMinting ? "Minting..." : "Get Test wZEC"}
              </Button>
            )}
            <WalletMultiButton
              className="!bg-[#0d08e3] !rounded-xl !h-10 hover:!bg-[#0e0dc6] !text-white"
              style={{ backgroundColor: '#0d08e3' }}
            />
          </div>
        </div>

        {bridgeError && (
          <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 shadow-sm mb-6">
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <div>
                  <p className="text-amber-800 font-medium text-sm">{bridgeError}</p>
                  <p className="text-amber-600 text-xs mt-1">The bridge UI is functional but transactions require the on-chain program to be deployed.</p>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 shadow-sm mb-6">
          <CardBody className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center flex-shrink-0">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-gray-900 font-bold text-sm sm:text-base">Privacy-Preserving Bridge</h3>
                  <p className="text-gray-600 text-xs sm:text-sm">Powered by Helius Monitoring</p>
                </div>
              </div>
              <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-center">
                <div className="flex items-center gap-2 text-gray-700">
                  <Lock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium whitespace-nowrap">ZK Proofs</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Priority Fees</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
                  <span className="text-xs sm:text-sm font-medium whitespace-nowrap">Shielded</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {bridgeStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 shadow-sm">
              <CardBody className="py-5">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDown className="w-4 h-4 text-purple-600" />
                  <p className="text-purple-600 text-xs font-semibold">Total Deposits</p>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {formatSolAmount(bridgeStats.totalDeposits)} <span className="text-sm text-purple-600">SOL</span>
                </p>
              </CardBody>
            </Card>
            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 shadow-sm">
              <CardBody className="py-5">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDown className="w-4 h-4 text-amber-600 rotate-180" />
                  <p className="text-amber-600 text-xs font-semibold">Total Withdrawals</p>
                </div>
                <p className="text-2xl font-bold text-amber-900">
                  {formatSolAmount(bridgeStats.totalWithdrawals)} <span className="text-sm text-amber-600">SOL</span>
                </p>
              </CardBody>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200 shadow-sm">
              <CardBody className="py-5">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-purple-600" />
                  <p className="text-purple-600 text-xs font-semibold">Bridge Fee</p>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {bridgeStats.feeBps / 100}%
                </p>
              </CardBody>
            </Card>
            <Card className={`bg-gradient-to-br ${bridgeStats.isPaused ? 'from-red-50 to-rose-50 border-red-200' : 'from-purple-50 to-indigo-50 border-purple-200'} border shadow-sm`}>
              <CardBody className="py-5">
                <div className="flex items-center gap-2 mb-2">
                  {bridgeStats.isPaused ? (
                    <XCircle className="w-4 h-4 text-red-600" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  )}
                  <p className={`text-xs font-semibold ${bridgeStats.isPaused ? 'text-red-600' : 'text-purple-600'}`}>Status</p>
                </div>
                <p className={`text-2xl font-bold ${bridgeStats.isPaused ? 'text-red-900' : 'text-purple-900'}`}>
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
                    tabList: "gap-3 sm:gap-6 w-full relative rounded-none p-0 border-b border-divider px-3 sm:px-6 overflow-x-auto",
                    cursor: "bg-gradient-to-r from-purple-600 to-indigo-600",
                    tab: "max-w-fit px-0 h-12 flex-shrink-0",
                    tabContent: "group-data-[selected=true]:text-purple-600 group-data-[selected=true]:font-semibold whitespace-nowrap"
                  }}
                >
                  <Tab
                    key="deposit"
                    title={
                      <div className="flex items-center gap-2">
                        <ArrowDown className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">Deposit</span>
                        <span className="hidden sm:inline">(SOL → ZEC)</span>
                      </div>
                    }
                  >
                    <div className="pt-6 space-y-6">
                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <img src="/assets/solana_logo.png" alt="Solana" className="w-6 h-6 rounded-full flex-shrink-0" />
                            <span className="text-gray-700 text-sm font-semibold whitespace-nowrap">From Solana</span>
                          </div>
                          {priorityFee && (
                            <Tooltip content="Estimated priority fee for fast confirmation">
                              <Chip size="sm" className="bg-purple-100 text-purple-700 border-purple-200 whitespace-nowrap" variant="flat">
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
                            inputWrapper: "h-14 bg-white border-gray-200",
                          }}
                          endContent={
                            <div className="flex items-center gap-2">
                              <img src="/assets/solana_logo.png" alt="SOL" className="w-5 h-5 rounded-full" />
                              <span className="text-gray-600 font-semibold">SOL</span>
                            </div>
                          }
                        />
                        <div className="flex items-center justify-between mt-2 text-xs text-gray-500 flex-wrap gap-1">
                          <span className="whitespace-nowrap">Min: {BRIDGE_CONSTANTS.MIN_DEPOSIT_SOL} SOL</span>
                          <span className="whitespace-nowrap">Max: {BRIDGE_CONSTANTS.MAX_DEPOSIT_SOL} SOL</span>
                        </div>
                      </div>

                      <div className="flex justify-center -my-2 z-10 relative">
                        <div className="bg-white p-3 rounded-full border-2 border-purple-300 shadow-lg flex items-center justify-center">
                          <ArrowDown className="w-6 h-6 text-purple-600" />
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-6 border border-amber-200">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <img src="/assets/zcash_logo.png" alt="Zcash" className="w-6 h-6 rounded-full flex-shrink-0" />
                            <span className="text-gray-700 text-sm font-semibold whitespace-nowrap">To Zcash</span>
                            <span className="hidden sm:inline text-gray-700 text-sm font-semibold">(Shielded)</span>
                          </div>
                          <Chip size="sm" color="warning" variant="flat" className="flex-shrink-0 h-auto py-1.5">
                            <Shield className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="whitespace-nowrap leading-tight">Private</span>
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
                        size="lg"
                        className="w-full h-12 font-bold bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all"
                        onClick={handleDeposit}
                        isLoading={isDepositing}
                        isDisabled={!connected || !depositAmount || !isValidZcashAddress(zcashDestAddress)}
                        startContent={!isDepositing && <ArrowDown className="w-5 h-5" />}
                      >
                        {!connected ? "Connect Wallet" : "Initiate Deposit"}
                      </Button>

                      {depositResult && (
                        <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
                          <CardBody className="py-3">
                            <div className="flex items-center gap-2 text-purple-700">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="font-medium">Deposit Initiated</span>
                            </div>
                            <div className="mt-2 text-sm text-purple-600">
                              <p>Ticket ID: #{depositResult.ticketId}</p>
                              <div className="flex items-center gap-2 mt-1 min-w-0">
                                <a
                                  href={`https://solscan.io/tx/${depositResult.signature}?cluster=devnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-xs truncate flex-1 min-w-0 hover:text-purple-800 hover:underline cursor-pointer"
                                >
                                  {depositResult.signature}
                                </a>
                                <a
                                  href={`https://solscan.io/tx/${depositResult.signature}?cluster=devnet`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex-shrink-0 hover:text-purple-800"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                                <button onClick={() => handleCopy(depositResult.signature)} className="flex-shrink-0">
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
                        <ArrowDown className="w-4 h-4 rotate-180 flex-shrink-0" />
                        <span className="whitespace-nowrap">Withdraw</span>
                        <span className="hidden sm:inline">(ZEC → SOL)</span>
                      </div>
                    }
                  >
                    <div className="pt-6 space-y-6">
                      <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl p-6 border border-amber-200">
                        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <img src="/assets/zcash_logo.png" alt="Zcash" className="w-6 h-6 rounded-full flex-shrink-0" />
                            <span className="text-gray-700 text-sm font-semibold whitespace-nowrap">From Zcash</span>
                          </div>
                          <Chip size="sm" color="warning" variant="flat" className="flex-shrink-0 h-auto py-1.5">
                            <Shield className="w-3 h-3 mr-1 flex-shrink-0" />
                            <span className="whitespace-nowrap leading-tight">
                              <span className="hidden sm:inline">Shielded </span>Proof
                            </span>
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
                            inputWrapper: "h-14 bg-white border-gray-200",
                          }}
                          endContent={
                            <div className="flex items-center gap-2">
                              <img src="/assets/zcash_logo.png" alt="ZEC" className="w-5 h-5 rounded-full" />
                              <span className="text-gray-600 font-semibold">ZEC</span>
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

                      <div className="flex justify-center -my-2 z-10 relative">
                        <div className="bg-white p-3 rounded-full border-2 border-amber-300 shadow-lg flex items-center justify-center">
                          <ArrowDown className="w-6 h-6 text-amber-600 rotate-180" />
                        </div>
                      </div>

                      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <img src="/assets/solana_logo.png" alt="Solana" className="w-6 h-6 rounded-full flex-shrink-0" />
                            <span className="text-gray-700 text-sm font-semibold whitespace-nowrap">To Solana</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-200">
                          <img src="/assets/solana_logo.png" alt="Solana" className="w-10 h-10 rounded-full" />
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-gray-900">Your Wallet</p>
                            <p className="text-xs text-gray-500 font-mono truncate">
                              {connected ? publicKey?.toBase58() : "Not connected"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="lg"
                        className="w-full h-12 font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-lg hover:shadow-xl transition-all"
                        onClick={handleWithdraw}
                        isLoading={isWithdrawing}
                        isDisabled={!connected || !withdrawAmount || !zcashTxId}
                        startContent={!isWithdrawing && <ArrowDown className="w-5 h-5 rotate-180" />}
                      >
                        {!connected ? "Connect Wallet" : "Initiate Withdrawal"}
                      </Button>

                      {withdrawResult && (
                        <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                          <CardBody className="py-3">
                            <div className="flex items-center gap-2 text-amber-700">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="font-medium">Withdrawal Initiated</span>
                            </div>
                            <div className="mt-2 text-sm text-amber-600">
                              <p>Ticket ID: #{withdrawResult.ticketId}</p>
                              {withdrawResult.signature && (
                                <div className="flex items-center gap-2 mt-1 min-w-0">
                                  <a
                                    href={`https://solscan.io/tx/${withdrawResult.signature}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-xs truncate flex-1 min-w-0 hover:text-amber-800 hover:underline cursor-pointer"
                                  >
                                    {withdrawResult.signature}
                                  </a>
                                  <a
                                    href={`https://solscan.io/tx/${withdrawResult.signature}?cluster=devnet`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-shrink-0 hover:text-amber-800"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                  <button onClick={() => handleCopy(withdrawResult.signature)} className="flex-shrink-0">
                                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                </div>
                              )}
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
                          variant="flat"
                          size="lg"
                          className="w-full font-medium bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
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
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <h4 className="font-bold text-purple-900 text-sm sm:text-base">Your Meta-Address</h4>
                              <Button
                                size="sm"
                                variant="flat"
                                className="text-purple-700 hover:bg-purple-50 flex-shrink-0"
                                onClick={() => setShowPrivateKeys(!showPrivateKeys)}
                              >
                                {showPrivateKeys ? (
                                  <>
                                    <EyeOff className="w-4 h-4 mr-1" />
                                    <span className="hidden sm:inline">Hide </span>Keys
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4 mr-1" />
                                    <span className="hidden sm:inline">Show </span>Keys
                                  </>
                                )}
                              </Button>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="text-xs text-purple-600 font-medium">
                                  Meta-Address (share this)
                                </label>
                                <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-purple-100 min-w-0">
                                  <code className="text-xs truncate flex-1 text-gray-700 min-w-0">
                                    {stealthMetaAddress.metaAddress}
                                  </code>
                                  <button onClick={() => handleCopy(stealthMetaAddress.metaAddress)} className="flex-shrink-0">
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
                                    <div className="flex items-center gap-2 bg-red-50 p-2 rounded-lg border border-red-200 min-w-0">
                                      <code className="text-xs truncate flex-1 text-gray-700 min-w-0">
                                        {stealthMetaAddress.spendingPrivateKey}
                                      </code>
                                      <button onClick={() => handleCopy(stealthMetaAddress.spendingPrivateKey)} className="flex-shrink-0">
                                        <Copy className="w-4 h-4 text-red-600" />
                                      </button>
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-xs text-amber-600 font-medium">
                                      Viewing Private Key (for scanning)
                                    </label>
                                    <div className="flex items-center gap-2 bg-amber-50 p-2 rounded-lg border border-amber-200 min-w-0">
                                      <code className="text-xs truncate flex-1 text-gray-700 min-w-0">
                                        {stealthMetaAddress.viewingPrivateKey}
                                      </code>
                                      <button onClick={() => handleCopy(stealthMetaAddress.viewingPrivateKey)} className="flex-shrink-0">
                                        <Copy className="w-4 h-4 text-amber-600" />
                                      </button>
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>

                            <Button
                              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:from-purple-500 hover:to-indigo-500"
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
                        <div className="flex items-center justify-between mb-2 gap-2 min-w-0">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {ticket.type === "deposit" ? (
                              <ArrowDown className="w-4 h-4 text-purple-600 flex-shrink-0" />
                            ) : (
                              <ArrowDown className="w-4 h-4 text-amber-600 rotate-180 flex-shrink-0" />
                            )}
                            <span className="font-medium text-sm truncate">
                              {ticket.type === "deposit" ? "Deposit" : "Withdrawal"} #{ticket.ticketId}
                            </span>
                          </div>
                          <Chip size="sm" color={getStatusColor(ticket.status)} variant="flat" className="flex-shrink-0">
                            {getStatusIcon(ticket.status)}
                            <span className="ml-1 whitespace-nowrap">{ticket.status}</span>
                          </Chip>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500 gap-2">
                          <span className="whitespace-nowrap">
                            {formatSolAmount(ticket.amount)} {ticket.type === "deposit" ? "SOL" : "ZEC"}
                          </span>
                          <button
                            onClick={() => refreshTicketStatus(ticket)}
                            className="p-1 hover:bg-gray-200 rounded flex-shrink-0"
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

            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200">
              <CardBody className="p-4">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-purple-600" />
                  How It Works
                </h3>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      1
                    </div>
                    <p className="text-sm text-gray-700 min-w-0 break-words">Deposit SOL to the bridge and specify a Zcash shielded address</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      2
                    </div>
                    <p className="text-sm text-gray-700 min-w-0 break-words">Bridge operator monitors via Helius webhooks and releases ZEC</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-indigo-400 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      3
                    </div>
                    <p className="text-sm text-gray-700 min-w-0 break-words">For withdrawals, send ZEC to bridge and provide proof to claim SOL</p>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200">
              <CardBody className="p-4">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <Shield className="w-5 h-5" />
                  <span className="font-bold text-sm">Privacy Notice</span>
                </div>
                <p className="text-xs text-amber-700">
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
