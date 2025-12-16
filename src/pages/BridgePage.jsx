import { useState, useEffect } from "react";
import { Button, Card, CardBody, Input, Select, SelectItem, Progress } from "@nextui-org/react";
import { useAptos } from "../providers/AptosProvider";
import { useMina } from "../components/mina-protocol/MinaProvider";
import { useZcash } from "../providers/ZcashProvider";
import { sendAptTransfer } from "../lib/aptos";
import { sendMinaPayment } from "../lib/mina"; // Mock for receiving
import { Icons } from "../components/shared/Icons";
import toast from "react-hot-toast";
import { ArrowRight, ArrowLeftRight, CheckCircle2, Lock, Unlock } from "lucide-react";

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

            // NOTE: Simulate deposit to reflect in destination for demo
            if (destChain === "mina") {
                mina.simulateDeposit(amount);
            } else if (destChain === "zcash") {
                zcash.simulateDeposit(amount);
            }

            setCompletedTx(prev => ({ ...prev, release: mockHash }));
            setStep(4);
            toast.success("Bridge Complete! Privacy tokens received.");

        } catch (error) {
            console.error(error);
            toast.error("Release failed");
        }
    };

    const reset = () => {
        setStep(0);
        setAmount("");
        setCompletedTx({ lock: null, release: null });
    };

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-[85vh] gap-8 p-4 py-12">
            <div className="text-center space-y-2">
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
                    Privacy Bridge
                </h1>
                <p className="text-gray-500 text-lg">
                    Move assets securely from Public Chains to Privacy Layers
                </p>
            </div>

            <Card className="w-full max-w-xl shadow-xl border border-neutral-200 bg-white/80 backdrop-blur-md">
                <CardBody className="gap-6 p-6">

                    {/* Source Section */}
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center text-sm font-semibold text-gray-500">
                            <span>From (Public Lock)</span>
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Source</span>
                        </div>
                        <div className="flex gap-4 p-4 border border-neutral-200 rounded-2xl bg-neutral-50 items-center">
                            <Select
                                selectedKeys={[sourceChain]}
                                onChange={(e) => setSourceChain(e.target.value)}
                                className="w-40"
                                aria-label="Source Chain"
                                disallowEmptySelection
                            >
                                <SelectItem key="aptos" startContent={<span className="text-xl">🔵</span>}>Aptos</SelectItem>
                            </Select>

                            <div className="flex-1 text-right">
                                {isSourceConnected ? (
                                    <div className="flex flex-col items-end">
                                        <span className="font-mono text-xs text-gray-500">{aptos.account?.slice(0, 6)}...</span>
                                        <span className="text-green-600 text-xs font-bold">Connected</span>
                                    </div>
                                ) : (
                                    <Button size="sm" color="primary" onClick={handleConnectSource}>Connect</Button>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center -my-3 z-10">
                        <div className="bg-white p-2 rounded-full border border-gray-200 shadow-sm text-gray-400">
                            <ArrowLeftRight size={20} />
                        </div>
                    </div>

                    {/* Destination Section */}
                    <div className="flex flex-col gap-3">
                        <div className="flex justify-between items-center text-sm font-semibold text-gray-500">
                            <span>To (Private Mint)</span>
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Destination</span>
                        </div>
                        <div className="flex gap-4 p-4 border border-neutral-200 rounded-2xl bg-neutral-50 items-center">
                            <Select
                                selectedKeys={[destChain]}
                                onChange={(e) => setDestChain(e.target.value)}
                                className="w-40"
                                aria-label="Destination Chain"
                                disallowEmptySelection
                            >
                                <SelectItem key="mina" startContent={<span className="text-xl">🟠</span>}>Mina</SelectItem>
                                <SelectItem key="zcash" startContent={<span className="text-xl">🟡</span>}>Zcash</SelectItem>
                            </Select>

                            <div className="flex-1 text-right">
                                {isDestConnected ? (
                                    <div className="flex flex-col items-end">
                                        <span className="font-mono text-xs text-gray-500">
                                            {destChain === "mina" ? mina.minaAccount?.slice(0, 6) : zcash.zcashAccount?.address?.slice(0, 6)}...
                                        </span>
                                        <span className="text-green-600 text-xs font-bold">Connected</span>
                                    </div>
                                ) : (
                                    <Button size="sm" color="warning" onClick={handleConnectDest}>Connect</Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Amount Input */}
                    <div className="space-y-2">
                        <Input
                            type="number"
                            label="Amount"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            isDisabled={step > 0}
                            endContent={
                                <span className="text-gray-500 text-sm">
                                    {sourceChain === "aptos" ? "APT" : "TOK"}
                                </span>
                            }
                            classNames={{ inputWrapper: "h-14" }}
                        />
                        <div className="flex justify-between px-2 text-xs text-gray-500">
                            <span>Balance: {sourceChain === "aptos" ? "Loading..." : "0"}</span>
                            <span>Fee: ~0.001 APT</span>
                        </div>
                    </div>

                    {/* Action Button & Status */}
                    {step === 0 && (
                        <Button
                            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-200"
                            onClick={handleBridge}
                            disabled={!amount || step > 0}
                        >
                            Bridge Assets
                        </Button>
                    )}

                    {step > 0 && (
                        <div className="flex flex-col gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 animate-in fade-in zoom-in duration-300">
                            {/* Step 1: Lock */}
                            <div className={`flex items-center gap-3 ${step >= 1 ? "opacity-100" : "opacity-40"}`}>
                                {step > 1 ? (
                                    <CheckCircle2 className="text-green-500" />
                                ) : (
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                                )}
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800">Locking on Aptos</p>
                                    {completedTx.lock && (
                                        <a
                                            href={`https://explorer.aptoslabs.com/txn/${completedTx.lock}?network=testnet`}
                                            target="_blank"
                                            className="text-xs text-blue-500 hover:underline"
                                        >
                                            View TX: {completedTx.lock.slice(0, 6)}...
                                        </a>
                                    )}
                                </div>
                            </div>

                            {/* Step 2: Relay */}
                            <div className={`flex items-center gap-3 ${step >= 2 ? "opacity-100" : "opacity-40"}`}>
                                {step > 2 ? (
                                    <CheckCircle2 className="text-green-500" />
                                ) : (
                                    step === 2 && <div className="animate-pulse h-5 w-5 bg-purple-400 rounded-full"></div>
                                )}
                                <p className="font-semibold text-gray-800">Verifying Proof (ZK Relay)</p>
                            </div>

                            {/* Step 3: Release */}
                            <div className={`flex items-center gap-3 ${step >= 3 ? "opacity-100" : "opacity-40"}`}>
                                {step === 4 ? (
                                    <CheckCircle2 className="text-green-500" />
                                ) : (
                                    step === 3 && <div className="h-5 w-5 rounded-full border-2 border-orange-400 animate-ping"></div>
                                )}
                                <div className="flex-1">
                                    <p className="font-semibold text-gray-800">Releasing on {destChain === "mina" ? "Mina" : "Zcash"}</p>
                                    {step === 3 && (
                                        <Button
                                            size="sm"
                                            color="warning"
                                            className="mt-2 w-full text-white font-bold"
                                            onClick={handleRelease}
                                        >
                                            Sign to Claim Privacy Tokens
                                        </Button>
                                    )}
                                    {completedTx.release && (
                                        <p className="text-xs text-green-600">Tokens Received!</p>
                                    )}
                                </div>
                            </div>

                            {step === 4 && (
                                <Button size="sm" variant="flat" onClick={reset}>Bridge More</Button>
                            )}
                        </div>
                    )}

                </CardBody>
            </Card>
        </div>
    );
}
