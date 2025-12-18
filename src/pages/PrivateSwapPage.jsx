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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@nextui-org/react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useArcium } from "../providers/SolanaProvider";
import { Icons } from "../components/shared/Icons";
import {
  ArrowDownUp,
  Shield,
  Zap,
  AlertTriangle,
  Check,
  Lock,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Info,
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

// Available tokens for swap
const TOKENS = [
  { id: "sol", name: "SOL", symbol: "SOL", icon: "/assets/solana_logo.png", decimals: 9 },
  { id: "usdc", name: "USD Coin", symbol: "USDC", icon: "/assets/usdc.png", decimals: 6 },
  { id: "usdt", name: "Tether", symbol: "USDT", icon: "/assets/usdt_logo.png", decimals: 6 },
];

const SIGN_PDA_SEED = "SignerAccount";

export default function PrivateSwapPage() {
  const navigate = useNavigate();
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const { isInitialized } = useArcium();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const arciumClient = useArciumClient();

  // Swap state
  const [inputToken, setInputToken] = useState("sol");
  const [outputToken, setOutputToken] = useState("usdc");
  const [inputAmount, setInputAmount] = useState("");
  const [slippage, setSlippage] = useState("0.5");
  const [isSwapping, setIsSwapping] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [swapStatus, setSwapStatus] = useState(null);

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

  // Calculated values
  const estimatedOutput = useMemo(() => {
    if (!inputAmount || isNaN(parseFloat(inputAmount))) return "0.00";
    // Mock exchange rate calculation
    const rates = {
      "sol-usdc": 180,
      "usdc-sol": 0.0055,
      "sol-usdt": 180,
      "usdt-sol": 0.0055,
      "usdc-usdt": 1,
      "usdt-usdc": 1,
    };
    const rate = rates[`${inputToken}-${outputToken}`] || 1;
    return (parseFloat(inputAmount) * rate * 0.997).toFixed(4); // 0.3% fee
  }, [inputAmount, inputToken, outputToken]);

  const priceImpact = useMemo(() => {
    if (!inputAmount || parseFloat(inputAmount) < 100) return "< 0.01%";
    if (parseFloat(inputAmount) < 1000) return "0.05%";
    return "0.1%";
  }, [inputAmount]);

  // Swap tokens
  const handleFlipTokens = useCallback(() => {
    setInputToken(outputToken);
    setOutputToken(inputToken);
    setInputAmount("");
  }, [inputToken, outputToken]);

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
    
    if (!PRIVATE_PAY_PROGRAM_ID) {
      toast.error("Private Pay Program ID yapılandırılmamış.");
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

  const deriveSwapPoolPda = (tokenA, tokenB) => {
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool"),
        new anchor.BN(tokenA).toArrayLike(Buffer, "le", 8),
        new anchor.BN(tokenB).toArrayLike(Buffer, "le", 8),
      ],
      PRIVATE_PAY_PROGRAM_ID
    );
    return pda;
  };

  const deriveCompDef = async (ixName) => {
    const offset = getCompDefAccOffsetSafe(ixName);
    return await getCompDefAccAddressSafe(PRIVATE_PAY_PROGRAM_ID, offset);
  };

  // Execute swap
  const handleSwap = useCallback(async () => {
    if (!ensureReady() || !inputAmount || Number(inputAmount) <= 0) {
      toast.error("Geçerli bir miktar girin.");
      return;
    }

    setIsSwapping(true);
    setSwapStatus("encrypting");

    try {
      // Step 1: Get MXE public key and encrypt swap data
      const arciumLib = await loadArciumClient();
      if (!arciumLib) {
        throw new Error("@arcium-hq/client kütüphanesi yüklenmemiş. Lütfen npm install @arcium-hq/client yapın.");
      }

      const mxePublicKey = await arciumLib.getMXEPublicKeyWithRetry(
        provider,
        PRIVATE_PAY_PROGRAM_ID
      );

      const privateKey = arciumLib.x25519.utils.randomSecretKey();
      const encryptionPublicKey = arciumLib.x25519.getPublicKey(privateKey);
      const sharedSecret = arciumLib.x25519.getSharedSecret(privateKey, mxePublicKey);
      const cipher = new arciumLib.RescueCipher(sharedSecret);

      // Convert input amount to lamports/token units
      const inputAmountBn = new anchor.BN(parseFloat(inputAmount) * 1e9); // Assuming 9 decimals for SOL
      const minOutputBn = inputAmountBn.mul(new anchor.BN(100 - parseFloat(slippage) * 10)).div(new anchor.BN(100));

      // Encrypt swap amounts
      const plaintext = [BigInt(inputAmountBn.toString()), BigInt(minOutputBn.toString())];
      const nonce = randomBytes(16);
      const ciphertexts = cipher.encrypt(plaintext, nonce);

      setSwapStatus("submitting");

      // Step 2: Submit to Arcium MPC network
      const compOffset = new anchor.BN(randomBytes(8), "hex");
      const nonceU128 = new anchor.BN(nonce, "le");

      const env = await getArciumEnvSafe();
      const signPda = deriveSignPda();
      const tokenA = inputToken === "sol" ? 1 : 2;
      const tokenB = outputToken === "usdc" ? 2 : 1;
      const swapPoolPda = deriveSwapPoolPda(tokenA, tokenB);
      const compDef = await deriveCompDef("execute_swap");
      const mempool = await getMempoolAccAddressSafe(env.arciumClusterOffset);
      const executingPool = await getExecutingPoolAccAddressSafe(env.arciumClusterOffset);
      const clusterAccount = arciumClient.clusterAccount;
      const feePool = await getFeePoolAccAddressSafe(env.arciumClusterOffset);
      const clockAcc = await getClockAccAddressSafe(env.arciumClusterOffset);
      const computationAcc = await getComputationAccAddressSafe(env.arciumClusterOffset, compOffset);

      const tx = await program.methods
        .executeSwap(
          compOffset,
          Array.from(ciphertexts[0]),
          Array.from(ciphertexts[1]),
          Array.from(encryptionPublicKey),
          nonceU128
        )
        .accounts({
          payer: publicKey, // Wallet public key
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
          swapPoolAccount: swapPoolPda,
        })
        .transaction();

      const sig = await sendTransaction(tx, provider.connection);
      await provider.connection.confirmTransaction(sig, "confirmed");
      toast.success(`Swap transaction gönderildi: ${sig}`);

      setSwapStatus("computing");

      // Step 3: Wait for MPC computation
      toast.loading("MPC hesaplaması bekleniyor...");
      await awaitComputationFinalizationSafe(provider.connection, compOffset, PRIVATE_PAY_PROGRAM_ID, "confirmed");
      
      setSwapStatus("success");
      toast.success("Private swap başarıyla tamamlandı!");
      onOpen(); // Show success modal

    } catch (error) {
      console.error("Swap failed:", error);
      setSwapStatus("error");
      toast.error(error.message || "Swap başarısız. Lütfen tekrar deneyin.");
    } finally {
      setIsSwapping(false);
    }
  }, [connected, inputAmount, inputToken, outputToken, slippage, arciumClient, provider, program, onOpen, sendTransaction]);

  const statusMessages = {
    encrypting: "Encrypting swap data...",
    submitting: "Submitting to Arcium network...",
    computing: "MPC nodes computing...",
    finalizing: "Finalizing transaction...",
    success: "Swap complete!",
    error: "Swap failed",
  };

  return (
    <div className="flex min-h-screen w-full items-start justify-center py-20 px-4 md:px-10 bg-gradient-to-br from-white to-indigo-50/30">
      <div className="relative flex flex-col gap-4 w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
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
                <h1 className="text-2xl font-bold text-gray-900">Private Swap</h1>
                <p className="text-gray-500 text-sm">MEV-protected trading</p>
              </div>
            </div>
          </div>
          <Button
            isIconOnly
            variant="light"
            className="text-gray-600"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>

        {/* Security Notice */}
        <Card className="bg-primary/10 border border-primary/20 mb-4">
          <CardBody className="flex flex-row items-center gap-3 py-3">
            <Shield className="w-5 h-5 text-primary" />
            <div className="flex-1">
              <p className="text-gray-900 text-sm font-medium">
                Your swap amounts are encrypted
              </p>
              <p className="text-gray-600 text-xs">
                Protected from MEV bots and front-runners
              </p>
            </div>
            <Lock className="w-4 h-4 text-primary" />
          </CardBody>
        </Card>

        {/* Main Swap Card */}
        <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl">
          <CardBody className="p-6">
            {/* Input Token */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">You pay</span>
                <span className="text-gray-500 text-xs">
                  Balance: <span className="text-gray-900">****</span>
                </span>
              </div>
              <div className="flex gap-3">
                <div className="relative w-32">
                  <Select
                    selectedKeys={[inputToken]}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0];
                      if (selected) setInputToken(selected);
                    }}
                    className="w-full"
                    variant="bordered"
                    startContent={
                      <img 
                        src={TOKENS.find(t => t.id === inputToken)?.icon} 
                        alt={TOKENS.find(t => t.id === inputToken)?.name} 
                        className="w-5 h-5 rounded-full flex-shrink-0" 
                      />
                    }
                    classNames={{
                      trigger: "h-14",
                      value: "flex items-center"
                    }}
                  >
                  {TOKENS.map((token) => (
                    <SelectItem 
                      key={token.id} 
                      value={token.id}
                      textValue={token.symbol}
                      startContent={<img src={token.icon} alt={token.name} className="w-5 h-5 rounded-full" />}
                    >
                      {token.symbol}
                    </SelectItem>
                  ))}
                  </Select>
                </div>
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={inputAmount}
                    onChange={(e) => setInputAmount(e.target.value)}
                    className="flex-1"
                    variant="bordered"
                    classNames={{
                      input: "text-gray-900 text-xl text-right pr-12",
                      inputWrapper: "h-14 flex items-center"
                    }}
                  />
                  <div className="absolute right-3 flex items-center" style={{ top: '50%', transform: 'translateY(-50%)' }}>
                    <img 
                      src={TOKENS.find(t => t.id === inputToken)?.icon} 
                      alt={TOKENS.find(t => t.id === inputToken)?.name} 
                      className="w-6 h-6 rounded-full flex-shrink-0" 
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Swap Direction Button */}
            <div className="flex justify-center my-4">
              <Button
                isIconOnly
                variant="light"
                className="bg-gray-100 text-gray-600 hover:bg-gray-200"
                onClick={handleFlipTokens}
              >
                <ArrowDownUp className="w-5 h-5" />
              </Button>
            </div>

            {/* Output Token */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600 text-sm">You receive</span>
                <span className="text-gray-500 text-xs flex items-center gap-1">
                  <EyeOff className="w-3 h-3" /> Hidden until execution
                </span>
              </div>
              <div className="flex gap-3">
                <div className="relative w-32">
                  <Select
                    selectedKeys={[outputToken]}
                    onSelectionChange={(keys) => {
                      const selected = Array.from(keys)[0];
                      if (selected) setOutputToken(selected);
                    }}
                    className="w-full"
                    variant="bordered"
                    startContent={
                      <img 
                        src={TOKENS.find(t => t.id === outputToken)?.icon} 
                        alt={TOKENS.find(t => t.id === outputToken)?.name} 
                        className="w-5 h-5 rounded-full flex-shrink-0" 
                      />
                    }
                    classNames={{
                      trigger: "h-14",
                      value: "flex items-center"
                    }}
                  >
                  {TOKENS.filter((t) => t.id !== inputToken).map((token) => (
                    <SelectItem 
                      key={token.id} 
                      value={token.id}
                      textValue={token.symbol}
                      startContent={<img src={token.icon} alt={token.name} className="w-5 h-5 rounded-full" />}
                    >
                      {token.symbol}
                    </SelectItem>
                  ))}
                  </Select>
                </div>
                <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 px-4 py-3 text-right flex items-center justify-end gap-2 min-h-[56px]">
                  <span className="text-gray-900 text-xl font-mono">
                    ~{estimatedOutput}
                  </span>
                  <img 
                    src={TOKENS.find(t => t.id === outputToken)?.icon} 
                    alt={TOKENS.find(t => t.id === outputToken)?.name} 
                    className="w-6 h-6 rounded-full opacity-50 flex-shrink-0 self-center" 
                  />
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            {showAdvanced && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-gray-600 text-sm">Slippage Tolerance</span>
                  <div className="flex gap-2">
                    {["0.1", "0.5", "1.0"].map((val) => (
                      <Button
                        key={val}
                        size="sm"
                        variant={slippage === val ? "solid" : "flat"}
                        color={slippage === val ? "primary" : "default"}
                        onClick={() => setSlippage(val)}
                      >
                        {val}%
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Swap Info */}
            <div className="space-y-2 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Rate</span>
                <span className="text-gray-900">
                  1 {inputToken.toUpperCase()} ≈{" "}
                  {inputToken === "sol" ? "180" : "0.0055"}{" "}
                  {outputToken.toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Price Impact</span>
                <span className="text-emerald-600">{priceImpact}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Network Fee</span>
                <span className="text-gray-900">~0.00025 SOL</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Protocol Fee</span>
                <span className="text-gray-900">0.3%</span>
              </div>
            </div>

            {/* Swap Button */}
            {!connected ? (
              <WalletMultiButton 
                className="!w-full !bg-[#0d08e3] !rounded-xl !h-12 !justify-center hover:!bg-[#0e0dc6] !text-white" 
                style={{ backgroundColor: '#0d08e3' }}
              />
            ) : (
              <Button
                color="primary"
                className="w-full font-semibold h-12"
                onClick={handleSwap}
                isDisabled={!inputAmount || isSwapping || inputToken === outputToken}
                isLoading={isSwapping}
              >
                {isSwapping ? (
                  <span className="flex items-center gap-2">
                    <Spinner size="sm" color="white" />
                    {statusMessages[swapStatus]}
                  </span>
                ) : (
                  "Swap Privately"
                )}
              </Button>
            )}
          </CardBody>
        </Card>

        {/* How It Works */}
        <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl mt-4">
          <CardBody className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary" />
              <span className="text-gray-900 font-medium text-sm">
                How Private Swap Works
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              {[
                { icon: <Lock className="w-4 h-4" />, text: "Encrypt" },
                { icon: <Zap className="w-4 h-4" />, text: "Submit" },
                { icon: <RefreshCw className="w-4 h-4" />, text: "Compute" },
                { icon: <Check className="w-4 h-4" />, text: "Settle" },
              ].map((step, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {step.icon}
                  </div>
                  <span className="text-gray-600">{step.text}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Success Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader className="text-gray-900">Swap Successful!</ModalHeader>
          <ModalBody>
            <div className="text-center py-4">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-8 h-8 text-white" />
              </div>
              <p className="text-gray-600 mb-4">
                Your private swap has been executed successfully.
              </p>
              <div className="bg-gray-50 rounded-xl p-4 text-left border border-gray-200">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Sent</span>
                  <span className="text-gray-900">
                    {inputAmount} {inputToken.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Received</span>
                  <span className="text-emerald-600">
                    ~{estimatedOutput} {outputToken.toUpperCase()}
                  </span>
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




