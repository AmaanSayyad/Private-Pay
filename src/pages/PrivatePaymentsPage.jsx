import React, { useMemo, useState } from "react";
import { Button, Card, CardBody, Input, Chip, Tabs, Tab } from "@nextui-org/react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import toast from "react-hot-toast";
import * as anchor from "@coral-xyz/anchor";
import { useNavigate } from "react-router-dom";
import { ARCIUM_PROGRAM_ID, PRIVATE_PAY_PROGRAM_ID } from "../lib/arcium/constants.js";
import { useArciumClient, getPrivatePayProgram } from "../lib/arcium/index.js";
import {
  getArciumEnvSafe,
  getClockAccAddressSafe,
  getCompDefAccOffsetSafe,
  getCompDefAccAddressSafe,
  getComputationAccAddressSafe,
  getExecutingPoolAccAddressSafe,
  getFeePoolAccAddressSafe,
  getMempoolAccAddressSafe,
  awaitComputationFinalizationSafe,
} from "../lib/arcium/env.js";
import { Icons } from "../components/shared/Icons.jsx";
import { Shield, Lock, Send, Wallet, Eye, EyeOff, CheckCircle2, Info } from "lucide-react";

// Browser-compatible random bytes generator
const randomBytes = (length) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes);
};

// Generate random BN for Anchor
const randomBN = (byteLength) => {
  const bytes = randomBytes(byteLength);
  return new anchor.BN(bytes);
};

// SIGN_PDA_SEED from arcium-anchor derive_seed!(SignerAccount)
const SIGN_PDA_SEED = "SignerAccount";

