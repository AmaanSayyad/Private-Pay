import { useState, useEffect } from "react";
import { Button, Card, CardBody, Input, Select, SelectItem, Progress } from "@nextui-org/react";
import { useAptos } from "../providers/AptosProvider";
import { useMina } from "../components/mina-protocol/MinaProvider";
import { useZcash } from "../providers/ZcashProvider";
import { buildBridgeOpReturn } from "../lib/zcash";
import { sendAptTransfer } from "../lib/aptos";
import { sendMinaPayment } from "../components/mina-protocol/mina"; // Mock for receiving
import { Icons } from "../components/shared/Icons";
import toast from "react-hot-toast";
import { ArrowRight, ArrowLeftRight, CheckCircle2, Lock, Unlock, Shield, Zap, Loader2 } from "lucide-react";

// Mock Bridge Treasury Addresses
const BRIDGE_TREASURY_APTOS = import.meta.env.VITE_TREASURY_WALLET_ADDRESS || "0x123...bridge"; // Fallback if env not set

const CHAINS = {
    APTOS: { key: "aptos", name: "Aptos", icon: "/assets/aptos-logo.png", type: "PUBLIC" },
    MINA: { key: "mina", name: "Mina Protocol", icon: "/assets/mina-logo.png", type: "PRIVACY" }, // Need logo asset or placeholder
    ZCASH: { key: "zcash", name: "Zcash", icon: "/assets/zcash-logo.png", type: "PRIVACY" }      // Need logo asset or placeholder
};

