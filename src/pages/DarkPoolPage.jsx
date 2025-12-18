import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Chip,
  Spinner,
  Tabs,
  Tab,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Progress,
} from "@nextui-org/react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useArcium } from "../providers/SolanaProvider";
import { Icons } from "../components/shared/Icons";
import {
  BarChart3,
  Shield,
  Lock,
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  Clock,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Layers,
  Activity,
} from "lucide-react";
import toast from "react-hot-toast";
import * as anchor from "@coral-xyz/anchor";
import { randomBytes } from "crypto";
import { useArciumClient, getPrivatePayProgram } from "@/lib/arcium/index.js";
import { PRIVATE_PAY_PROGRAM_ID, ARCIUM_PROGRAM_ID } from "@/lib/arcium/constants.js";
import {
  getArciumEnvSafe,
  getCompDefAccOffsetSafe,
  getCompDefAccAddressSafe,
  getMempoolAccAddressSafe,
  getExecutingPoolAccAddressSafe,
  getFeePoolAccAddressSafe,
  getClockAccAddressSafe,
  getComputationAccAddressSafe,
  awaitComputationFinalizationSafe,
} from "@/lib/arcium/env.js";

// Arcium client functions will be imported dynamically
let arciumClientLib = null;
const loadArciumClient = async () => {
  if (!arciumClientLib) {
    try {
      arciumClientLib = await import("@arcium-hq/client");
    } catch (e) {
      console.warn("@arcium-hq/client not available:", e);
      return null;
    }
  }
  return arciumClientLib;
};

const SIGN_PDA_SEED = "SignerAccount";

// Trading pairs
const TRADING_PAIRS = [
  { id: "sol-usdc", base: "SOL", quote: "USDC", price: 180.42 },
  { id: "sol-usdt", base: "SOL", quote: "USDT", price: 180.38 },
];

// Mock order data (encrypted in reality)
const MOCK_ORDERS = [
  { id: 1, side: "buy", size: "****", price: "****", status: "active", time: "2m ago" },
  { id: 2, side: "sell", size: "****", price: "****", status: "active", time: "5m ago" },
  { id: 3, side: "buy", size: "****", price: "****", status: "filled", time: "12m ago" },
];

const MOCK_TRADES = [
  { id: 1, side: "buy", size: "25", price: "180.50", time: "1m ago" },
  { id: 2, side: "sell", size: "10", price: "180.45", time: "3m ago" },
  { id: 3, side: "buy", size: "50", price: "180.40", time: "7m ago" },
];

