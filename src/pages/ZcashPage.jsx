import { useState } from "react";
import { Button, Card, CardBody, Input, Textarea } from "@nextui-org/react";
import { useZcash } from "../providers/ZcashProvider";
import toast from "react-hot-toast";
import { Copy, Check, Eye, EyeOff, RefreshCw } from "lucide-react";

export default function ZcashPage() {
    const {
        zcashAccount,
        isConnected,
        createWallet,
        importWallet,
        disconnect,
        balance
    } = useZcash();

    const [mnemonicInput, setMnemonicInput] = useState("");
    const [copied, setCopied] = useState(false);
    const [showMnemonic, setShowMnemonic] = useState(false);

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Copied to clipboard!");
    };

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-[80vh] gap-8 p-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">
                Zcash Integration
            </h1>

            {!isConnected ? (
                <div className="flex flex-col items-center gap-6 max-w-md w-full">
                    <p className="text-gray-600 text-center">
                        Generate a new Zcash wallet or import an existing one using a mnemonic phrase.
                        (Testnet Only)
                    </p>

                    <div className="flex flex-col gap-4 w-full">
                        <Button
                            color="warning"
                            variant="shadow"
                            size="lg"
                            className="font-bold text-white w-full"
                            onClick={createWallet}
                        >
                            Generate New Wallet
                        </Button>

                        <div className="relative flex py-2 items-center">
                            <div className="flex-grow border-t border-gray-300"></div>
                            <span className="flex-shrink mx-4 text-gray-400 text-sm">Or Import</span>
                            <div className="flex-grow border-t border-gray-300"></div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <Textarea
                                placeholder="Enter mnemonic phrase..."
                                value={mnemonicInput}
                                onChange={(e) => setMnemonicInput(e.target.value)}
                                minRows={2}
                                variant="bordered"
                            />
                            <Button
                                color="primary"
                                variant="flat"
                                className="w-full"
                                onClick={() => importWallet(mnemonicInput)}
                                disabled={!mnemonicInput}
                            >
                                Import Wallet
                            </Button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col w-full max-w-2xl gap-6">
                    {/* Wallet Info Card */}
                    <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-100">
                        <CardBody className="gap-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-yellow-900">Wallet Details</h2>
                                <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-200 text-yellow-800">
                                    Testnet
                                </span>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-yellow-700 font-semibold">Address (Transparent)</label>
                                <div className="flex items-center gap-2 bg-white/50 p-2 rounded-lg border border-yellow-100">
                                    <code className="text-sm truncate flex-1 text-gray-700">{zcashAccount.address}</code>
                                    <button onClick={() => handleCopy(zcashAccount.address)} className="p-1 hover:bg-yellow-100 rounded">
                                        {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-yellow-600" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs text-yellow-700 font-semibold">Mnemonic Phrase</label>
                                    <button
                                        onClick={() => setShowMnemonic(!showMnemonic)}
                                        className="text-xs text-yellow-600 hover:text-yellow-800 flex items-center gap-1"
                                    >
                                        {showMnemonic ? <><EyeOff size={12} /> Hide</> : <><Eye size={12} /> Show</>}
                                    </button>
                                </div>
                                {showMnemonic && (
                                    <div className="bg-yellow-100 p-3 rounded-lg text-sm font-mono text-yellow-900 break-words">
                                        {zcashAccount.mnemonic}
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-1 mt-4">
                                <label className="text-xs text-yellow-700 font-semibold">Balance</label>
                                <div className="flex items-center gap-2">
                                    <div className="text-2xl font-bold text-gray-800">
                                        {balance.available} <span className="text-lg text-yellow-600">tZEC</span>
                                    </div>
                                    <Button isIconOnly size="sm" variant="light" onClick={() => toast("Fetching balance...")}>
                                        <RefreshCw size={14} />
                                    </Button>
                                </div>
                            </div>

                            <Button
                                color="danger"
                                variant="light"
                                className="self-end mt-4"
                                size="sm"
                                onClick={disconnect}
                            >
                                Disconnect Wallet
                            </Button>
                        </CardBody>
                    </Card>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
                        <strong>Note:</strong> This integration currently supports transparent addresses only via <code>zcash-bitcore-lib</code>.
                        Shielded address support requires a backend service or heavy WASM client which is simulated here.
                    </div>
                </div>
            )}
        </div>
    );
}
