import {useEffect, useMemo, useState} from "react";
import {Button, Card, CardBody, Input, Spinner, Chip, Select, SelectItem, Progress} from "@nextui-org/react";
import toast from "react-hot-toast";
import {Shield, CheckCircle2, Clock, Zap, Download, ArrowRight, AlertTriangle, Info, Lock, Unlock} from "lucide-react";

import {ethers} from "ethers";
import {AXELAR_CHAINS, getAxelarscanUrl} from "../../lib/axelar/index.js";
import {ERC20_ABI} from "../../lib/axelar/crossChainPayment.js";
import {generateEvmStealthAddress, generateEphemeralKeyPair, hexToBytes} from "../../lib/evm/stealthAddress.js";
import {
  AXELAR_PRIVACY_POOL_ABI,
  generatePoolNote,
  buildMerkleProof,
  getExtDataHashGMP,
  getExtDataHashITS,
  proveWithdraw,
} from "../../lib/axelar/privacyPool.js";

const NOTE_STORAGE_KEY = "axelar_privacy_pool_notes_v1";

function loadNotes() {
  try {
    const raw = localStorage.getItem(NOTE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(notes));
}

function downloadJson(filename, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], {type: "application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function AxelarPrivacyPoolPanel({
  evmAddress,
  chainId,
  sourceChainKey,
  destinationChainKey,
  recipientAddress,
  recipientMetaAddress,
  connectedBridgeAddress,
}) {
  const poolAddress = import.meta.env.VITE_AXELAR_PRIVACY_POOL_BASE_SEPOLIA || "";
  const zkWasmUrl = import.meta.env.VITE_AXELAR_POOL_WASM_URL || "/zk/axelar-pool/WithdrawAndBridge.wasm";
  const zkZkeyUrl = import.meta.env.VITE_AXELAR_POOL_ZKEY_URL || "/zk/axelar-pool/WithdrawAndBridge_final.zkey";
  const envDepositFromBlock = Number(import.meta.env.VITE_AXELAR_POOL_FROM_BLOCK || "0");
  const [logFromBlock, setLogFromBlock] = useState(() => (Number.isFinite(envDepositFromBlock) ? envDepositFromBlock : 0));

  const [notes, setNotes] = useState(() => loadNotes());
  const [selectedNoteCommitment, setSelectedNoteCommitment] = useState("");

  const [poolLoading, setPoolLoading] = useState(false);
  const [poolToken, setPoolToken] = useState("");
  const [poolDenom, setPoolDenom] = useState(null);
  const [poolBridge, setPoolBridge] = useState("");
  const [poolTokenDecimals, setPoolTokenDecimals] = useState(6);
  const [poolGmpSymbol, setPoolGmpSymbol] = useState("");
  const [poolItsTokenId, setPoolItsTokenId] = useState(null);
  const [tokenBalance, setTokenBalance] = useState(null);

  const [depositing, setDepositing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const [relayerFee, setRelayerFee] = useState("0");
  const [gasValueEth, setGasValueEth] = useState("0.001");
  const [anonymitySetSize, setAnonymitySetSize] = useState(0);
  const [loadingAnonymitySet, setLoadingAnonymitySet] = useState(false);

  const srcConfig = AXELAR_CHAINS[sourceChainKey];
  const dstConfig = AXELAR_CHAINS[destinationChainKey];

  const isConfigured = !!poolAddress;
  const requiredChainId = srcConfig?.chainId;
  const onCorrectChain = requiredChainId ? chainId === requiredChainId : false;

  const poolContract = useMemo(() => {
    if (!poolAddress || !window.ethereum) return null;
    const provider = new ethers.BrowserProvider(window.ethereum);
    return new ethers.Contract(poolAddress, AXELAR_PRIVACY_POOL_ABI, provider);
  }, [poolAddress]);

  useEffect(() => {
    async function loadPool() {
      if (!poolContract) return;
      setPoolLoading(true);
      try {
        const token = await poolContract.token();
        const denom = await poolContract.denomination();
        const bridge = await poolContract.axelarStealthBridge();
        const gmp = await poolContract.gmpSymbol();
        const its = await poolContract.itsTokenId();

        const provider = poolContract.runner?.provider;
        if (provider) {
          const erc20 = new ethers.Contract(token, ["function decimals() view returns (uint8)"], provider);
          const d = await erc20.decimals();
          setPoolTokenDecimals(Number(d));
        }

        setPoolToken(token);
        setPoolDenom(denom);
        setPoolBridge(bridge);
        setPoolGmpSymbol(gmp);
        setPoolItsTokenId(its);
      } catch (e) {
        console.error(e);
        toast.error("Failed to load pool config");
      } finally {
        setPoolLoading(false);
      }
    }
    loadPool();
  }, [poolContract]);

  useEffect(() => {
    async function refreshBalance() {
      if (!poolToken || !evmAddress || !window.ethereum) {
        setTokenBalance(null);
        return;
      }
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const erc20 = new ethers.Contract(poolToken, ["function balanceOf(address) view returns (uint256)"], provider);
        const bal = await erc20.balanceOf(evmAddress);
        setTokenBalance(BigInt(bal.toString()));
      } catch (err) {
        console.warn("Unable to fetch pool token balance", err);
        setTokenBalance(null);
      }
    }
    refreshBalance();
  }, [poolToken, evmAddress, chainId]);

  useEffect(() => {
    async function ensureReasonableLogFromBlock() {
      if (envDepositFromBlock && envDepositFromBlock > 0) return; // user provided config wins
      if (!window.ethereum) return;
      if (!onCorrectChain) return;
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const latest = await provider.getBlockNumber();
        // Many public RPCs cap eth_getLogs ranges (e.g. 100k blocks). Default to a recent window.
        const fallback = Math.max(0, latest - 90_000);
        setLogFromBlock((prev) => (prev && prev > 0 ? prev : fallback));
      } catch (e) {
        // If this fails, leave the user-configured/default value as-is.
        console.warn("Unable to auto-set logFromBlock", e);
      }
    }
    ensureReasonableLogFromBlock();
  }, [envDepositFromBlock, onCorrectChain, chainId]);

  // Fetch anonymity set size
  useEffect(() => {
    async function loadAnonymitySet() {
      if (!poolContract || !poolAddress || !onCorrectChain) {
        setAnonymitySetSize(0);
        return;
      }
      setLoadingAnonymitySet(true);
      try {
        const nextIdx = await poolContract.nextIndex();
        setAnonymitySetSize(Number(nextIdx));
      } catch (e) {
        console.error("Failed to fetch anonymity set:", e);
        setAnonymitySetSize(0);
        // Only show error if pool is configured (otherwise user knows it's not set up)
        if (poolAddress && onCorrectChain) {
          console.warn("Pool contract may not exist at the configured address or you're on the wrong network");
        }
      } finally {
        setLoadingAnonymitySet(false);
      }
    }
    loadAnonymitySet();
    // Refresh every 30 seconds
    const interval = setInterval(loadAnonymitySet, 30000);
    return () => clearInterval(interval);
  }, [poolContract, poolAddress, onCorrectChain]);

  const selectedNote = useMemo(() => {
    if (!selectedNoteCommitment) return null;
    return notes.find((n) => n.commitment === selectedNoteCommitment) || null;
  }, [notes, selectedNoteCommitment]);

  const canUsePoolRoute =
    sourceChainKey === "base" &&
    destinationChainKey === "polygon" &&
    (!!dstConfig?.axelarName && !!srcConfig?.axelarName);

  const withdrawPreconditions = {
    route: canUsePoolRoute,
    note: !!selectedNote,
    stealth: !!recipientMetaAddress,
    chain: !!onCorrectChain,
  };

  const withdrawDisabledReasons = [
    !withdrawPreconditions.route && "Select Base → Polygon route to use the pool.",
    !withdrawPreconditions.chain && (srcConfig ? `Switch wallet to ${srcConfig.name}.` : "Select a source chain."),
    !withdrawPreconditions.note && "Select a deposited note to withdraw.",
    !withdrawPreconditions.stealth && "Recipient is not registered for stealth (no meta keys found).",
  ].filter(Boolean);

  const isWithdrawDisabled = withdrawDisabledReasons.length > 0;

  const mode = poolGmpSymbol && poolGmpSymbol.length > 0 ? "GMP" : "ITS";

  // Privacy score calculation
  const getPrivacyScore = () => {
    if (anonymitySetSize === 0) return {level: "none", text: "No deposits yet", color: "default"};
    if (anonymitySetSize < 5) return {level: "very-low", text: "Very Low Privacy", color: "danger"};
    if (anonymitySetSize < 10) return {level: "low", text: "Low Privacy", color: "warning"};
    if (anonymitySetSize < 50) return {level: "moderate", text: "Moderate Privacy", color: "primary"};
    return {level: "strong", text: "Strong Privacy", color: "success"};
  };

  const privacyScore = getPrivacyScore();

  // Time-based warning for withdrawals
  const getTimingWarning = () => {
    if (!selectedNote?.createdAt) return null;
    const depositTime = new Date(selectedNote.createdAt);
    const now = new Date();
    const hoursSince = (now - depositTime) / (1000 * 60 * 60);

    if (hoursSince < 1) return {severity: "high", message: "Deposited <1 hour ago. Wait longer for better privacy!"};
    if (hoursSince < 24) return {severity: "medium", message: `Deposited ${hoursSince.toFixed(1)}h ago. Consider waiting 24h for stronger privacy.`};
    return null;
  };

  const timingWarning = getTimingWarning();

  const handleDeposit = async () => {
    if (!evmAddress) return toast.error("Connect wallet");
    if (!isConfigured) return toast.error("Pool address not configured in env");
    if (!srcConfig) return toast.error("Select a source chain");
    if (!onCorrectChain) return toast.error(`Switch wallet to ${srcConfig.name}`);
    if (!poolContract) return toast.error("Pool not ready");
    if (!poolToken || !poolDenom) return toast.error("Pool not loaded yet");

    setDepositing(true);
    const toastId = toast.loading("Creating note + depositing...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const token = new ethers.Contract(poolToken, ERC20_ABI, signer);
      const balance = await token.balanceOf(evmAddress);
      if (balance < poolDenom) {
        toast.error(`Insufficient tokens. Need ${Number(poolDenom) / 10 ** poolTokenDecimals} to deposit.`);
        return;
      }

      const note = await generatePoolNote();
      const commitment = BigInt(note.commitment);

      const allowance = await token.allowance(evmAddress, poolAddress);
      if (allowance < poolDenom) {
        const txA = await token.approve(poolAddress, poolDenom);
        await txA.wait();
      }

      const poolWithSigner = poolContract.connect(signer);
      const tx = await poolWithSigner.deposit(commitment);
      const receipt = await tx.wait();

      const parsed = receipt.logs
        .map((l) => {
          try {
            return poolWithSigner.interface.parseLog(l);
          } catch {
            return null;
          }
        })
        .find((x) => x && x.name === "Deposit");

      const leafIndex = parsed?.args?.leafIndex?.toString?.() ?? null;

      const enriched = {
        ...note,
        chainId,
        sourceChainKey,
        poolAddress,
        token: poolToken,
        denomination: poolDenom.toString(),
        leafIndex,
        txHash: receipt.hash,
        depositBlockNumber: receipt.blockNumber,
      };

      const next = [enriched, ...notes];
      setNotes(next);
      saveNotes(next);
      setSelectedNoteCommitment(enriched.commitment);

      toast.success("Deposit complete. Note saved locally.", {id: toastId});
      setTokenBalance((prev) => (prev !== null ? prev - poolDenom : prev));
    } catch (e) {
      console.error(e);
      toast.error(e?.shortMessage || e?.message || "Deposit failed", {id: toastId});
    } finally {
      setDepositing(false);
    }
  };

  const handleWithdrawAndBridge = async () => {
    if (!evmAddress) return toast.error("Connect wallet");
    if (!selectedNote) return toast.error("Select a note first");
    if (!canUsePoolRoute) return toast.error("Select Base → Polygon route for this pool");
    if (!onCorrectChain) return toast.error(`Switch wallet to ${srcConfig.name}`);
    if (!recipientMetaAddress) return toast.error("Recipient is not registered for stealth (or not detected)");
    if (!poolContract) return toast.error("Pool not ready");

    setWithdrawing(true);
    const toastId = toast.loading("Building proof + relaying withdraw...");
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const poolRead = poolContract.connect(provider);

      // Prepare stealth params locally (no API calls)
      const eph = generateEphemeralKeyPair();
      const stealth = generateEvmStealthAddress(
        recipientMetaAddress.spendPubKey,
        recipientMetaAddress.viewingPubKey,
        hexToBytes(eph.privateKey),
        0
      );

      const ephemeralPubKeyBytes = ethers.getBytes("0x" + stealth.ephemeralPubKey);
      const viewHintByte = ("0x" + stealth.viewHint).slice(0, 4);
      const k = stealth.k;

      const denom = BigInt(poolDenom.toString());
      const fee = ethers.parseUnits(relayerFee || "0", poolTokenDecimals);
      if (fee > denom) throw new Error("Relayer fee exceeds denomination");
      const amountToBridge = denom - fee;

      const runMerkleProof = async (fromBlock) =>
        buildMerkleProof({
          provider,
          pool: poolRead,
          commitment: selectedNote.commitment,
          fromBlock,
        });

      let root;
      let pathElements;
      let pathIndices;

      const isLogRangeError = (err) => {
        const msg =
          err?.message ||
          err?.error?.data?.message ||
          err?.data?.message ||
          err?.info?.error?.data?.message ||
          "";
        return typeof msg === "string" && msg.includes("query exceeds max block range");
      };

      try {
        ({root, pathElements, pathIndices} = await runMerkleProof(logFromBlock));
      } catch (err) {
        if (isLogRangeError(err)) {
          const latest = await provider.getBlockNumber();
          const tightened = Math.max(0, latest - 90_000);
          setLogFromBlock(tightened);
          ({root, pathElements, pathIndices} = await runMerkleProof(tightened));
        } else {
          throw err;
        }
      }

      const nullifierHash = BigInt(selectedNote.nullifierHash);
      const extDataHash =
        mode === "GMP"
          ? getExtDataHashGMP({
              destinationChain: dstConfig.axelarName,
              stealthAddress: stealth.stealthAddress,
              ephemeralPubKeyBytes,
              viewHint: viewHintByte,
              k,
              amountToBridge,
              relayerFee: fee,
              axelarStealthBridge: poolBridge || connectedBridgeAddress,
              gmpSymbol: poolGmpSymbol,
            })
          : getExtDataHashITS({
              destinationChain: dstConfig.axelarName,
              stealthAddress: stealth.stealthAddress,
              ephemeralPubKeyBytes,
              viewHint: viewHintByte,
              k,
              amountToBridge,
              relayerFee: fee,
              axelarStealthBridge: poolBridge || connectedBridgeAddress,
              itsTokenId: poolItsTokenId,
            });

      const {a, b, c} = await proveWithdraw({
        root,
        nullifierHash,
        extDataHash,
        nullifier: selectedNote.nullifier,
        secret: selectedNote.secret,
        pathElements,
        pathIndices,
        wasmUrl: zkWasmUrl,
        zkeyUrl: zkZkeyUrl,
      });

      const poolWrite = poolContract.connect(signer);
      const gasValueWei = ethers.parseEther(gasValueEth || "0");

      const tx =
        mode === "GMP"
          ? await poolWrite.withdrawAndBridgeGMP(
              root,
              nullifierHash,
              fee,
              dstConfig.axelarName,
              stealth.stealthAddress,
              ephemeralPubKeyBytes,
              viewHintByte,
              k,
              a,
              b,
              c,
              {value: gasValueWei}
            )
          : await poolWrite.withdrawAndBridgeITS(
              root,
              nullifierHash,
              fee,
              dstConfig.axelarName,
              stealth.stealthAddress,
              ephemeralPubKeyBytes,
              viewHintByte,
              k,
              a,
              b,
              c,
              {value: gasValueWei}
            );

      toast.loading("Submitted withdraw. Waiting for confirmation...", {id: toastId});
      const receipt = await tx.wait();
      toast.success("Withdraw+bridge submitted.", {id: toastId});

      toast(`Axelarscan: ${getAxelarscanUrl(receipt.hash)}`);
    } catch (e) {
      console.error(e);
      const msg =
        e?.message ||
        e?.error?.data?.message ||
        e?.data?.message ||
        e?.info?.error?.data?.message ||
        "";
      if (typeof msg === "string" && msg.includes("query exceeds max block range")) {
        toast.error("RPC log query too large. Set 'Log scan from block' closer to your deposit block (or set VITE_AXELAR_POOL_FROM_BLOCK).", {id: toastId});
        return;
      }
      toast.error(e?.shortMessage || e?.message || "Withdraw failed", {id: toastId});
    } finally {
      setWithdrawing(false);
    }
  };

  // Current step in the flow
  const [currentStep, setCurrentStep] = useState(notes.length > 0 ? 2 : 1);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Format denomination for display
  const formattedDenom = poolDenom ? (Number(poolDenom) / 10 ** poolTokenDecimals).toFixed(2) : "10";

  // Format balance for display  
  const formattedBalance = tokenBalance !== null ? (Number(tokenBalance) / 10 ** poolTokenDecimals).toFixed(2) : "--";
  const hasEnoughBalance = tokenBalance !== null && poolDenom !== null && tokenBalance >= poolDenom;

  return (
    <Card className="bg-gradient-to-br from-slate-50 to-indigo-50 border-2 border-indigo-200 shadow-xl rounded-2xl overflow-hidden">
      <CardBody className="p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Privacy Pool</h3>
                <p className="text-white/80 text-xs">Anonymous cross-chain transfers</p>
              </div>
            </div>
            <Chip 
              size="sm" 
              className="bg-white/20 text-white border-white/30"
              variant="bordered"
            >
              {formattedDenom} TUSDC per deposit
            </Chip>
          </div>
        </div>

        {/* Privacy Score Banner */}
        {isConfigured && onCorrectChain && (
          <div className="px-4 py-3 bg-white border-b border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-gray-800">Privacy Strength</span>
              </div>
              <Chip size="sm" color={privacyScore.color} variant="flat">
                {loadingAnonymitySet ? <Spinner size="sm" /> : `${anonymitySetSize} deposits`}
              </Chip>
            </div>
            <Progress 
              value={Math.min(100, anonymitySetSize * 2)} 
              color={privacyScore.color}
              className="h-2"
              aria-label="Privacy strength"
            />
            <p className="text-xs text-gray-500 mt-1">
              {anonymitySetSize < 10 
                ? "🔸 More deposits = stronger privacy. Consider waiting." 
                : anonymitySetSize < 50 
                  ? "🔹 Good anonymity set. Privacy is moderate."
                  : "🟢 Strong anonymity set!"}
            </p>
          </div>
        )}

        {/* Error States */}
        {!isConfigured && (
          <div className="p-4 bg-amber-50 border-b border-amber-200">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Pool not configured</span>
            </div>
            <p className="text-xs text-amber-700 mt-1">Set VITE_AXELAR_PRIVACY_POOL_BASE_SEPOLIA in your environment.</p>
          </div>
        )}

        {isConfigured && !onCorrectChain && (
          <div className="p-4 bg-orange-50 border-b border-orange-200">
            <div className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Wrong Network</span>
            </div>
            <p className="text-xs text-orange-700 mt-1">Switch wallet to <strong>{srcConfig?.name}</strong> to use the pool.</p>
          </div>
        )}

        {!canUsePoolRoute && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <div className="flex items-center gap-2 text-blue-800">
              <Info className="w-4 h-4" />
              <span className="text-sm font-medium">Route Required</span>
            </div>
            <p className="text-xs text-blue-700 mt-1">Select <strong>Base → Polygon</strong> route above to use the privacy pool.</p>
          </div>
        )}

        {/* Stepper */}
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            {/* Step 1 */}
            <div 
              className={`flex-1 cursor-pointer ${currentStep >= 1 ? '' : 'opacity-50'}`}
              onClick={() => setCurrentStep(1)}
            >
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                  currentStep === 1 
                    ? 'bg-indigo-600 text-white shadow-lg scale-110' 
                    : notes.length > 0 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {notes.length > 0 && currentStep !== 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
                </div>
                <span className={`text-xs font-medium ${currentStep === 1 ? 'text-indigo-600' : 'text-gray-500'}`}>Deposit</span>
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center -mt-6">
              <ArrowRight className="w-5 h-5 text-gray-300" />
            </div>

            {/* Step 2 */}
            <div 
              className={`flex-1 cursor-pointer ${notes.length > 0 ? '' : 'opacity-50'}`}
              onClick={() => notes.length > 0 && setCurrentStep(2)}
            >
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                  currentStep === 2 
                    ? 'bg-indigo-600 text-white shadow-lg scale-110' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  <Clock className="w-5 h-5" />
                </div>
                <span className={`text-xs font-medium ${currentStep === 2 ? 'text-indigo-600' : 'text-gray-500'}`}>Wait</span>
              </div>
            </div>

            <div className="flex-1 flex items-center justify-center -mt-6">
              <ArrowRight className="w-5 h-5 text-gray-300" />
            </div>

            {/* Step 3 */}
            <div 
              className={`flex-1 cursor-pointer ${selectedNote ? '' : 'opacity-50'}`}
              onClick={() => selectedNote && setCurrentStep(3)}
            >
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                  currentStep === 3 
                    ? 'bg-indigo-600 text-white shadow-lg scale-110' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  <Unlock className="w-5 h-5" />
                </div>
                <span className={`text-xs font-medium ${currentStep === 3 ? 'text-indigo-600' : 'text-gray-500'}`}>Withdraw</span>
              </div>
            </div>
          </div>

          {/* Step Content */}
          {currentStep === 1 && (
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardBody className="p-4 space-y-4">
                <div className="text-center">
                  <h4 className="font-bold text-gray-900 mb-1">Step 1: Deposit to Pool</h4>
                  <p className="text-sm text-gray-600">Join the anonymity set with a fixed {formattedDenom} TUSDC deposit</p>
                </div>

                {/* Balance Check */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                  <div>
                    <p className="text-xs text-gray-500">Your TUSDC Balance</p>
                    <p className="font-bold text-gray-900">{formattedBalance} TUSDC</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Required</p>
                    <p className="font-bold text-indigo-600">{formattedDenom} TUSDC</p>
                  </div>
                </div>

                {!hasEnoughBalance && tokenBalance !== null && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                    ⚠️ Insufficient balance. You need {formattedDenom} TUSDC to deposit.
                  </div>
                )}

                <Button
                  className="w-full h-12 font-bold text-white shadow-lg"
                  style={{ backgroundColor: '#0d08e3' }}
                  isDisabled={!canUsePoolRoute || !isConfigured || !onCorrectChain || !hasEnoughBalance}
                  isLoading={depositing}
                  onPress={handleDeposit}
                  startContent={!depositing && <Shield className="w-5 h-5" />}
                >
                  {depositing ? "Creating Note..." : `Deposit ${formattedDenom} TUSDC`}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  A secret note will be generated and saved locally. <strong>Keep it safe!</strong>
                </p>
              </CardBody>
            </Card>
          )}

          {currentStep === 2 && (
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardBody className="p-4 space-y-4">
                <div className="text-center">
                  <h4 className="font-bold text-gray-900 mb-1">Step 2: Wait for Privacy</h4>
                  <p className="text-sm text-gray-600">More deposits = better anonymity. You can withdraw anytime.</p>
                </div>

                {/* Notes List */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700">Your Deposit Notes ({notes.length})</p>
                  {notes.length === 0 ? (
                    <div className="text-center py-6 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-500">No deposits yet. Complete Step 1 first.</p>
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {notes.map((n, idx) => (
                        <div 
                          key={n.commitment}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            selectedNoteCommitment === n.commitment 
                              ? 'border-indigo-500 bg-indigo-50' 
                              : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedNoteCommitment(n.commitment)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-mono text-gray-700">{n.commitment.slice(0, 20)}...</p>
                              <p className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedNoteCommitment === n.commitment && (
                                <Chip size="sm" color="primary" variant="flat">Selected</Chip>
                              )}
                              <Button
                                size="sm"
                                variant="flat"
                                isIconOnly
                                onClick={(e) => {
                                  e.stopPropagation();
                                  downloadJson(`axelar-note-${Date.now()}.json`, n);
                                }}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timing Info */}
                {selectedNote && timingWarning && (
                  <div className={`rounded-xl p-3 ${
                    timingWarning.severity === "high" 
                      ? "bg-red-50 border border-red-200" 
                      : "bg-amber-50 border border-amber-200"
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className={`w-4 h-4 ${timingWarning.severity === "high" ? "text-red-600" : "text-amber-600"}`} />
                      <span className={`text-sm font-medium ${timingWarning.severity === "high" ? "text-red-700" : "text-amber-700"}`}>
                        Timing Recommendation
                      </span>
                    </div>
                    <p className={`text-xs ${timingWarning.severity === "high" ? "text-red-600" : "text-amber-600"}`}>
                      {timingWarning.message}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="bordered"
                    className="flex-1"
                    onClick={() => setCurrentStep(1)}
                  >
                    Deposit More
                  </Button>
                  <Button
                    className="flex-1 font-bold text-white"
                    style={{ backgroundColor: '#0d08e3' }}
                    isDisabled={!selectedNote}
                    onClick={() => setCurrentStep(3)}
                    endContent={<ArrowRight className="w-4 h-4" />}
                  >
                    Proceed to Withdraw
                  </Button>
                </div>
              </CardBody>
            </Card>
          )}

          {currentStep === 3 && (
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardBody className="p-4 space-y-4">
                <div className="text-center">
                  <h4 className="font-bold text-gray-900 mb-1">Step 3: Withdraw & Bridge</h4>
                  <p className="text-sm text-gray-600">Submit ZK proof and bridge to Polygon stealth address</p>
                </div>

                {/* Selected Note */}
                {selectedNote && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <p className="text-xs font-semibold text-indigo-700 mb-1">Selected Note</p>
                    <p className="text-xs font-mono text-indigo-900">{selectedNote.commitment.slice(0, 30)}...</p>
                    <p className="text-xs text-indigo-600 mt-1">Deposited: {new Date(selectedNote.createdAt).toLocaleString()}</p>
                  </div>
                )}

                {/* Recipient Info */}
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Recipient</p>
                  <p className="text-xs font-mono text-gray-900 break-all">{recipientAddress || "Not set"}</p>
                  {recipientMetaAddress ? (
                    <Chip size="sm" color="success" variant="flat" className="mt-2">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Stealth Enabled
                    </Chip>
                  ) : (
                    <Chip size="sm" color="warning" variant="flat" className="mt-2">
                      <AlertTriangle className="w-3 h-3 mr-1" /> Not registered for stealth
                    </Chip>
                  )}
                </div>

                {/* Advanced Settings Toggle */}
                <button 
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? "Hide" : "Show"} Advanced Settings
                  <ArrowRight className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`} />
                </button>

                {showAdvanced && (
                  <div className="space-y-3 p-3 bg-gray-50 rounded-xl">
                    <Input
                      size="sm"
                      label="Relayer Fee (TUSDC)"
                      value={relayerFee}
                      onValueChange={setRelayerFee}
                      variant="bordered"
                      description="For testing, keep at 0"
                    />
                    <Input
                      size="sm"
                      label="Axelar Gas (ETH)"
                      value={gasValueEth}
                      onValueChange={setGasValueEth}
                      variant="bordered"
                      description="Gas for cross-chain execution"
                    />
                    <Input
                      size="sm"
                      label="Scan from block"
                      value={String(logFromBlock || 0)}
                      onValueChange={(v) => setLogFromBlock(Number(v || "0"))}
                      variant="bordered"
                      description="For Merkle proof building"
                    />
                  </div>
                )}

                {/* Withdraw Blockers */}
                {isWithdrawDisabled && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-xs font-semibold text-red-700 mb-2">Cannot withdraw yet:</p>
                    <ul className="text-xs text-red-600 space-y-1">
                      {withdrawDisabledReasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Button
                  className="w-full h-12 font-bold text-white shadow-lg"
                  style={{ backgroundColor: isWithdrawDisabled ? '#9ca3af' : '#0d08e3' }}
                  isDisabled={isWithdrawDisabled}
                  isLoading={withdrawing}
                  onPress={handleWithdrawAndBridge}
                  startContent={!withdrawing && <Zap className="w-5 h-5" />}
                >
                  {withdrawing ? "Building Proof & Bridging..." : "Withdraw & Bridge to Polygon"}
                </Button>

                <div className="text-xs text-gray-500 text-center space-y-1">
                  <p>⚡ Funds will appear on <strong>Polygon</strong> at the recipient's stealth address</p>
                  <p>🔒 For best privacy, use a different wallet for withdraw than deposit</p>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