export default function PrivatePaymentsPage() {
  const navigate = useNavigate();
  const { publicKey, connected, sendTransaction } = useWallet();
  const arciumClient = useArciumClient();

  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("deposit");
  const [showBalance, setShowBalance] = useState(false);
  const [balance, setBalance] = useState("0.00");

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
      if (!connected) {
        toast.error("Cüzdan bağlayın.");
      } else if (!publicKey) {
        toast.error("Cüzdan adresi alınamadı.");
      } else {
        toast.error("Arcium client oluşturulamadı. Lütfen sayfayı yenileyin.");
      }
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

  const deriveBalancePda = (owner) => {
    const [pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("balance"), owner.toBuffer()],
      PRIVATE_PAY_PROGRAM_ID
    );
    return pda;
  };

  const deriveCompDef = async (ixName) => {
    const offset = getCompDefAccOffsetSafe(ixName);
    return await getCompDefAccAddressSafe(PRIVATE_PAY_PROGRAM_ID, offset);
  };

  const handleInitBalance = async () => {
    if (!ensureReady()) return;
    setLoading(true);
    
    try {
      const compOffset = randomBN(8);
      const nonce = randomBN(16);

      const env = await getArciumEnvSafe();
      const signPda = deriveSignPda();
      const balancePda = deriveBalancePda(publicKey);
      const compDef = await deriveCompDef("init_balance");
      const mempool = await getMempoolAccAddressSafe(env.arciumClusterOffset);
      const executingPool = await getExecutingPoolAccAddressSafe(env.arciumClusterOffset);
      const clusterAccount = arciumClient.clusterAccount;
      const feePool = await getFeePoolAccAddressSafe(env.arciumClusterOffset);
      const clockAcc = await getClockAccAddressSafe(env.arciumClusterOffset);
      const computationAcc = await getComputationAccAddressSafe(env.arciumClusterOffset, compOffset);

      // Log all accounts for debugging
      console.log("\n=== ACCOUNT CHECK ===");
      console.log("Accounts being used:");
      console.log("- payer:", publicKey.toBase58());
      console.log("- sign_pda_account:", signPda.toBase58());
      console.log("- mxe_account:", arciumClient.mxeAccount.toBase58());
      console.log("- mempool_account:", mempool.toBase58());
      console.log("- executing_pool:", executingPool.toBase58());
      console.log("- computation_account:", computationAcc.toBase58());
      console.log("- comp_def_account:", compDef.toBase58());
      console.log("- cluster_account:", clusterAccount.toBase58());
      console.log("- pool_account:", feePool.toBase58());
      console.log("- clock_account:", clockAcc.toBase58());
      console.log("- balance_account:", balancePda.toBase58());
      
      // Check if critical accounts exist BEFORE creating transaction
      console.log("\n=== CHECKING ACCOUNT EXISTENCE ===");
      const accountsToCheck = [
        { name: "MXE", address: arciumClient.mxeAccount, required: true },
        { name: "Cluster", address: clusterAccount, required: true },
        { name: "Mempool", address: mempool, required: true },
        { name: "Executing Pool", address: executingPool, required: true },
        { name: "Fee Pool", address: feePool, required: true },
        { name: "Clock", address: clockAcc, required: true },
        { name: "Comp Def", address: compDef, required: true },
        { name: "Balance PDA", address: balancePda, required: false }, // Will be created
      ];
      
      const missingAccounts = [];
      for (const acc of accountsToCheck) {
        const info = await provider.connection.getAccountInfo(acc.address);
        const exists = info !== null;
        console.log(`${acc.name} (${acc.address.toBase58()}): ${exists ? "✓ EXISTS" : "✗ NOT FOUND"}`);
        if (!exists && acc.required) {
          missingAccounts.push(acc.name);
        }
      }
      
      if (missingAccounts.length > 0) {
        const errorMsg = `Missing required Arcium accounts: ${missingAccounts.join(", ")}. These accounts need to be initialized on the Arcium network first.`;
        console.error(errorMsg);
        toast.error(errorMsg);
        return;
      }
      
      console.log("\n=== ALL REQUIRED ACCOUNTS EXIST, CREATING TRANSACTION ===");
      toast.loading("Init balance başlatılıyor...")

      const tx = await program.methods
        .createBalanceAccount(compOffset, nonce)
        .accounts({
          payer: publicKey,
          sign_pda_account: signPda,
          mxe_account: arciumClient.mxeAccount,
          mempool_account: mempool,
          executing_pool: executingPool,
          computation_account: computationAcc,
          comp_def_account: compDef,
          cluster_account: clusterAccount,
          pool_account: feePool,
          clock_account: clockAcc,
          system_program: anchor.web3.SystemProgram.programId,
          arcium_program: ARCIUM_PROGRAM_ID,
          balance_account: balancePda,
        })
        .transaction();

      // Set fee payer and get recent blockhash
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;

      // Simulate to get detailed error
      console.log("Simulating init balance transaction...");
      const simulation = await provider.connection.simulateTransaction(tx);
      console.log("Simulation result:", simulation);
      
      if (simulation.value.err) {
        console.error("Simulation error:", simulation.value.err);
        console.error("Simulation logs:", simulation.value.logs);
        throw new Error(`Simulation failed: ${simulation.value.logs?.join('\n') || JSON.stringify(simulation.value.err)}`);
      }

      const sig = await sendTransaction(tx, provider.connection);
      await provider.connection.confirmTransaction(sig, "confirmed");
      toast.success(`Tx gönderildi: ${sig}`);

      toast.loading("MPC hesaplaması bekleniyor...");
      await awaitComputationFinalizationSafe(provider.connection, compOffset, PRIVATE_PAY_PROGRAM_ID, "confirmed");
      toast.success("Init balance tamamlandı.");
    } catch (e) {
      console.error("Init balance error:", e);
      console.error("Error details:", e.logs || e.message);
      const errorMsg = e.logs ? e.logs.join('\n') : e.message;
      toast.error(`Init balance hatası: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    if (!ensureReady()) return;
    if (!amount || Number(amount) <= 0) {
      toast.error("Geçerli bir miktar girin.");
      return;
    }
    setLoading(true);
    toast.loading("Deposit gönderiliyor...");
    try {
      const compOffset = randomBN(8);
      const amountBn = new anchor.BN(amount);

      const env = await getArciumEnvSafe();
      const signPda = deriveSignPda();
      const balancePda = deriveBalancePda(publicKey);
      const compDef = await deriveCompDef("deposit");
      const mempool = await getMempoolAccAddressSafe(env.arciumClusterOffset);
      const executingPool = await getExecutingPoolAccAddressSafe(env.arciumClusterOffset);
      const clusterAccount = arciumClient.clusterAccount;
      const feePool = await getFeePoolAccAddressSafe(env.arciumClusterOffset);
      const clockAcc = await getClockAccAddressSafe(env.arciumClusterOffset);
      const computationAcc = await getComputationAccAddressSafe(env.arciumClusterOffset, compOffset);

      const tx = await program.methods
        .depositFunds(compOffset, amountBn)
        .accounts({
          payer: publicKey,
          sign_pda_account: signPda,
          mxe_account: arciumClient.mxeAccount,
          mempool_account: mempool,
          executing_pool: executingPool,
          computation_account: computationAcc,
          comp_def_account: compDef,
          cluster_account: clusterAccount,
          pool_account: feePool,
          clock_account: clockAcc,
          system_program: anchor.web3.SystemProgram.programId,
          arcium_program: ARCIUM_PROGRAM_ID,
          balance_account: balancePda,
          owner: publicKey,
        })
        .transaction();

      // Set fee payer and get recent blockhash
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash;

      const sig = await sendTransaction(tx, provider.connection);
      await provider.connection.confirmTransaction(sig, "confirmed");
      toast.success(`Tx gönderildi: ${sig}`);

      toast.loading("MPC hesaplaması bekleniyor...");
      await awaitComputationFinalizationSafe(provider.connection, compOffset, PRIVATE_PAY_PROGRAM_ID, "confirmed");
      toast.success("Deposit tamamlandı.");
    } catch (e) {
      console.error(e);
      toast.error(e.message || "Deposit hatası");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-start justify-center py-20 px-4 md:px-10 bg-gradient-to-br from-white to-indigo-50/30">
      <div className="relative flex flex-col gap-6 w-full max-w-2xl">
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
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  Private Payments
                  <Chip size="sm" color="primary" variant="flat">
                    Encrypted
                  </Chip>
                </h1>
                <p className="text-gray-500 text-sm">
                  Send encrypted payments with hidden amounts
                </p>
              </div>
            </div>
          </div>
          <WalletMultiButton 
            className="!bg-[#0d08e3] !rounded-xl !h-10 hover:!bg-[#0e0dc6] !text-white" 
            style={{ backgroundColor: '#0d08e3' }}
          />
        </div>

        {!connected ? (
          <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl">
            <CardBody className="flex flex-col items-center justify-center py-12">
              <Wallet className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect Wallet</h3>
              <p className="text-gray-500 text-center mb-6 max-w-sm">
                Connect your Solana wallet to use private payments with encrypted amounts
              </p>
              <WalletMultiButton 
                className="!bg-[#0d08e3] !rounded-xl !px-8 !py-3 hover:!bg-[#0e0dc6] !text-white" 
                style={{ backgroundColor: '#0d08e3' }}
              />
            </CardBody>
          </Card>
        ) : (
          <>
            {/* Balance Card */}
            <Card className="bg-gradient-to-br from-primary/10 to-indigo-50/50 border border-primary/20 shadow-sm rounded-3xl">
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Private Balance</p>
                    <div className="flex items-center gap-2">
                      <h2 className="text-3xl font-bold text-gray-900">
                        {showBalance ? balance : "****"}
                      </h2>
                      <div className="flex items-center gap-1">
                        <img src="/assets/solana_logo.png" alt="SOL" className="w-6 h-6 rounded-full" />
                        <span className="text-lg font-semibold text-gray-600">SOL</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    isIconOnly
                    variant="light"
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-gray-600"
                  >
                    {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Shield className="w-4 h-4 text-primary" />
                  <span>Amounts are encrypted using MPC</span>
                </div>
              </CardBody>
            </Card>

            {/* Main Card */}
            <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl">
              <CardBody className="p-6">
                <Tabs
                  selectedKey={activeTab}
                  onSelectionChange={setActiveTab}
                  className="mb-6"
                  classNames={{
                    tabList: "bg-gray-50",
                    tab: "text-gray-600",
                    cursor: "bg-primary",
                  }}
                >
                  <Tab
                    key="deposit"
                    title={
                      <span className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Deposit
                      </span>
                    }
                  >
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">
                          Amount
                        </label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          variant="bordered"
                          classNames={{
                            inputWrapper: "h-14",
                            input: "text-lg font-semibold"
                          }}
                          endContent={
                            <div className="flex items-center gap-1">
                              <img src="/assets/solana_logo.png" alt="SOL" className="w-5 h-5 rounded-full" />
                              <span className="text-gray-600 text-sm font-medium">SOL</span>
                            </div>
                          }
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Amount will be encrypted before deposit
                        </p>
                      </div>

                      <Card className="bg-primary/10 border border-primary/20">
                        <CardBody className="p-4">
                          <div className="flex items-start gap-3">
                            <Lock className="w-5 h-5 text-primary mt-0.5" />
                            <div>
                              <p className="text-primary text-sm font-medium mb-1">
                                Encrypted Deposit
                              </p>
                              <p className="text-gray-600 text-xs">
                                Your deposit amount is encrypted using Arcium MPC. The actual amount is hidden from the blockchain until you withdraw.
                              </p>
                            </div>
                          </div>
                        </CardBody>
                      </Card>

                      <div className="flex gap-3">
                        <Button
                          color="default"
                          variant="bordered"
                          className="flex-1"
                          onClick={handleInitBalance}
                          isLoading={loading}
                          isDisabled={!connected}
                        >
                          Init Account
                        </Button>
                        <Button
                          color="primary"
                          className="flex-1 font-semibold h-12"
                          onClick={handleDeposit}
                          isLoading={loading}
                          isDisabled={!connected || !amount || Number(amount) <= 0}
                        >
                          Deposit Privately
                        </Button>
                      </div>
                    </div>
                  </Tab>

                  <Tab
                    key="send"
                    title={
                      <span className="flex items-center gap-2">
                        <Send className="w-4 h-4" /> Send Payment
                      </span>
                    }
                  >
                    <div className="space-y-4 mt-4">
                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">
                          Recipient Address
                        </label>
                        <Input
                          placeholder="Enter Solana address..."
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          variant="bordered"
                          classNames={{
                            inputWrapper: "h-12"
                          }}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-semibold text-gray-700 mb-2 block">
                          Amount
                        </label>
                        <Input
                          type="number"
                          placeholder="0.00"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          variant="bordered"
                          classNames={{
                            inputWrapper: "h-14",
                            input: "text-lg font-semibold"
                          }}
                          endContent={
                            <div className="flex items-center gap-1">
                              <img src="/assets/solana_logo.png" alt="SOL" className="w-5 h-5 rounded-full" />
                              <span className="text-gray-600 text-sm font-medium">SOL</span>
                            </div>
                          }
                        />
                      </div>

                      <Card className="bg-emerald-50 border border-emerald-200">
                        <CardBody className="p-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5" />
                            <div>
                              <p className="text-emerald-900 text-sm font-medium mb-1">
                                Private Transfer
                              </p>
                              <p className="text-emerald-700 text-xs">
                                The recipient will receive the payment, but the amount remains encrypted and hidden from public view.
                              </p>
                            </div>
                          </div>
                        </CardBody>
                      </Card>

                      <Button
                        color="primary"
                        className="w-full font-semibold h-12"
                        onClick={() => toast.info("Send payment functionality coming soon")}
                        isDisabled={!recipient || !amount || Number(amount) <= 0}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send Private Payment
                      </Button>
                    </div>
                  </Tab>
                </Tabs>

                {/* Info Card */}
                <Card className="bg-gray-50 border border-gray-200 mt-4">
                  <CardBody className="p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-gray-500 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-gray-900 text-sm font-medium mb-1">
                          How Private Payments Work
                        </p>
                        <p className="text-gray-600 text-xs">
                          All amounts are encrypted using Arcium's Multi-Party Computation (MPC). 
                          Your balance and transaction amounts are hidden from the blockchain, 
                          providing complete privacy while maintaining full functionality.
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </CardBody>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