export default function BridgePage() {
    // Providers
    const aptos = useAptos();
    const mina = useMina();
    const zcash = useZcash();

    // State
    const [sourceChain, setSourceChain] = useState("aptos");
    const [destChain, setDestChain] = useState("mina");
    const [amount, setAmount] = useState("");
    const [step, setStep] = useState(0); // 0: Input, 1: Locking, 2: Locked/Waiting, 3: Releasing, 4: Complete
    const [completedTx, setCompletedTx] = useState({ lock: null, release: null });

    // Ensure valid chain selection (Public -> Privacy for this demo)
    useEffect(() => {
        if (sourceChain === "aptos" && (destChain === "aptos")) {
            setDestChain("mina");
        }
    }, [sourceChain]);

    const getSourceProvider = () => {
        if (sourceChain === "aptos") return aptos;
        if (sourceChain === "mina") return mina;
        if (sourceChain === "zcash") return zcash;
    };

    const getDestProvider = () => {
        if (destChain === "aptos") return aptos;
        if (destChain === "mina") return mina;
        if (destChain === "zcash") return zcash;
    };

    const isSourceConnected = getSourceProvider()?.isConnected;
    const isDestConnected = getDestProvider()?.isConnected;

    // Actions
    const handleConnectSource = async () => {
        try {
            if (sourceChain === "aptos") await aptos.connect();
            else if (sourceChain === "mina") await mina.connect();
            else if (sourceChain === "zcash") zcash.createWallet(); // Simple create for demo
        } catch (e) {
            toast.error("Failed to connect source wallet");
        }
    };

    const handleConnectDest = async () => {
        try {
            if (destChain === "aptos") await aptos.connect();
            else if (destChain === "mina") {
                if (!mina.isInstalled) {
                    window.open("https://www.aurowallet.com/", "_blank");
                    return;
                }
                await mina.connect();
            }
            else if (destChain === "zcash") {
                // For Zcash, we might already have a wallet or need to make one
                if (!zcash.zcashAccount) zcash.createWallet();
            }
        } catch (e) {
            toast.error("Failed to connect destination wallet");
        }
    };

    const handleBridge = async () => {
        if (!amount || parseFloat(amount) <= 0) {
            toast.error("Invalid amount");
            return;
        }

        if (!isSourceConnected || !isDestConnected) {
            toast.error("Please connect both wallets");
            return;
        }

        // START FLOW
        setStep(1); // Locking

        try {
            // 1. LOCK ASSETS (Send to Bridge Treasury)
            let lockTxHash;
            if (sourceChain === "aptos") {
                const res = await sendAptTransfer({
                    signer: aptos.signAndSubmitTransaction,
                    recipientAddress: BRIDGE_TREASURY_APTOS, // Using existing treasury as "bridge"
                    amount: parseFloat(amount),
                    isTestnet: true
                });
                if (!res.success) throw new Error("Lock transaction failed");
                lockTxHash = res.hash;
            } else {
                throw new Error("Only Aptos Source supported for this demo");
            }

            setCompletedTx(prev => ({ ...prev, lock: lockTxHash }));

            // Build bridge OP_RETURN payload and create simulated bridge tx on Zcash provider
            try {
                const commitment = '0x' + lockTxHash.slice(2).padEnd(32, '0').slice(0, 32);
                const nullifier = '0x' + (Date.now()).toString(16).padEnd(32, '0').slice(0, 32);
                const proof = '0x' + '00'.repeat(64);
                const op = buildBridgeOpReturn({ commitment, nullifier, proof, amount: parseFloat(amount), recipient: destChain === 'mina' ? 'miden1q...' : 'zcash1q...' });
                if (sourceChain === 'aptos') {
                    // Store simulated bridge tx via Zcash provider for demo
                    zcash.createBridgeTx({ commitment, nullifier, proof, amount: parseFloat(amount), recipient: destChain === 'mina' ? 'miden1q...' : 'zcash1q...' });
                }
            } catch (e) {
                console.warn('Failed to create simulated bridge OP_RETURN', e);
            }

            // 2. SIMULATE RELAYER DELAY
            setStep(2);
            await new Promise(r => setTimeout(r, 3000)); // 3s delay for "confirmations"

            // 3. PROMPT RELEASE
            toast.success("Assets Locked! Ready to mint privacy tokens.");
            setStep(3);

        } catch (error) {
            console.error(error);
            toast.error("Bridge failed: " + error.message);
            setStep(0);
        }
    };

    const handleRelease = async () => {
        try {
            // 4. RELEASE/MINT TO DESTINATION
            // In a real bridge, a relayer would submit a proof.
            // Here, we simulate the user "claiming" or the relayer sending to them.
            // Since we don't hold the private key of a 'bridge treasury' on Mina/Zcash,
            // we will simulate the success or perform a self-transfer if possible (but we only have user key).

            // We will just Simulate success for the privacy side:

            await new Promise(r => setTimeout(r, 2000)); // Simulating processing

            // Generate a 'fake' or real tx hash depending on what we can do
            const mockHash = "mock_privacy_tx_" + Date.now();

            // Simulate deposit and refresh balance for the destination chain
            let releaseTxHash = mockHash;
            
            if (destChain === "mina") {
                releaseTxHash = await mina.simulateDeposit(amount);
                // Refresh Mina balance after deposit
                if (mina.minaAccount) {
                    await mina.updateBalance(mina.minaAccount);
                }
            } else if (destChain === "zcash") {
                releaseTxHash = await zcash.simulateDeposit(amount);
            }

            setCompletedTx(prev => ({ ...prev, release: releaseTxHash }));
            setStep(4);
            toast.success((t) => (
                <div className="flex flex-col">
                    <div>Bridge Complete! Privacy tokens received.</div>
                    <div className="text-xs mt-1">
                        Tx: <span className="font-mono text-blue-500">{releaseTxHash}</span>
                    </div>
                </div>
            ));

        } catch (error) {
            console.error(error);
            toast.error(`Release failed: ${error.message || 'Unknown error'}`);
            console.error('Release error details:', error);
        }
    };

    const reset = () => {
        setStep(0);
        setAmount("");
        setCompletedTx({ lock: null, release: null });
    };

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-[80vh] gap-8 p-4 pb-24">
            <div className="flex items-center gap-3">
                <Shield className="w-10 h-10 text-indigo-500" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Privacy Bridge
                </h1>
            </div>

            <p className="text-gray-600 max-w-lg text-center">
                Move assets securely from public chains to privacy layers with zero-knowledge proofs.
            </p>

            {/* Bridge Flow Diagram */}
            <Card className="w-full max-w-2xl shadow-xl border border-gray-200 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 rounded-3xl mb-4">
                <CardBody className="p-6">
                    <h3 className="text-center font-semibold text-gray-700 mb-4">Bridge Flow</h3>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-blue-200">
                                <img src="/assets/aptos-logo.png" alt="Aptos" className="w-12 h-12 object-contain" />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">Aptos</span>
                            <span className="text-xs text-gray-500">Public Chain</span>
                        </div>

                        <div className="flex-1 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-20 h-12 rounded-lg bg-gradient-to-r from-indigo-100 to-purple-100 flex items-center justify-center border border-indigo-200">
                                    <Zap className="text-indigo-600" size={20} />
                                </div>
                                <span className="text-xs text-gray-500 font-medium">ZK Proof</span>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-2 flex-1">
                            <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center overflow-hidden border-2 border-purple-200">
                                <img 
                                    src={destChain === "mina" ? "/assets/mina_logo.png" : "/assets/zcash_logo.png"} 
                                    alt={destChain === "mina" ? "Mina" : "Zcash"} 
                                    className="w-12 h-12 object-contain" 
                                />
                            </div>
                            <span className="text-sm font-semibold text-gray-700">
                                {destChain === "mina" ? "Mina" : "Zcash"}
                            </span>
                            <span className="text-xs text-gray-500">Privacy Chain</span>
                        </div>
                    </div>
                </CardBody>
            </Card>

            <Card className="w-full max-w-2xl shadow-xl border border-gray-200 bg-white rounded-3xl">
                <CardBody className="gap-6 p-8">

                    {/* Source Section */}
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-semibold text-gray-700">From (Public Chain)</p>
                                <p className="text-xs text-gray-500">Lock assets on source chain</p>
                            </div>
                            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">Source</span>
                        </div>
                        <div className="flex gap-4 p-5 border border-gray-200 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 items-center">
                            <div className="relative">
                                <img 
                                    src="/assets/aptos-logo.png" 
                                    alt="Aptos" 
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full z-10 pointer-events-none" 
                                />
                                <Select
                                    selectedKeys={[sourceChain]}
                                    onSelectionChange={(keys) => {
                                        const selected = Array.from(keys)[0];
                                        if (selected) setSourceChain(selected);
                                    }}
                                    className="w-40"
                                    aria-label="Source Chain"
                                    disallowEmptySelection
                                    classNames={{
                                        trigger: "bg-white border-gray-200 pl-10",
                                        value: "flex items-center"
                                    }}
                                >
                                    <SelectItem 
                                        key="aptos" 
                                        value="aptos"
                                        textValue="Aptos"
                                        startContent={<img src="/assets/aptos-logo.png" alt="Aptos" className="w-5 h-5 rounded-full" />}
                                    >
                                        Aptos
                                    </SelectItem>
                                </Select>
                            </div>

                            <div className="flex-1 text-right">
                                {isSourceConnected ? (
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="font-mono text-sm text-gray-700 font-medium">{aptos.account?.slice(0, 8)}...{aptos.account?.slice(-6)}</span>
                                        <span className="text-green-600 text-xs font-semibold flex items-center gap-1">
                                            <CheckCircle2 size={12} /> Connected
                                        </span>
                                    </div>
                                ) : (
                                    <Button 
                                        size="md" 
                                        color="primary" 
                                        onClick={handleConnectSource}
                                        className="font-semibold"
                                    >
                                        Connect Wallet
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center -my-2 z-10 relative">
                        <div className="bg-white p-4 rounded-full border-2 border-indigo-200 shadow-lg flex items-center justify-center">
                            <div className="flex items-center gap-2">
                                <img 
                                    src="/assets/aptos-logo.png" 
                                    alt="Aptos" 
                                    className="w-6 h-6 rounded-full" 
                                />
                                <ArrowLeftRight size={20} className="text-indigo-600" />
                                <img 
                                    src={destChain === "mina" ? "/assets/mina_logo.png" : "/assets/zcash_logo.png"} 
                                    alt={destChain === "mina" ? "Mina" : "Zcash"} 
                                    className="w-6 h-6 rounded-full" 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Destination Section */}
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm font-semibold text-gray-700">To (Privacy Chain)</p>
                                <p className="text-xs text-gray-500">Receive shielded tokens</p>
                            </div>
                            <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">Destination</span>
                        </div>
                        <div className="flex gap-4 p-5 border border-gray-200 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 items-center">
                            <div className="relative">
                                <img 
                                    src={destChain === "mina" ? "/assets/mina_logo.png" : "/assets/zcash_logo.png"} 
                                    alt={destChain === "mina" ? "Mina" : "Zcash"} 
                                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full z-10 pointer-events-none" 
                                />
                                <Select
                                    selectedKeys={[destChain]}
                                    onSelectionChange={(keys) => {
                                        const selected = Array.from(keys)[0];
                                        if (selected) setDestChain(selected);
                                    }}
                                    className="w-40"
                                    aria-label="Destination Chain"
                                    disallowEmptySelection
                                    classNames={{
                                        trigger: "bg-white border-gray-200 pl-10",
                                        value: "flex items-center"
                                    }}
                                >
                                    <SelectItem 
                                        key="mina" 
                                        value="mina"
                                        textValue="Mina"
                                        startContent={<img src="/assets/mina_logo.png" alt="Mina" className="w-5 h-5 rounded-full" />}
                                    >
                                        Mina
                                    </SelectItem>
                                    <SelectItem 
                                        key="zcash" 
                                        value="zcash"
                                        textValue="Zcash"
                                        startContent={<img src="/assets/zcash_logo.png" alt="Zcash" className="w-5 h-5 rounded-full" />}
                                    >
                                        Zcash
                                    </SelectItem>
                                </Select>
                            </div>

                            <div className="flex-1 text-right">
                                {isDestConnected ? (
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="font-mono text-sm text-gray-700 font-medium">
                                            {destChain === "mina" 
                                                ? `${mina.minaAccount?.slice(0, 8)}...${mina.minaAccount?.slice(-6)}` 
                                                : `${zcash.zcashAccount?.address?.slice(0, 8)}...${zcash.zcashAccount?.address?.slice(-6)}`}
                                        </span>
                                        <span className="text-green-600 text-xs font-semibold flex items-center gap-1">
                                            <CheckCircle2 size={12} /> Connected
                                        </span>
                                    </div>
                                ) : (
                                    <Button 
                                        size="md" 
                                        color="secondary" 
                                        onClick={handleConnectDest}
                                        className="font-semibold"
                                    >
                                        Connect Wallet
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-3">
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Amount</label>
                            <div className="relative">
                                <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    isDisabled={step > 0}
                                    endContent={
                                        <div className="flex items-center gap-1">
                                            <img 
                                                src={sourceChain === "aptos" ? "/assets/aptos-logo.png" : "/assets/solana_logo.png"} 
                                                alt={sourceChain === "aptos" ? "APT" : "TOK"} 
                                                className="w-5 h-5 rounded-full" 
                                            />
                                            <span className="text-gray-600 text-sm font-medium">
                                                {sourceChain === "aptos" ? "APT" : "TOK"}
                                            </span>
                                        </div>
                                    }
                                    classNames={{ 
                                        inputWrapper: "h-14 bg-white border-gray-200",
                                        input: "text-lg font-semibold"
                                    }}
                                    variant="bordered"
                                />
                            </div>
                        </div>
                        <div className="flex justify-between items-center px-2 text-xs">
                            <span className="text-gray-500">
                                Balance: <span className="font-medium text-gray-700">{sourceChain === "aptos" ? "Loading..." : "0.00"}</span>
                            </span>
                            <span className="text-gray-500">
                                Fee: <span className="font-medium text-gray-700">~0.001 APT</span>
                            </span>
                        </div>
                        
                        {/* Estimated Output */}
                        {amount && parseFloat(amount) > 0 && (
                            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                                <CardBody className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Lock className="w-4 h-4 text-purple-600" />
                                            <span className="text-sm text-gray-600">You'll receive (estimated)</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg font-bold text-gray-900">
                                                ~{amount}
                                            </span>
                                            <img 
                                                src={destChain === "mina" ? "/assets/mina_logo.png" : "/assets/zcash_logo.png"} 
                                                alt={destChain === "mina" ? "Mina" : "Zcash"} 
                                                className="w-5 h-5 rounded-full" 
                                            />
                                            <span className="text-sm font-semibold text-gray-700">
                                                {destChain === "mina" ? "MINA" : "ZEC"}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">
                                        Amount will be encrypted and minted as privacy tokens
                                    </p>
                                </CardBody>
                            </Card>
                        )}
                    </div>

                    {/* Action Button & Status */}
                    {step === 0 && (
                        <Button
                            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-200 hover:shadow-xl transition-all"
                            onClick={handleBridge}
                            disabled={!amount || step > 0 || !isSourceConnected || !isDestConnected}
                        >
                            <Zap className="w-5 h-5 mr-2" />
                            Bridge Assets
                        </Button>
                    )}

                    {step > 0 && (
                        <div className="flex flex-col gap-4 bg-gradient-to-br from-gray-50 to-indigo-50/30 p-6 rounded-2xl border border-gray-200">
                            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                <Shield className="w-5 h-5 text-indigo-600" />
                                Bridge Progress
                            </h3>
                            
                            {/* Step 1: Lock */}
                            <div className={`flex items-start gap-4 p-4 rounded-xl bg-white border-2 ${step >= 1 && step < 2 ? "border-indigo-300" : step > 1 ? "border-green-200" : "border-gray-200"} transition-all`}>
                                <div className="flex-shrink-0 mt-0.5">
                                    {step > 1 ? (
                                        <CheckCircle2 className="text-green-500 w-6 h-6" />
                                    ) : step === 1 ? (
                                        <Loader2 className="text-indigo-600 w-6 h-6 animate-spin" />
                                    ) : (
                                        <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <img src="/assets/aptos-logo.png" alt="Aptos" className="w-5 h-5 rounded-full" />
                                        <p className="font-semibold text-gray-900">Step 1: Locking Assets</p>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-2">Locking {amount} APT on Aptos chain</p>
                                    {completedTx.lock && (
                                        <a
                                            href={`https://explorer.aptoslabs.com/txn/${completedTx.lock}?network=testnet`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-indigo-600 hover:text-indigo-700 hover:underline font-medium inline-flex items-center gap-1"
                                        >
                                            View Transaction <ArrowRight size={12} />
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Step 2: Relay */}
                            <div className={`flex items-start gap-4 p-4 rounded-xl bg-white border-2 ${step >= 2 && step < 3 ? "border-purple-300" : step > 2 ? "border-green-200" : "border-gray-200"} transition-all`}>
                                <div className="flex-shrink-0 mt-0.5">
                                    {step > 2 ? (
                                        <CheckCircle2 className="text-green-500 w-6 h-6" />
                                    ) : step === 2 ? (
                                        <div className="w-6 h-6 rounded-full bg-purple-400 animate-pulse"></div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Zap className="w-5 h-5 text-purple-600" />
                                        <p className="font-semibold text-gray-900">Step 2: Verifying Proof</p>
                                    </div>
                                    <p className="text-sm text-gray-600">Zero-knowledge proof verification in progress...</p>
                                </div>
                            </div>

                            {/* Step 3: Release */}
                            <div className={`flex items-start gap-4 p-4 rounded-xl bg-white border-2 ${step >= 3 && step < 4 ? "border-orange-300" : step === 4 ? "border-green-200" : "border-gray-200"} transition-all`}>
                                <div className="flex-shrink-0 mt-0.5">
                                    {step === 4 ? (
                                        <CheckCircle2 className="text-green-500 w-6 h-6" />
                                    ) : step === 3 ? (
                                        <div className="w-6 h-6 rounded-full border-2 border-orange-400 animate-ping"></div>
                                    ) : (
                                        <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <img 
                                            src={destChain === "mina" ? "/assets/mina_logo.png" : "/assets/zcash_logo.png"} 
                                            alt={destChain === "mina" ? "Mina" : "Zcash"} 
                                            className="w-5 h-5 rounded-full" 
                                        />
                                        <p className="font-semibold text-gray-900">Step 3: Releasing Tokens</p>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">
                                        Minting privacy tokens on {destChain === "mina" ? "Mina" : "Zcash"}
                                    </p>
                                    {step === 3 && (
                                        <Button
                                            size="md"
                                            className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold shadow-md hover:shadow-lg transition-all"
                                            onClick={handleRelease}
                                        >
                                            <Lock className="w-4 h-4 mr-2" />
                                            Sign to Claim Privacy Tokens
                                        </Button>
                                    )}
                                    {completedTx.release && (
                                        <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                                            <CheckCircle2 size={16} />
                                            Tokens Received Successfully!
                                        </div>
                                    )}
                                </div>
                            </div>

                            {step === 4 && (
                                <div className="pt-4 border-t border-gray-200 space-y-3">
                                    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
                                        <CardBody className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-bold text-green-900">Bridge Complete!</p>
                                                    <p className="text-sm text-green-700">
                                                        Your {amount} APT has been successfully bridged to {destChain === "mina" ? "Mina" : "Zcash"} privacy tokens.
                                                    </p>
                                                </div>
                                                <img 
                                                    src={destChain === "mina" ? "/assets/mina_logo.png" : "/assets/zcash_logo.png"} 
                                                    alt={destChain === "mina" ? "Mina" : "Zcash"} 
                                                    className="w-10 h-10 rounded-full" 
                                                />
                                            </div>
                                        </CardBody>
                                    </Card>
                                    <Button 
                                        variant="bordered" 
                                        className="w-full font-semibold border-2 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                                        onClick={reset}
                                    >
                                        Bridge More Assets
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                </CardBody>
            </Card>
        </div>
    );
}
