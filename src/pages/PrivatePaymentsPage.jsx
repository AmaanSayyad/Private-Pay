import React, { useMemo, useState } from "react";
import { Button, Card, CardBody, Input } from "@nextui-org/react";
import { useWallet } from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";
import * as anchor from "@coral-xyz/anchor";
import { useNavigate } from "react-router-dom";
import { ARCIUM_PROGRAM_ID, PRIVATE_PAY_PROGRAM_ID } from "@/lib/arcium/constants.js";
import { useArciumClient, getPrivatePayProgram } from "@/lib/arcium/index.js";
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
} from "@/lib/arcium/env.js";
import { Icons } from "../components/shared/Icons.jsx";

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
  const [loading, setLoading] = useState(false);

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
      <div className="relative flex flex-col gap-4 w-full max-w-md">
        <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl p-6">
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center justify-between w-full mb-2">
              <h1 className="font-bold text-xl text-gray-900">Private Payments</h1>
              <Button
                onClick={() => navigate("/arcium")}
                className="bg-white border border-gray-200 rounded-full px-4 h-10 flex items-center gap-2"
                variant="flat"
              >
                <Icons.back className="size-4" />
                <span className="text-sm">Back</span>
              </Button>
            </div>

            {!connected ? (
              <div className="flex flex-col items-center justify-center py-8">
                <p className="text-gray-500 text-center mb-4">
                  Connect your Solana wallet to use private payments
                </p>
              </div>
            ) : (
              <>
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg space-y-1">
                  <div className="font-medium mb-2">Debug Info:</div>
                  <div>Connected: {connected ? "✓" : "✗"}</div>
                  <div>Public Key: {publicKey ? (publicKey.toBase58().slice(0, 8) + "...") : "N/A"}</div>
                  <div>Arcium Client: {arciumClient ? "✓" : "✗"}</div>
                  <div>Program: {program ? "✓" : "✗"}</div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <div className="font-medium mb-1">Program IDs:</div>
                    <div>Arcium: {ARCIUM_PROGRAM_ID?.toBase58?.() ?? "N/A"}</div>
                    <div>Private Pay: {PRIVATE_PAY_PROGRAM_ID?.toBase58?.() ?? "N/A"}</div>
                  </div>
                </div>

                <Button 
                  color="primary" 
                  onClick={handleInitBalance} 
                  isLoading={loading} 
                  isDisabled={!connected}
                  className="w-full"
                >
                  Init Balance Account
                </Button>

                <Input
                  label="Deposit Amount (lamports)"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  variant="bordered"
                />
                <Button 
                  color="primary" 
                  onClick={handleDeposit} 
                  isLoading={loading} 
                  isDisabled={!connected}
                  className="w-full"
                >
                  Deposit
                </Button>
              </>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
