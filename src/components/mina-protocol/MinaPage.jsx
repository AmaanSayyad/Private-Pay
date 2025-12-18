import { useState } from "react";
import { Button, Card, CardBody, Input } from "@nextui-org/react";
import { useMina } from "./MinaProvider";
import { sendMinaPayment } from "./mina";
import toast from "react-hot-toast";
import { Copy, Check } from "lucide-react";

export default function MinaPage() {
    const {
        minaAccount,
        isConnected,
        isInstalled,
        connect,
        disconnect,
        minaBalance,
        network
    } = useMina();

    console.log(minaBalance);

    const [recipient, setRecipient] = useState("");
    const [amount, setAmount] = useState("");
    const [memo, setMemo] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleConnect = async () => {
        if (!isInstalled) {
            window.open("https://www.aurowallet.com/", "_blank");
            return;
        }
        try {
            await connect();
            toast.success("Mina wallet connected!");
        } catch (error) {
            toast.error("Failed to connect wallet");
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(minaAccount);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Address copied!");
    };

    const handleSend = async () => {
        if (!recipient || !amount) {
            toast.error("Please fill in recipient and amount");
            return;
        }

        setIsSending(true);
        try {
            const res = await sendMinaPayment(recipient, parseFloat(amount), memo);
            console.log("Transaction response:", res);
            toast.success("Transaction sent successfully!");
            // res.hash usually contains tx hash
            if (res && res.hash) {
                toast((t) => (
                    <div onClick={() => window.open(`https://minascan.io/devnet/tx/${res.hash}`, '_blank')}>
                        View on Explorer
                    </div>
                ));
            }
            setRecipient("");
            setAmount("");
            setMemo("");
        } catch (error) {
            console.error(error);
            toast.error("Transaction failed: " + (error?.message || "Unknown error"));
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-[80vh] gap-8 p-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
                Mina Protocol Integration
            </h1>

            {!isConnected ? (
                <div className="flex flex-col items-center gap-4">
                    <p className="text-gray-600 max-w-md text-center">
                        Connect your Auro Wallet to interact with the Mina blockchain.
                        Experience zero-knowledge privacy features.
                    </p>
                    <Button
                        color="warning"
                        variant="shadow"
                        size="lg"
                        className="font-bold text-white"
                        onClick={handleConnect}
                        startContent={<img src="/assets/auro_logo.png" alt="Auro" className="w-5 h-5 rounded-full" />}
                    >
                        {isInstalled ? "Connect Auro Wallet" : "Install Auro Wallet"}
                    </Button>
                </div>
            ) : (
                <div className="flex flex-col w-full max-w-2xl gap-6">
                    {/* Wallet Info Card */}
                    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-100">
                        <CardBody className="gap-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold text-orange-900">Wallet Details</h2>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${network?.name === 'Mainnet' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {network?.name || network?.networkID || "Unknown Network"}
                                </span>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-orange-700 font-semibold">Address</label>
                                <div className="flex items-center gap-2 bg-white/50 p-2 rounded-lg border border-orange-100">
                                    <code className="text-sm truncate flex-1 text-gray-700">{minaAccount}</code>
                                    <button onClick={handleCopy} className="p-1 hover:bg-orange-100 rounded">
                                        {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-orange-400" />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-xs text-orange-700 font-semibold">Balance</label>
                                <div className="text-2xl font-bold text-gray-800">
                                    {minaBalance?.total || "0"} <span className="text-lg text-orange-500">MINA</span>
                                </div>
                                {(minaBalance.simulated > 0) && (
                                    <div className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded w-fit">
                                        + {minaBalance.simulated} Simulated (Bridge)
                                    </div>
                                )}
                            </div>

                            <Button
                                color="danger"
                                variant="light"
                                className="self-end"
                                size="sm"
                                onClick={disconnect}
                            >
                                Disconnect
                            </Button>
                        </CardBody>
                    </Card>

                    {/* Send Transaction Card */}
                    <Card>
                        <CardBody className="gap-4 p-6">
                            <h2 className="text-xl font-bold mb-2">Send MINA</h2>

                            <Input
                                label="Recipient Address"
                                placeholder="B62..."
                                value={recipient}
                                onChange={(e) => setRecipient(e.target.value)}
                                variant="bordered"
                            />

                            <Input
                                label="Amount"
                                placeholder="0.00"
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                endContent={<span className="text-sm text-gray-500">MINA</span>}
                                variant="bordered"
                            />

                            <Input
                                label="Memo (Optional)"
                                placeholder="Payment reference"
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                variant="bordered"
                            />

                            <Button
                                className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold h-12 mt-2"
                                size="lg"
                                onClick={handleSend}
                                isLoading={isSending}
                            >
                                {isSending ? "Sending..." : "Send Transaction"}
                            </Button>
                        </CardBody>
                    </Card>
                </div>
            )}
        </div>
    );
}
