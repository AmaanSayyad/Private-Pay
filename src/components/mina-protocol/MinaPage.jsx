import { useState } from "react";
import { Button, Card, CardBody, Input, Tabs, Tab, Chip } from "@nextui-org/react";
import { useMina } from "./MinaProvider";
import { sendMinaPayment } from "./mina";
import toast from "react-hot-toast";
import { Copy, Check, Wallet, Send, Shield, ExternalLink, Eye, EyeOff } from "lucide-react";

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
    const [activeTab, setActiveTab] = useState("receive");
    const [showBalance, setShowBalance] = useState(true);

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
                const networkPath = (network?.networkID === 'mina:mainnet' || network?.name === 'Mainnet') ? 'mainnet' : 'devnet';
                toast((t) => (
                    <div onClick={() => window.open(`https://minascan.io/${networkPath}/tx/${res.hash}`, '_blank')}>
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
        <div className="flex flex-col items-center justify-center w-full min-h-[80vh] gap-8 p-4 pb-24">
            <div className="flex items-center gap-3">
                <img src="/assets/mina_logo.png" alt="Mina" className="w-10 h-10 rounded-full" />
                <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                    Mina Protocol
                </h1>
            </div>

            <p className="text-gray-600 max-w-lg text-center">
                Connect your Auro Wallet to interact with the Mina blockchain. Experience zero-knowledge privacy features.
            </p>

            {!isConnected ? (
                <Card className="max-w-md w-full">
                    <CardBody className="flex flex-col items-center justify-center py-12 gap-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center">
                            <Wallet className="w-10 h-10 text-orange-600" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Auro Wallet</h3>
                            <p className="text-gray-500 text-sm">
                                Connect your wallet to start using Mina's zero-knowledge features
                            </p>
                        </div>
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
                        {!isInstalled && (
                            <p className="text-xs text-gray-400 text-center">
                                Don't have Auro Wallet? <a href="https://www.aurowallet.com/" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">Install it here</a>
                            </p>
                        )}
                    </CardBody>
                </Card>
            ) : (
                <div className="flex flex-col w-full max-w-2xl gap-6">
                    {/* Balance Card */}
                    <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 shadow-sm">
                        <CardBody className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Total Balance</p>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-3xl font-bold text-gray-900">
                                            {showBalance ? (minaBalance?.total || "0.00") : "****"}
                                        </h2>
                                        <div className="flex items-center gap-1">
                                            <img src="/assets/mina_logo.png" alt="MINA" className="w-6 h-6 rounded-full" />
                                            <span className="text-lg font-semibold text-orange-600">MINA</span>
                                        </div>
                                    </div>
                                    {(minaBalance?.simulated > 0) && (
                                        <div className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded w-fit mt-2">
                                            + {minaBalance.simulated} Simulated (Bridge)
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <Button
                                        isIconOnly
                                        variant="light"
                                        onClick={() => setShowBalance(!showBalance)}
                                        className="text-gray-600"
                                    >
                                        {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                    </Button>
                                    <Chip 
                                        size="sm" 
                                        color={network?.name === 'Mainnet' ? 'success' : 'primary'}
                                        variant="flat"
                                    >
                                        {network?.name || network?.networkID || "Unknown Network"}
                                    </Chip>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Main Card with Tabs */}
                    <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl">
                        <CardBody className="p-0">
                            <Tabs
                                selectedKey={activeTab}
                                onSelectionChange={setActiveTab}
                                aria-label="Mina Options"
                                color="warning"
                                variant="underlined"
                                classNames={{
                                    tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider px-6",
                                    tab: "max-w-fit px-0 h-12",
                                    tabContent: "group-data-[selected=true]:text-orange-600",
                                }}
                            >
                                <Tab
                                    key="receive"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <Shield size={18} />
                                            <span>Receive</span>
                                        </div>
                                    }
                                >
                                    <div className="p-6 flex flex-col gap-4">
                                        <h3 className="text-lg font-bold">Your Mina Address</h3>
                                        <p className="text-sm text-gray-600">
                                            Share this address to receive MINA payments. All transactions are private and use zero-knowledge proofs.
                                        </p>

                                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4">
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <img src="/assets/mina_logo.png" alt="Mina" className="w-8 h-8 rounded-full flex-shrink-0" />
                                                    <code className="text-sm font-mono text-gray-700 truncate flex-1">
                                                        {minaAccount}
                                                    </code>
                                                </div>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    <Button
                                                        isIconOnly
                                                        variant="light"
                                                        onClick={handleCopy}
                                                        className="text-gray-600"
                                                    >
                                                        {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} className="text-orange-600" />}
                                                    </Button>
                                                    <Button
                                                        isIconOnly
                                                        variant="light"
                                                        as="a"
                                                        href={`https://minascan.io/${(network?.networkID === 'mina:mainnet' || network?.name === 'Mainnet') ? 'mainnet' : 'devnet'}/account/${minaAccount}/txs`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-gray-600"
                                                    >
                                                        <ExternalLink size={18} className="text-orange-600" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <Card className="bg-primary/10 border border-primary/20">
                                            <CardBody className="p-4">
                                                <div className="flex items-start gap-3">
                                                    <Shield className="w-5 h-5 text-orange-600 mt-0.5" />
                                                    <div>
                                                        <p className="text-orange-900 text-sm font-medium mb-1">
                                                            Zero-Knowledge Privacy
                                                        </p>
                                                        <p className="text-gray-600 text-xs">
                                                            Mina uses zk-SNARKs to keep transaction details private. Your balance and transaction history remain confidential.
                                                        </p>
                                                    </div>
                                                </div>
                                            </CardBody>
                                        </Card>

                                        <Button
                                            color="danger"
                                            variant="light"
                                            className="self-end"
                                            size="sm"
                                            onClick={disconnect}
                                        >
                                            Disconnect Wallet
                                        </Button>
                                    </div>
                                </Tab>

                                <Tab
                                    key="send"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <Send size={18} />
                                            <span>Send</span>
                                        </div>
                                    }
                                >
                                    <div className="p-6 flex flex-col gap-4">
                                        <h3 className="text-lg font-bold">Send MINA</h3>
                                        <p className="text-sm text-gray-600">
                                            Send MINA to any Mina address. Transactions are private and use zero-knowledge proofs.
                                        </p>

                                        <Input
                                            label="Recipient Address"
                                            placeholder="B62qmBFt..."
                                            value={recipient}
                                            onChange={(e) => setRecipient(e.target.value)}
                                            variant="bordered"
                                            classNames={{
                                                inputWrapper: "h-12"
                                            }}
                                            description="Enter the Mina address of the recipient"
                                        />

                                        <div>
                                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Amount</label>
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
                                                        <img src="/assets/mina_logo.png" alt="MINA" className="w-5 h-5 rounded-full" />
                                                        <span className="text-gray-600 text-sm font-medium">MINA</span>
                                                    </div>
                                                }
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Available: {showBalance ? (minaBalance?.total || "0.00") : "****"} MINA
                                            </p>
                                        </div>

                                        <Input
                                            label="Memo (Optional)"
                                            placeholder="Payment reference or note"
                                            value={memo}
                                            onChange={(e) => setMemo(e.target.value)}
                                            variant="bordered"
                                            classNames={{
                                                inputWrapper: "h-12"
                                            }}
                                            description="Add a memo to this transaction (optional)"
                                        />

                                        <Button
                                            className="bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold h-12 mt-2"
                                            size="lg"
                                            onClick={handleSend}
                                            isLoading={isSending}
                                            isDisabled={!recipient || !amount || parseFloat(amount) <= 0}
                                            startContent={!isSending && <Send className="w-5 h-5" />}
                                        >
                                            {isSending ? "Sending Transaction..." : "Send MINA"}
                                        </Button>
                                    </div>
                                </Tab>
                            </Tabs>
                        </CardBody>
                    </Card>
                </div>
            )}
        </div>
    );
}