export default function DarkPoolPage() {
  const navigate = useNavigate();
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { isInitialized } = useArcium();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const arciumClient = useArciumClient();

  // Order state
  const [selectedPair, setSelectedPair] = useState("sol-usdc");
  const [orderSide, setOrderSide] = useState("buy");
  const [orderType, setOrderType] = useState("limit");
  const [orderSize, setOrderSize] = useState("");
  const [orderPrice, setOrderPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderStatus, setOrderStatus] = useState(null);
  const [activeTab, setActiveTab] = useState("orderbook");

  const provider = useMemo(() => {
    if (!arciumClient?.provider) return null;
    return arciumClient.provider;
  }, [arciumClient]);

  const program = useMemo(() => {
    if (!provider) return null;
    try {
      return getPrivatePayProgram(provider);
    } catch (error) {
      console.error("Failed to get Private Pay Program:", error);
      return null;
    }
  }, [provider]);

  const ensureReady = () => {
    if (!connected || !publicKey) {
      toast.error("Cüzdan bağlayın.");
      return false;
    }
    
    if (!arciumClient) {
      toast.error("Arcium client oluşturulamadı. Lütfen sayfayı yenileyin.");
      return false;
    }
    
    if (!program) {
      toast.error("Program yüklenemedi. Program ID kontrol edin.");
      return false;
    }
    
    return true;
  };

  const deriveSignPda = () => {
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from(SIGN_PDA_SEED)],
      ARCIUM_PROGRAM_ID
    );
    return pda;
  };

  const deriveOrderBookPda = (pair) => {
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("orderbook"), Buffer.from(pair)],
      PRIVATE_PAY_PROGRAM_ID
    );
    return pda;
  };

  const deriveCompDef = async (ixName) => {
    const offset = getCompDefAccOffsetSafe(ixName);
    return await getCompDefAccAddressSafe(PRIVATE_PAY_PROGRAM_ID, offset);
  };

  // Stats
  const [stats] = useState({
    totalVolume: "$2.4M",
    activeOrders: 156,
    avgSpread: "0.02%",
    matchRate: "94%",
  });

  // Get current pair info
  const currentPair = useMemo(
    () => TRADING_PAIRS.find((p) => p.id === selectedPair),
    [selectedPair]
  );

  // Place order
  const handlePlaceOrder = useCallback(async () => {
    if (!ensureReady() || !orderSize || (orderType === "limit" && !orderPrice)) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }

    setIsSubmitting(true);
    setOrderStatus("encrypting");

    try {
      // Step 1: Get MXE public key and encrypt order data
      const arciumLib = await loadArciumClient();
      if (!arciumLib) {
        throw new Error("@arcium-hq/client kütüphanesi yüklenmemiş.");
      }

      const mxePublicKey = await arciumLib.getMXEPublicKeyWithRetry(
        provider,
        PRIVATE_PAY_PROGRAM_ID
      );

      const privateKey = arciumLib.x25519.utils.randomSecretKey();
      const encryptionPublicKey = arciumLib.x25519.getPublicKey(privateKey);
      const sharedSecret = arciumLib.x25519.getSharedSecret(privateKey, mxePublicKey);
      const cipher = new arciumLib.RescueCipher(sharedSecret);

      // Convert amounts to proper units
      const sizeBn = new anchor.BN(parseFloat(orderSize) * 1e9);
      const priceBn = orderType === "limit" 
        ? new anchor.BN(parseFloat(orderPrice) * 1e6) // Assuming 6 decimals for USDC
        : new anchor.BN(0); // Market orders use current price
      const side = orderSide === "buy" ? 0 : 1;

      // Encrypt order fields separately
      const sidePlaintext = [BigInt(side)];
      const sizePlaintext = [BigInt(sizeBn.toString())];
      const pricePlaintext = [BigInt(priceBn.toString())];
      const nonce = randomBytes(16);
      
      const ciphertextSide = cipher.encrypt(sidePlaintext, nonce)[0];
      const ciphertextSize = cipher.encrypt(sizePlaintext, nonce)[0];
      const ciphertextPrice = cipher.encrypt(pricePlaintext, nonce)[0];

      setOrderStatus("submitting");

      // Step 2: Submit to dark pool
      const compOffset = new anchor.BN(randomBytes(8), "hex");
      const nonceU128 = new anchor.BN(nonce, "le");

      const env = await getArciumEnvSafe();
      const signPda = deriveSignPda();
      const orderBookPda = deriveOrderBookPda(selectedPair);
      const compDef = await deriveCompDef("place_order");
      const mempool = await getMempoolAccAddressSafe(env.arciumClusterOffset);
      const executingPool = await getExecutingPoolAccAddressSafe(env.arciumClusterOffset);
      const clusterAccount = arciumClient.clusterAccount;
      const feePool = await getFeePoolAccAddressSafe(env.arciumClusterOffset);
      const clockAcc = await getClockAccAddressSafe(env.arciumClusterOffset);
      const computationAcc = await getComputationAccAddressSafe(env.arciumClusterOffset, compOffset);

      const tx = await program.methods
        .placeOrder(
          compOffset,
          Array.from(ciphertextSide),
          Array.from(ciphertextSize),
          Array.from(ciphertextPrice),
          Array.from(encryptionPublicKey),
          nonceU128
        )
        .accounts({
          payer: publicKey,
          signPdaAccount: signPda,
          mxeAccount: arciumClient.mxeAccount,
          mempoolAccount: mempool,
          executingPool,
          computationAccount: computationAcc,
          compDefAccount: compDef,
          clusterAccount: clusterAccount,
          poolAccount: feePool,
          clockAccount: clockAcc,
          systemProgram: anchor.web3.SystemProgram.programId,
          arciumProgram: ARCIUM_PROGRAM_ID,
          orderBookAccount: orderBookPda,
        })
        .transaction();

      const sig = await sendTransaction(tx, provider.connection);
      await provider.connection.confirmTransaction(sig, "confirmed");
      toast.success(`Order transaction gönderildi: ${sig}`);

      setOrderStatus("processing");

      // Step 3: Wait for MPC computation
      toast.loading("MPC hesaplaması bekleniyor...");
      await awaitComputationFinalizationSafe(provider.connection, compOffset, PRIVATE_PAY_PROGRAM_ID, "confirmed");
      
      setOrderStatus("success");
      toast.success("Order dark pool'a başarıyla eklendi!");
      onOpen();

    } catch (error) {
      console.error("Order failed:", error);
      setOrderStatus("error");
      toast.error(error.message || "Order başarısız. Lütfen tekrar deneyin.");
    } finally {
      setIsSubmitting(false);
    }
  }, [connected, orderSize, orderPrice, orderSide, orderType, selectedPair, arciumClient, provider, program, onOpen, sendTransaction]);

  // Trigger matching
  const handleMatchOrders = useCallback(async () => {
    if (!ensureReady()) return;

    setIsSubmitting(true);
    try {
      const arciumLib = await loadArciumClient();
      if (!arciumLib) {
        throw new Error("@arcium-hq/client kütüphanesi yüklenmemiş.");
      }

      const mxePublicKey = await arciumLib.getMXEPublicKeyWithRetry(
        provider,
        PRIVATE_PAY_PROGRAM_ID
      );

      const privateKey = arciumLib.x25519.utils.randomSecretKey();
      const encryptionPublicKey = arciumLib.x25519.getPublicKey(privateKey);
      const sharedSecret = arciumLib.x25519.getSharedSecret(privateKey, mxePublicKey);
      const cipher = new arciumLib.RescueCipher(sharedSecret);

      // Mock buy and sell orders for matching (in production, these would come from order book)
      const buySide = BigInt(0);
      const buySize = BigInt(1000000);
      const buyPrice = BigInt(180000000);
      const sellSide = BigInt(1);
      const sellSize = BigInt(1000000);
      const sellPrice = BigInt(180000000);

      const nonce = randomBytes(16);
      const ciphertextBuySide = cipher.encrypt([buySide], nonce)[0];
      const ciphertextBuySize = cipher.encrypt([buySize], nonce)[0];
      const ciphertextBuyPrice = cipher.encrypt([buyPrice], nonce)[0];
      const ciphertextSellSide = cipher.encrypt([sellSide], nonce)[0];
      const ciphertextSellSize = cipher.encrypt([sellSize], nonce)[0];
      const ciphertextSellPrice = cipher.encrypt([sellPrice], nonce)[0];

      const compOffset = new anchor.BN(randomBytes(8), "hex");
      const nonceU128 = new anchor.BN(nonce, "le");

      const env = await getArciumEnvSafe();
      const signPda = deriveSignPda();
      const orderBookPda = deriveOrderBookPda(selectedPair);
      const compDef = await deriveCompDef("match_orders");
      const mempool = await getMempoolAccAddressSafe(env.arciumClusterOffset);
      const executingPool = await getExecutingPoolAccAddressSafe(env.arciumClusterOffset);
      const clusterAccount = arciumClient.clusterAccount;
      const feePool = await getFeePoolAccAddressSafe(env.arciumClusterOffset);
      const clockAcc = await getClockAccAddressSafe(env.arciumClusterOffset);
      const computationAcc = await getComputationAccAddressSafe(env.arciumClusterOffset, compOffset);

      const tx = await program.methods
        .matchOrders(
          compOffset,
          Array.from(ciphertextBuySide),
          Array.from(ciphertextBuySize),
          Array.from(ciphertextBuyPrice),
          Array.from(ciphertextSellSide),
          Array.from(ciphertextSellSize),
          Array.from(ciphertextSellPrice),
          Array.from(encryptionPublicKey),
          nonceU128
        )
        .accounts({
          payer: publicKey,
          signPdaAccount: signPda,
          mxeAccount: arciumClient.mxeAccount,
          mempoolAccount: mempool,
          executingPool,
          computationAccount: computationAcc,
          compDefAccount: compDef,
          clusterAccount: clusterAccount,
          poolAccount: feePool,
          clockAccount: clockAcc,
          systemProgram: anchor.web3.SystemProgram.programId,
          arciumProgram: ARCIUM_PROGRAM_ID,
          orderBookAccount: orderBookPda,
        })
        .transaction();

      const sig = await sendTransaction(tx, provider.connection);
      await provider.connection.confirmTransaction(sig, "confirmed");
      toast.success(`Match transaction gönderildi: ${sig}`);

      toast.loading("MPC hesaplaması bekleniyor...");
      await awaitComputationFinalizationSafe(provider.connection, compOffset, PRIVATE_PAY_PROGRAM_ID, "confirmed");
      
      toast.success("Order matching tamamlandı!");
    } catch (error) {
      console.error("Matching failed:", error);
      toast.error(error.message || "Matching başarısız.");
    } finally {
      setIsSubmitting(false);
    }
  }, [connected, selectedPair, arciumClient, provider, program, sendTransaction]);

  const statusMessages = {
    encrypting: "Encrypting order...",
    submitting: "Submitting to dark pool...",
    processing: "Adding to order book...",
    success: "Order placed!",
    error: "Order failed",
  };

  return (
    <div className="flex min-h-screen w-full items-start justify-center py-20 px-4 md:px-10 bg-gradient-to-br from-white to-indigo-50/30">
      <div className="w-full max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button
              isIconOnly
              variant="light"
              className="text-gray-600"
              onClick={() => navigate("/arcium")}
            >
              <Icons.back className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-3">
              <img src="/assets/arcium.png" alt="Arcium" className="w-8 h-8 rounded-full" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  Dark Pool
                  <Chip size="sm" color="primary" variant="flat">
                    Private Order Book
                  </Chip>
                </h1>
                <p className="text-gray-500 text-sm">
                  Trade with hidden orders, protected from front-running
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select
              selectedKeys={[selectedPair]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0];
                if (selected) setSelectedPair(selected);
              }}
              className="w-40"
              variant="bordered"
              startContent={
                <div className="flex items-center justify-center gap-1">
                  <img 
                    src="/assets/solana_logo.png" 
                    alt={currentPair?.base} 
                    className="w-4 h-4 rounded-full" 
                  />
                  <span className="text-gray-400 text-xs">/</span>
                  <img 
                    src={currentPair?.quote === "USDC" ? "/assets/usdc.png" : "/assets/usdt_logo.png"} 
                    alt={currentPair?.quote} 
                    className="w-4 h-4 rounded-full" 
                  />
                </div>
              }
              classNames={{
                trigger: "h-10",
                value: "flex items-center"
              }}
            >
              {TRADING_PAIRS.map((pair) => {
                const baseIcon = "/assets/solana_logo.png";
                const quoteIcon = pair.quote === "USDC" ? "/assets/usdc.png" : "/assets/usdt_logo.png";
                return (
                  <SelectItem 
                    key={pair.id} 
                    value={pair.id}
                    textValue={`${pair.base}/${pair.quote}`}
                    startContent={
                      <div className="flex items-center justify-center gap-1">
                        <img src={baseIcon} alt={pair.base} className="w-4 h-4 rounded-full" />
                        <span className="text-gray-400 text-xs">/</span>
                        <img src={quoteIcon} alt={pair.quote} className="w-4 h-4 rounded-full" />
                      </div>
                    }
                  >
                    {pair.base}/{pair.quote}
                  </SelectItem>
                );
              })}
            </Select>
            <WalletMultiButton className="!bg-primary !rounded-xl !h-10" />
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "24h Volume", value: stats.totalVolume, icon: <BarChart3 className="w-4 h-4" /> },
            { label: "Active Orders", value: stats.activeOrders, icon: <Layers className="w-4 h-4" /> },
            { label: "Avg Spread", value: stats.avgSpread, icon: <Activity className="w-4 h-4" /> },
            { label: "Match Rate", value: stats.matchRate, icon: <Check className="w-4 h-4" /> },
          ].map((stat, i) => (
            <Card key={i} className="bg-white border border-gray-200 shadow-sm">
              <CardBody className="flex flex-row items-center justify-between p-4">
                <div>
                  <p className="text-gray-500 text-xs">{stat.label}</p>
                  <p className="text-gray-900 text-lg font-bold">{stat.value}</p>
                </div>
                <div className="text-primary">{stat.icon}</div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Form */}
          <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl lg:col-span-1">
            <CardBody className="p-6">
              <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                Place Hidden Order
              </h3>

              {/* Order Type Tabs */}
              <Tabs
                selectedKey={orderSide}
                onSelectionChange={setOrderSide}
                className="mb-4"
                classNames={{
                  tabList: "bg-gray-50",
                  tab: "text-gray-600",
                  cursor: "bg-primary",
                }}
              >
                <Tab
                  key="buy"
                  title={
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Buy
                    </span>
                  }
                />
                <Tab
                  key="sell"
                  title={
                    <span className="flex items-center gap-2">
                      <TrendingDown className="w-4 h-4" /> Sell
                    </span>
                  }
                />
              </Tabs>

              {/* Order Type */}
              <div className="flex gap-2 mb-4">
                {["limit", "market"].map((type) => (
                  <Button
                    key={type}
                    size="sm"
                    variant={orderType === type ? "solid" : "flat"}
                    color={orderType === type ? "primary" : "default"}
                    onClick={() => setOrderType(type)}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
                ))}
              </div>

              {/* Price Input */}
              {orderType === "limit" && (
                <div className="mb-4">
                  <label className="text-gray-600 text-sm mb-2 block">
                    Price ({currentPair?.quote})
                  </label>
                  <Input
                    type="number"
                    placeholder={currentPair?.price.toString()}
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(e.target.value)}
                    variant="bordered"
                    endContent={
                      <div className="flex items-center gap-1">
                        <img 
                          src={currentPair?.quote === "USDC" ? "/assets/usdc.png" : "/assets/usdt_logo.png"} 
                          alt={currentPair?.quote} 
                          className="w-4 h-4 rounded-full" 
                        />
                        <span className="text-gray-500 text-sm">
                          {currentPair?.quote}
                        </span>
                      </div>
                    }
                  />
                </div>
              )}

              {/* Size Input */}
              <div className="mb-4">
                <label className="text-gray-600 text-sm mb-2 block">
                  Size ({currentPair?.base})
                </label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={orderSize}
                  onChange={(e) => setOrderSize(e.target.value)}
                  variant="bordered"
                  endContent={
                    <div className="flex items-center gap-1">
                      <img 
                        src="/assets/solana_logo.png" 
                        alt={currentPair?.base} 
                        className="w-4 h-4 rounded-full" 
                      />
                      <span className="text-gray-500 text-sm">
                        {currentPair?.base}
                      </span>
                    </div>
                  }
                />
              </div>

              {/* Total */}
              <div className="mb-6 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Total</span>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-900 font-mono">
                      {orderSize && orderPrice
                        ? (parseFloat(orderSize) * parseFloat(orderPrice)).toFixed(2)
                        : "0.00"}
                    </span>
                    <img 
                      src={currentPair?.quote === "USDC" ? "/assets/usdc.png" : "/assets/usdt_logo.png"} 
                      alt={currentPair?.quote} 
                      className="w-4 h-4 rounded-full" 
                    />
                    <span className="text-gray-900 font-mono">
                      {currentPair?.quote}
                    </span>
                  </div>
                </div>
              </div>

              {/* Privacy Notice */}
              <Card className="bg-primary/10 border border-primary/20 mb-4">
                <CardBody className="p-3">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-primary mt-0.5" />
                    <div>
                      <p className="text-primary text-xs font-medium">
                        Order Privacy
                      </p>
                      <p className="text-gray-600 text-xs">
                        Size and price are encrypted. Only matched trades are revealed.
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Place Order Button */}
              {!connected ? (
                <WalletMultiButton className="!w-full !bg-primary !rounded-xl !h-12 !justify-center" />
              ) : (
                <Button
                  color={orderSide === "buy" ? "primary" : "danger"}
                  className="w-full h-12 font-semibold"
                  onClick={handlePlaceOrder}
                  isDisabled={!orderSize || (orderType === "limit" && !orderPrice) || isSubmitting}
                  isLoading={isSubmitting}
                >
                  {isSubmitting
                    ? statusMessages[orderStatus]
                    : `${orderSide === "buy" ? "Buy" : "Sell"} ${currentPair?.base}`}
                </Button>
              )}
            </CardBody>
          </Card>

          {/* Order Book & Trades */}
          <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl lg:col-span-2">
            <CardBody className="p-6">
              <Tabs
                selectedKey={activeTab}
                onSelectionChange={setActiveTab}
                classNames={{
                  tabList: "bg-gray-50",
                  tab: "text-gray-600",
                  cursor: "bg-primary",
                }}
              >
                <Tab
                  key="orderbook"
                  title={
                    <span className="flex items-center gap-2">
                      <Layers className="w-4 h-4" /> Order Book
                    </span>
                  }
                >
                  <div className="mt-4">
                    {/* Hidden Order Book Visualization */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      {/* Bids */}
                      <div>
                        <h4 className="text-emerald-600 font-medium mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" /> Bids (Hidden)
                        </h4>
                        <div className="space-y-2">
                          {[85, 70, 55, 40, 25].map((width, i) => (
                            <div key={i} className="relative h-8">
                              <div
                                className="absolute inset-y-0 right-0 bg-emerald-500/20 rounded"
                                style={{ width: `${width}%` }}
                              />
                              <div className="relative flex justify-between items-center px-3 h-full">
                                <span className="text-gray-500 text-sm font-mono">
                                  *****
                                </span>
                                <span className="text-gray-500 text-sm font-mono">
                                  ****
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Asks */}
                      <div>
                        <h4 className="text-red-600 font-medium mb-3 flex items-center gap-2">
                          <TrendingDown className="w-4 h-4" /> Asks (Hidden)
                        </h4>
                        <div className="space-y-2">
                          {[30, 45, 60, 75, 90].map((width, i) => (
                            <div key={i} className="relative h-8">
                              <div
                                className="absolute inset-y-0 left-0 bg-red-500/20 rounded"
                                style={{ width: `${width}%` }}
                              />
                              <div className="relative flex justify-between items-center px-3 h-full">
                                <span className="text-gray-500 text-sm font-mono">
                                  *****
                                </span>
                                <span className="text-gray-500 text-sm font-mono">
                                  ****
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-200">
                      <EyeOff className="w-5 h-5 text-gray-500" />
                      <span className="text-gray-600 text-sm">
                        Order details encrypted until matched
                      </span>
                    </div>
                  </div>
                </Tab>

                <Tab
                  key="myorders"
                  title={
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4" /> My Orders
                    </span>
                  }
                >
                  <div className="mt-4">
                    <Table
                      aria-label="My orders"
                      classNames={{
                        base: "max-h-[400px]",
                        wrapper: "bg-transparent",
                        th: "bg-gray-50 text-gray-600",
                        td: "text-gray-900",
                      }}
                    >
                      <TableHeader>
                        <TableColumn>Side</TableColumn>
                        <TableColumn>Size</TableColumn>
                        <TableColumn>Price</TableColumn>
                        <TableColumn>Status</TableColumn>
                        <TableColumn>Time</TableColumn>
                        <TableColumn>Action</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {MOCK_ORDERS.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell>
                              <Chip
                                size="sm"
                                color={order.side === "buy" ? "success" : "danger"}
                                variant="flat"
                              >
                                {order.side.toUpperCase()}
                              </Chip>
                            </TableCell>
                            <TableCell className="font-mono">{order.size}</TableCell>
                            <TableCell className="font-mono">{order.price}</TableCell>
                            <TableCell>
                              <Chip
                                size="sm"
                                variant="flat"
                                color={order.status === "active" ? "primary" : "default"}
                              >
                                {order.status}
                              </Chip>
                            </TableCell>
                            <TableCell className="text-slate-400">{order.time}</TableCell>
                            <TableCell>
                              {order.status === "active" && (
                                <Button
                                  size="sm"
                                  variant="flat"
                                  color="danger"
                                  isIconOnly
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Tab>

                <Tab
                  key="trades"
                  title={
                    <span className="flex items-center gap-2">
                      <Activity className="w-4 h-4" /> Recent Trades
                    </span>
                  }
                >
                  <div className="mt-4">
                    <Table
                      aria-label="Recent trades"
                      classNames={{
                        wrapper: "bg-transparent",
                        th: "bg-gray-50 text-gray-600",
                        td: "text-gray-900",
                      }}
                    >
                      <TableHeader>
                        <TableColumn>Side</TableColumn>
                        <TableColumn>Size</TableColumn>
                        <TableColumn>Price</TableColumn>
                        <TableColumn>Time</TableColumn>
                      </TableHeader>
                      <TableBody>
                        {MOCK_TRADES.map((trade) => (
                          <TableRow key={trade.id}>
                            <TableCell>
                              <span
                                className={
                                  trade.side === "buy"
                                    ? "text-emerald-600"
                                    : "text-red-600"
                                }
                              >
                                {trade.side.toUpperCase()}
                              </span>
                            </TableCell>
                            <TableCell className="font-mono">{trade.size}</TableCell>
                            <TableCell className="font-mono">{trade.price}</TableCell>
                            <TableCell className="text-gray-500">{trade.time}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </Tab>
              </Tabs>

              {/* Match Button */}
              {connected && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <Button
                    variant="bordered"
                    className="w-full"
                    onClick={handleMatchOrders}
                    isLoading={isSubmitting}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Trigger Order Matching
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl mt-6">
          <CardBody className="p-6">
            <h3 className="text-gray-900 font-bold mb-4">About Dark Pool Trading</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="text-primary font-medium mb-2">Hidden Orders</h4>
                <p className="text-gray-600 text-sm">
                  Your order size and price are encrypted using MPC. No one can see your
                  trading intentions until orders are matched.
                </p>
              </div>
              <div>
                <h4 className="text-primary font-medium mb-2">MEV Protection</h4>
                <p className="text-gray-600 text-sm">
                  Front-running is impossible because order details are never revealed
                  on-chain before execution.
                </p>
              </div>
              <div>
                <h4 className="text-primary font-medium mb-2">Fair Matching</h4>
                <p className="text-gray-600 text-sm">
                  Orders are matched inside the MPC environment at the mid-price,
                  ensuring fair execution for all participants.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Success Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader className="text-gray-900">Order Placed!</ModalHeader>
          <ModalBody>
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-8 h-8 text-white" />
              </div>
              <p className="text-gray-600 mb-4">
                Your order has been encrypted and added to the dark pool.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-center gap-2 text-primary">
                  <Lock className="w-4 h-4" />
                  <span className="text-sm">Order details are hidden from other traders</span>
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              color="primary"
              className="w-full"
              onClick={onClose}
            >
              Done
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}




