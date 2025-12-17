import { useState } from "react";
import { Button, Card, CardBody, Progress } from "@nextui-org/react";
import { useZcash } from "../providers/ZcashProvider";
import { useMina } from "../components/mina-protocol/MinaProvider";
import { createZcashTransaction } from "../lib/zcash";
import { Icons } from "../components/shared/Icons";
import toast from "react-hot-toast";
import { ArrowRight, ShieldCheck, Database, FileCode, CheckCircle2 } from "lucide-react";

export default function ZcashMinaBridgePage() {
    const { zcashAccount, isConnected: isZcashConnected, createWallet: createZcashWallet } = useZcash();
    const { minaAccount, isConnected: isMinaConnected, connect: connectMina } = useMina();

    const [step, setStep] = useState(0);
    // 0: Init, 1: Lock ZEC, 2: Prove (SPV), 3: Verify (Recursive), 4: Mint

    const [proofData, setProofData] = useState(null);

    const handleStart = async () => {
        if (!isZcashConnected) {
            createZcashWallet(); // Auto-create for demo flow if needed
            // Ideally wait for user to confirm
        }
        if (!isMinaConnected && window.mina) {
            await connectMina();
        }

        if (isZcashConnected) setStep(1);
        else toast("Please connect wallets first");
    };

    const handleLock = async () => {
        // Step 1: Simulate sending ZEC
        toast.loading("Broadcasting Zcash Transaction...", { duration: 2000 });
        await new Promise(r => setTimeout(r, 2000));

        const tx = createZcashTransaction("mock-key", "bridge-vault", 10);
        console.log("Locked ZEC:", tx);

        toast.success("ZEC Locked! Block #24501");
        setStep(2);
    };

    const handleProve = async () => {
        // Step 2: Simulate Generating SPV Proof (Client Side)
        setStep(2.5); // "Proving" internal state

        // Mock heavy computation
        for (let i = 0; i < 100; i += 10) {
            await new Promise(r => setTimeout(r, 300)); // Simulate proving loop
        }

        setProofData({
            proof: "pi_zec_snark_bytes_xyz...",
            publicInput: { root: "0x123", amount: 10 }
        });

        toast.success("ZK Proof Generated!");
        setStep(3);
    };

    const handleVerifyAndMint = async () => {
        // Step 3: Submit to Mina zkApp
        toast.loading("Submitting to Mina network...", { duration: 2000 });
        await new Promise(r => setTimeout(r, 2000));

        // Simulate recursion check
        toast.success("Recursion Verified! Minting wZEC...");
        setStep(4);
    };

    return (
        <div className="flex flex-col items-center w-full min-h-[85vh] p-4 py-12 gap-8">
            <div className="text-center max-w-2xl space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                    Zcash <span className="text-gray-400 text-3xl">×</span> Mina
                </h1>
                <p className="text-xl font-semibold text-gray-700">
                    Programmable Privacy Bridge PoC
                </p>
                <p className="text-gray-500">
                    Demonstrating trustless bridging using recursive ZK proofs.
                    <br />
                    Verifying Zcash chain state inside a Mina zkApp.
                </p>
            </div>

            <Card className="w-full max-w-4xl shadow-2xl bg-white border border-gray-100">
                <CardBody className="p-8 gap-8">

                    {/* Visual Architecture Diagram */}
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 relative">
                        {/* Zcash Node */}
                        <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${step >= 1 ? "border-yellow-400 bg-yellow-50" : "border-gray-200"}`}>
                            <div className="bg-yellow-100 p-3 rounded-full text-yellow-600">
                                <Database size={32} />
                            </div>
                            <span className="font-bold text-gray-700">Zcash Chain</span>
                            <span className="text-xs text-gray-500">Source of Truth</span>
                        </div>

                        {/* Arrow */}
                        <ArrowRight className={`hidden md:block text-gray-300 ${step >= 2 ? "text-yellow-500 animate-pulse" : ""}`} />

                        {/* Prover Node */}
                        <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${step >= 2 ? "border-blue-400 bg-blue-50" : "border-gray-200"}`}>
                            <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                                <ShieldCheck size={32} />
                            </div>
                            <span className="font-bold text-gray-700">ZK Prover</span>
                            <span className="text-xs text-gray-500">Client-Side</span>
                        </div>

                        {/* Arrow */}
                        <ArrowRight className={`hidden md:block text-gray-300 ${step >= 3 ? "text-orange-500 animate-pulse" : ""}`} />

                        {/* Mina Node */}
                        <div className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${step >= 3 ? "border-orange-400 bg-orange-50" : "border-gray-200"}`}>
                            <div className="bg-orange-100 p-3 rounded-full text-orange-600 pb-2">
                                <FileCode size={32} />
                            </div>
                            <span className="font-bold text-gray-700">Mina zkApp</span>
                            <span className="text-xs text-gray-500"> recursive Verify</span>
                        </div>
                    </div>

                    {/* Interactive Flow */}
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 min-h-[200px] flex flex-col justify-center items-center gap-6">
                        {step === 0 && (
                            <Button
                                size="lg"
                                className="bg-black text-white font-bold text-lg px-8 py-6"
                                onClick={handleStart}
                            >
                                Initalize Bridge PoC
                            </Button>
                        )}

                        {step === 1 && (
                            <div className="space-y-4 text-center w-full max-w-md animate-in fade-in">
                                <h3 className="text-xl font-bold">Step 1: Lock Assets</h3>
                                <p className="text-gray-600">Send 10 ZEC to the bridge vault address on the Zcash network.</p>
                                <Button color="warning" className="w-full font-bold text-white" onClick={handleLock}>
                                    Sign Zcash Transaction
                                </Button>
                            </div>
                        )}

                        {(step === 2 || step === 2.5) && (
                            <div className="space-y-4 text-center w-full max-w-md animate-in fade-in">
                                <h3 className="text-xl font-bold">Step 2: Generate ZK Proof</h3>
                                <p className="text-gray-600">Prove that your transaction is included in a valid Zcash block header.</p>
                                {step === 2.5 && <Progress size="sm" isIndeterminate color="primary" aria-label="Proving..." className="max-w-md" />}
                                <Button
                                    color="primary"
                                    className="w-full font-bold"
                                    onClick={handleProve}
                                    isLoading={step === 2.5}
                                >
                                    {step === 2.5 ? "Generating Circuit Proof..." : "Generate SPV Proof"}
                                </Button>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-4 text-center w-full max-w-md animate-in fade-in">
                                <h3 className="text-xl font-bold">Step 3: Recursive Verification</h3>
                                <p className="text-gray-600">The Mina zkApp will verify your Zcash proof recursively inside its own circuit.</p>
                                <div className="bg-black/80 text-green-400 p-3 rounded font-mono text-xs text-left overflow-hidden">
                                    {`Proof: ${proofData?.proof.slice(0, 30)}...`}
                                    <br />
                                    {`Public Input: { root: ${proofData?.publicInput.root} }`}
                                </div>
                                <Button color="danger" className="bg-gradient-to-r from-orange-500 to-amber-500 w-full font-bold text-white" onClick={handleVerifyAndMint}>
                                    Verify on Mina & Mint
                                </Button>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="flex flex-col items-center gap-4 animate-in zoom-in duration-300">
                                <CheckCircle2 size={64} className="text-green-500" />
                                <h2 className="text-2xl font-bold text-green-700">Bridge Successful!</h2>
                                <p className="text-gray-600 text-center max-w-md">
                                    The Mina zkApp cryptographically verified the Zcash state.
                                    <br />
                                    <strong>10 wZEC</strong> have been minted to your address `B62...`.
                                </p>
                                <Button variant="ghost" onClick={() => setStep(0)}>Reset Demo</Button>
                            </div>
                        )}
                    </div>

                </CardBody>
            </Card>

            <div className="text-xs text-gray-400 max-w-2xl text-center">
                * This is a simulation. In production, this requires `zcash-light-client-ffi` compiled to WASM and a Pickles-compatible circuit implementation.
            </div>
        </div>
    );
}
