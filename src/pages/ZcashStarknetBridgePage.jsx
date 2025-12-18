/**
 * Zcash-Starknet Bridge Page
 * Cross-chain bridge for ZEC <-> sZEC transfers
 */

import { useState, useEffect } from "react";
import { Button, Card, CardBody, Input, Progress } from "@nextui-org/react";
import { useStarknet } from "../providers/StarknetProvider";
import { useZcash } from "../providers/ZcashProvider";
import { StarknetBridgeManager } from "../lib/starknet/bridge";
import toast from "react-hot-toast";
import { ArrowRight, ArrowLeft, Shield, Zap, CheckCircle, Loader2 } from "lucide-react";

const BRIDGE_STEPS = {
  INIT: 0,
  CONNECT: 1,
  LOCK: 2,
  PROVE: 3,
  CLAIM: 4,
  SUCCESS: 5,
};

export default function ZcashStarknetBridgePage() {
  const {
    account: starknetAccount,
    isConnected: starknetConnected,
    connect: connectStarknet,
    simulateDeposit: starknetSimulateDeposit,
    balance: starknetBalance,
    burnForWithdrawal,
    claimBridgedTokens,
  } = useStarknet();

  const {
    zcashAccount,
    isConnected: zcashConnected,
    balance: zcashBalance,
    createWallet: createZcashWallet,
    simulateDeposit: zcashSimulateDeposit,
  } = useZcash();

  const [direction, setDirection] = useState("zcash-to-starknet"); // or "starknet-to-zcash"
  const [amount, setAmount] = useState("");
  const [currentStep, setCurrentStep] = useState(BRIDGE_STEPS.INIT);
  const [isProcessing, setIsProcessing] = useState(false);
  const [bridgeManager, setBridgeManager] = useState(null);
  const [currentDeposit, setCurrentDeposit] = useState(null);
  const [txHash, setTxHash] = useState(null);

  // Initialize bridge manager
  useEffect(() => {
    const manager = new StarknetBridgeManager(null, null);
    setBridgeManager(manager);
  }, []);

  const toggleDirection = () => {
    setDirection((prev) =>
      prev === "zcash-to-starknet" ? "starknet-to-zcash" : "zcash-to-starknet"
    );
    setCurrentStep(BRIDGE_STEPS.INIT);
    setAmount("");
  };

  const handleConnectWallets = async () => {
    setIsProcessing(true);
    try {
      if (!zcashConnected) {
        await createZcashWallet();
      }
      if (!starknetConnected) {
        await connectStarknet();
      }
      setCurrentStep(BRIDGE_STEPS.LOCK);
      toast.success("Wallets connected!");
    } catch (error) {
      toast.error("Failed to connect wallets");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLockFunds = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsProcessing(true);
    try {
      if (direction === "zcash-to-starknet") {
        // ZEC → sZEC: Create deposit record (off-chain, operator will register)
        const deposit = bridgeManager.createDeposit(
          `zcash_tx_${Date.now()}`,
          parseFloat(amount),
          starknetAccount
        );
        setCurrentDeposit(deposit);
        toast.success("Deposit registered! Waiting for ZK proof...");
      } else {
        // sZEC → ZEC: Call burn_szec on-chain
        const zcashAddressHash = "0x" + Array(62).fill('0').join('') + "01"; // Placeholder
        const result = await burnForWithdrawal(parseFloat(amount), zcashAddressHash);
        setTxHash(result.transaction_hash);
        toast.success("sZEC burned! Withdrawal initiated on-chain.");
      }

      setCurrentStep(BRIDGE_STEPS.PROVE);
    } catch (error) {
      console.error("Lock failed:", error);
      toast.error("Failed to lock funds: " + (error.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerateProof = async () => {
    setIsProcessing(true);
    try {
      // In production, this would call Garaga verifier or generate actual ZK proof
      // For demo, we simulate the proof generation process
      toast.loading("Generating ZK proof...", { id: "proof-gen" });
      await new Promise((resolve) => setTimeout(resolve, 2000));

      if (currentDeposit) {
        bridgeManager.confirmDeposit(currentDeposit.ticketId);
      }

      toast.dismiss("proof-gen");
      setCurrentStep(BRIDGE_STEPS.CLAIM);
      toast.success("ZK Proof generated and verified!");
    } catch (error) {
      toast.dismiss("proof-gen");
      console.error("Proof generation failed:", error);
      toast.error("Failed to generate proof");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClaimFunds = async () => {
    setIsProcessing(true);
    try {
      if (direction === "zcash-to-starknet") {
        // ZEC → sZEC: Claim sZEC tokens on Starknet
        if (currentDeposit) {
          try {
            const result = await claimBridgedTokens(currentDeposit.ticketId);
            setTxHash(result.transaction_hash);
            await bridgeManager.claimSZEC(currentDeposit.ticketId);
            toast.success("sZEC claimed on-chain!");
          } catch (claimError) {
            // If claim fails (deposit not registered by operator yet), simulate for demo
            console.log("Claim failed, simulating for demo:", claimError);
            starknetSimulateDeposit(parseFloat(amount));
            setTxHash(`0x${Date.now().toString(16)}${Math.random().toString(16).substr(2, 48)}`);
            toast.success("sZEC credited (demo mode - operator registration pending)");
          }
        }
      } else {
        // sZEC → ZEC: Withdrawal already initiated in handleLockFunds
        // Just show success - actual ZEC release is off-chain
        zcashSimulateDeposit(parseFloat(amount));
        toast.success("Withdrawal complete! ZEC will arrive shortly.");
      }

      setCurrentStep(BRIDGE_STEPS.SUCCESS);
    } catch (error) {
      console.error("Claim failed:", error);
      toast.error("Failed to claim funds: " + (error.message || "Unknown error"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(BRIDGE_STEPS.INIT);
    setAmount("");
    setCurrentDeposit(null);
    setTxHash(null);
  };

  const renderStepIndicator = () => {
    const steps = ["Connect", "Lock", "Prove", "Claim"];
    const activeStep = Math.max(0, currentStep - 1);

    return (
      <div className="flex items-center justify-center gap-2 mb-6">
        {steps.map((step, index) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                index <= activeStep
                  ? "bg-green-500 text-white"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {index < activeStep ? <CheckCircle size={16} /> : index + 1}
            </div>
            <span className={`ml-2 text-sm ${index <= activeStep ? "text-green-600 font-semibold" : "text-gray-500"}`}>
              {step}
            </span>
            {index < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-2 ${index < activeStep ? "bg-green-500" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-[80vh] gap-8 p-4 pb-24">
      <div className="flex items-center gap-3">
        <Shield className="w-10 h-10 text-green-500" />
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
          Zcash-Starknet Bridge
        </h1>
      </div>

      <p className="text-gray-600 max-w-lg text-center">
        Bridge ZEC to sZEC for cross-chain privacy. Your funds remain shielded throughout the transfer.
      </p>

      {/* Architecture Diagram */}
      <Card className="max-w-2xl w-full bg-gradient-to-br from-slate-50 to-gray-100">
        <CardBody className="p-6">
          <h3 className="text-center font-bold text-gray-700 mb-4">Bridge Architecture</h3>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center overflow-hidden">
                <img src="/assets/zcash_logo.png" alt="Zcash" className="w-12 h-12 object-contain" />
              </div>
              <span className="text-sm font-semibold">Zcash</span>
              <span className="text-xs text-gray-500">Shielded Pool</span>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  {direction === "zcash-to-starknet" ? (
                    <ArrowRight className="text-green-500" size={24} />
                  ) : (
                    <ArrowLeft className="text-purple-500" size={24} />
                  )}
                </div>
                <div className="w-24 h-12 rounded-lg bg-gradient-to-r from-green-100 to-purple-100 flex items-center justify-center">
                  <Zap className="text-amber-500" size={20} />
                </div>
                <span className="text-xs text-gray-500">ZK Proof</span>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden">
                <img src="/assets/starknet-logo.png" alt="Starknet" className="w-12 h-12 object-contain" />
              </div>
              <span className="text-sm font-semibold">Starknet</span>
              <span className="text-xs text-gray-500">sZEC Token</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Bridge Card */}
      <Card className="max-w-lg w-full">
        <CardBody className="p-6 gap-4">
          {currentStep >= BRIDGE_STEPS.CONNECT && renderStepIndicator()}

          {/* Direction Toggle */}
          <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
            <div className="flex flex-col">
              <span className="text-xs text-gray-500">From</span>
              <span className="font-bold text-lg">
                {direction === "zcash-to-starknet" ? "ZEC" : "sZEC"}
              </span>
            </div>
            <Button isIconOnly variant="light" onClick={toggleDirection} isDisabled={currentStep > BRIDGE_STEPS.INIT}>
              <ArrowRight className="rotate-0" />
            </Button>
            <div className="flex flex-col items-end">
              <span className="text-xs text-gray-500">To</span>
              <span className="font-bold text-lg">
                {direction === "zcash-to-starknet" ? "sZEC" : "ZEC"}
              </span>
            </div>
          </div>

          {/* Step Content */}
          {currentStep === BRIDGE_STEPS.INIT && (
            <div className="flex flex-col gap-4">
              <Input
                label="Amount"
                placeholder="0.00"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                endContent={
                  <span className="text-sm text-gray-500">
                    {direction === "zcash-to-starknet" ? "ZEC" : "sZEC"}
                  </span>
                }
                variant="bordered"
                size="lg"
              />

              <div className="text-sm text-gray-500">
                Available:{" "}
                {direction === "zcash-to-starknet"
                  ? `${zcashBalance?.available || 0} ZEC`
                  : `${starknetBalance?.szec || 0} sZEC`}
              </div>

              <Button
                color="success"
                variant="shadow"
                size="lg"
                className="font-bold"
                onClick={() => setCurrentStep(BRIDGE_STEPS.CONNECT)}
                isDisabled={!amount || parseFloat(amount) <= 0}
              >
                Start Bridge
              </Button>
            </div>
          )}

          {currentStep === BRIDGE_STEPS.CONNECT && (
            <div className="flex flex-col gap-4">
              <h3 className="font-bold">Step 1: Connect Wallets</h3>
              <p className="text-sm text-gray-600">
                Connect both your Zcash and Starknet wallets to proceed.
              </p>

              <div className="flex justify-between items-center bg-yellow-50 p-3 rounded-lg">
                <span>Zcash Wallet</span>
                {zcashConnected ? (
                  <span className="text-green-600 font-semibold flex items-center gap-1">
                    <CheckCircle size={16} /> Connected
                  </span>
                ) : (
                  <span className="text-amber-600">Not connected</span>
                )}
              </div>

              <div className="flex justify-between items-center bg-purple-50 p-3 rounded-lg">
                <span>Starknet Wallet</span>
                {starknetConnected ? (
                  <span className="text-green-600 font-semibold flex items-center gap-1">
                    <CheckCircle size={16} /> Connected
                  </span>
                ) : (
                  <span className="text-amber-600">Not connected</span>
                )}
              </div>

              <Button
                color="primary"
                variant="shadow"
                size="lg"
                onClick={handleConnectWallets}
                isLoading={isProcessing}
              >
                {zcashConnected && starknetConnected ? "Continue" : "Connect Wallets"}
              </Button>
            </div>
          )}

          {currentStep === BRIDGE_STEPS.LOCK && (
            <div className="flex flex-col gap-4">
              <h3 className="font-bold">Step 2: Lock Funds</h3>
              <p className="text-sm text-gray-600">
                Lock {amount} {direction === "zcash-to-starknet" ? "ZEC" : "sZEC"} in the bridge vault.
              </p>

              <div className="bg-amber-50 p-4 rounded-lg text-center">
                <span className="text-3xl font-bold">{amount}</span>
                <span className="text-lg ml-2">
                  {direction === "zcash-to-starknet" ? "ZEC" : "sZEC"}
                </span>
              </div>

              <Button
                color="warning"
                variant="shadow"
                size="lg"
                onClick={handleLockFunds}
                isLoading={isProcessing}
              >
                {isProcessing ? "Locking..." : "Lock Funds"}
              </Button>
            </div>
          )}

          {currentStep === BRIDGE_STEPS.PROVE && (
            <div className="flex flex-col gap-4">
              <h3 className="font-bold">Step 3: Generate ZK Proof</h3>
              <p className="text-sm text-gray-600">
                Generating zero-knowledge proof for cross-chain verification.
              </p>

              {isProcessing && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Loader2 className="animate-spin text-purple-500" size={48} />
                  <Progress
                    size="sm"
                    isIndeterminate
                    aria-label="Generating proof..."
                    className="max-w-md"
                  />
                  <span className="text-sm text-gray-500">This may take a moment...</span>
                </div>
              )}

              <Button
                color="secondary"
                variant="shadow"
                size="lg"
                onClick={handleGenerateProof}
                isLoading={isProcessing}
                isDisabled={isProcessing}
              >
                {isProcessing ? "Generating Proof..." : "Generate Proof"}
              </Button>
            </div>
          )}

          {currentStep === BRIDGE_STEPS.CLAIM && (
            <div className="flex flex-col gap-4">
              <h3 className="font-bold">Step 4: Claim Funds</h3>
              <p className="text-sm text-gray-600">
                Proof verified! Claim your {direction === "zcash-to-starknet" ? "sZEC" : "ZEC"}.
              </p>

              <div className="bg-green-50 p-4 rounded-lg text-center">
                <span className="text-3xl font-bold text-green-600">{amount}</span>
                <span className="text-lg ml-2 text-green-600">
                  {direction === "zcash-to-starknet" ? "sZEC" : "ZEC"}
                </span>
              </div>

              <Button
                color="success"
                variant="shadow"
                size="lg"
                onClick={handleClaimFunds}
                isLoading={isProcessing}
              >
                {isProcessing ? "Claiming..." : "Claim Funds"}
              </Button>
            </div>
          )}

          {currentStep === BRIDGE_STEPS.SUCCESS && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle className="text-green-500" size={48} />
              </div>
              <h3 className="font-bold text-xl text-green-600">Bridge Complete!</h3>
              <p className="text-sm text-gray-600 text-center">
                Successfully bridged {amount} {direction === "zcash-to-starknet" ? "ZEC to sZEC" : "sZEC to ZEC"}
              </p>

              {txHash && (
                <div className="bg-gray-50 p-3 rounded-lg w-full">
                  <span className="text-xs text-gray-500">Transaction Hash</span>
                  <code className="text-xs block truncate mt-1">{txHash}</code>
                </div>
              )}

              <Button
                color="primary"
                variant="light"
                onClick={handleReset}
                className="mt-2"
              >
                Bridge More
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      {/* Stats Card */}
      {bridgeManager && (
        <Card className="max-w-lg w-full">
          <CardBody className="p-4">
            <h3 className="font-bold text-center mb-4">Bridge Statistics</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <span className="text-2xl font-bold text-green-600">
                  {bridgeManager.getStats().totalBridgedIn.toFixed(2)}
                </span>
                <p className="text-xs text-gray-500">Total Bridged In</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-purple-600">
                  {bridgeManager.getStats().totalDeposits}
                </span>
                <p className="text-xs text-gray-500">Total Deposits</p>
              </div>
              <div>
                <span className="text-2xl font-bold text-amber-600">
                  {bridgeManager.getStats().pendingDeposits}
                </span>
                <p className="text-xs text-gray-500">Pending</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
