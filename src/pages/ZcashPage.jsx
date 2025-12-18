import { useState } from "react";
import { Button, Card, CardBody, Input, Textarea, Chip, Tabs, Tab } from "@nextui-org/react";
import { useZcash } from "../providers/ZcashProvider";
import toast from "react-hot-toast";
import { Copy, Check, Eye, EyeOff, RefreshCw, Wallet, Shield, Send, History, ExternalLink } from "lucide-react";

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
    const [showBalance, setShowBalance] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("Copied to clipboard!");
    };

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-[80vh] gap-8 p-4 pb-24">
            <div className="flex items-center gap-3">
                <img src="/assets/zcash_logo.png" alt="Zcash" className="w-10 h-10 rounded-full" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">
                Zcash Integration
            </h1>
            </div>

            <p className="text-gray-600 max-w-lg text-center">
                Private digital currency with shielded transactions. Generate or import a wallet to get started.
            </p>

            {!isConnected ? (
                <Card className="max-w-md w-full">
                    <CardBody className="flex flex-col items-center justify-center py-12 gap-6">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-100 to-amber-100 flex items-center justify-center">
                            <Wallet className="w-10 h-10 text-yellow-600" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Zcash Wallet</h3>
                            <p className="text-gray-500 text-sm mb-1">
                                Generate a new wallet or import an existing one
                            </p>
                            <Chip size="sm" variant="flat" color="warning" className="mt-2">
                                Testnet Only
                            </Chip>
                        </div>

                    <div className="flex flex-col gap-4 w-full">
                        <Button
                                className="w-full h-12 font-bold bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg hover:shadow-xl hover:from-yellow-400 hover:to-amber-500 transition-all"
                            onClick={createWallet}
                                startContent={<Wallet className="w-5 h-5" />}
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
                                    placeholder="Enter your 12-word mnemonic phrase..."
                                value={mnemonicInput}
                                onChange={(e) => setMnemonicInput(e.target.value)}
                                    minRows={3}
                                variant="bordered"
                                    classNames={{
                                        inputWrapper: "focus-within:border-yellow-400"
                                    }}
                            />
                            <Button
                                    variant="bordered"
                                    className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                                onClick={() => importWallet(mnemonicInput)}
                                disabled={!mnemonicInput}
                                    startContent={<Shield className="w-4 h-4" />}
                            >
                                Import Wallet
                            </Button>
                        </div>
                    </div>
                    </CardBody>
                </Card>
            ) : (
                <div className="flex flex-col w-full max-w-4xl gap-6">
                    {/* Balance Card */}
                    <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 shadow-sm rounded-3xl">
                        <CardBody className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">Total Balance</p>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-3xl font-bold text-gray-900">
                                            {showBalance ? balance.available : '****'} <span className="text-lg text-yellow-600">tZEC</span>
                                        </h2>
                                        <div className="flex items-center gap-1">
                                            <img src="/assets/zcash_logo.png" alt="ZEC" className="w-6 h-6 rounded-full" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Chip size="sm" variant="flat" color="warning">
                                    Testnet
                                        </Chip>
                                        <Chip size="sm" variant="flat" color="default">
                                            Transparent Address
                                        </Chip>
                            </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <button
                                        onClick={() => setShowBalance(!showBalance)}
                                        className="p-2 rounded-lg hover:bg-yellow-100 transition-colors"
                                    >
                                        {showBalance ? <EyeOff className="w-5 h-5 text-gray-600" /> : <Eye className="w-5 h-5 text-gray-600" />}
                                    </button>
                                    <Button
                                        isIconOnly
                                        variant="light"
                                        size="sm"
                                        onClick={() => {
                                            toast.success("Balance refreshed!");
                                        }}
                                    >
                                        <RefreshCw className="w-5 h-5 text-yellow-600" />
                                    </Button>
                                </div>
                            </div>
                        </CardBody>
                    </Card>

                    {/* Main Content with Tabs */}
                    <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl">
                        <CardBody className="p-0">
                            <Tabs
                                selectedKey={activeTab}
                                onSelectionChange={setActiveTab}
                                aria-label="Zcash Options"
                                color="warning"
                                variant="underlined"
                                classNames={{
                                    tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider px-6",
                                    tab: "max-w-fit px-0 h-12",
                                    tabContent: "group-data-[selected=true]:text-yellow-600 group-data-[selected=true]:font-semibold",
                                    cursor: "bg-gradient-to-r from-yellow-500 to-amber-600",
                                }}
                            >
                                <Tab
                                    key="overview"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <Wallet size={18} />
                                            <span>Overview</span>
                                        </div>
                                    }
                                >
                                    <div className="p-6">
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Wallet Details */}
                                            <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200">
                                                <CardBody className="p-6">
                                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                        <Shield className="w-5 h-5 text-yellow-600" />
                                                        Wallet Details
                                                    </h3>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="text-xs text-gray-600 font-semibold mb-2 block">Address (Transparent)</label>
                                                            <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-yellow-200">
                                                                <code className="text-sm font-mono text-gray-700 flex-1 truncate">{zcashAccount.address}</code>
                                                                <Button
                                                                    isIconOnly
                                                                    size="sm"
                                                                    variant="light"
                                                                    onClick={() => handleCopy(zcashAccount.address)}
                                                                    className="min-w-8"
                                                                >
                                                                    {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-yellow-600" />}
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <div className="flex justify-between items-center mb-2">
                                                                <label className="text-xs text-gray-600 font-semibold">Mnemonic Phrase</label>
                                                                <Button
                                                                    size="sm"
                                                                    variant="light"
                                                                    onClick={() => setShowMnemonic(!showMnemonic)}
                                                                    className="text-xs text-yellow-600"
                                                                >
                                                                    {showMnemonic ? <><EyeOff size={12} className="mr-1" /> Hide</> : <><Eye size={12} className="mr-1" /> Show</>}
                                                                </Button>
                                </div>
                                {showMnemonic && (
                                                                <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-200">
                                                                    <code className="text-sm font-mono text-yellow-900 break-words leading-relaxed">
                                        {zcashAccount.mnemonic}
                                                                    </code>
                                    </div>
                                )}
                            </div>
                                                    </div>
                                                </CardBody>
                                            </Card>

                                            {/* Quick Actions */}
                                            <Card className="bg-white border border-gray-200">
                                                <CardBody className="p-6">
                                                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                                                        <Send className="w-5 h-5 text-yellow-600" />
                                                        Quick Actions
                                                    </h3>

                                                    <div className="space-y-3">
                                                        <Button
                                                            className="w-full justify-start bg-gradient-to-r from-yellow-500 to-amber-600 text-white"
                                                            startContent={<Send className="w-4 h-4" />}
                                                            onClick={() => toast.info("Send feature coming soon")}
                                                        >
                                                            Send tZEC
                                                        </Button>
                                                        <Button
                                                            variant="bordered"
                                                            className="w-full justify-start border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                                                            startContent={<Shield className="w-4 h-4" />}
                                                            onClick={() => toast.info("Shielded address feature coming soon")}
                                                        >
                                                            Generate Shielded Address
                                                        </Button>
                                                        <Button
                                                            variant="bordered"
                                                            className="w-full justify-start border-gray-300 text-gray-700 hover:bg-gray-50"
                                                            startContent={<ExternalLink className="w-4 h-4" />}
                                                            onClick={() => window.open(`https://blockexplorer.one/zcash/testnet/address/${zcashAccount.address}`, '_blank')}
                                                        >
                                                            View on Explorer
                                                        </Button>
                                                    </div>
                                                </CardBody>
                                            </Card>
                                        </div>
                                    </div>
                                </Tab>

                                <Tab
                                    key="wallet"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <Shield size={18} />
                                            <span>Wallet</span>
                                        </div>
                                    }
                                >
                                    <div className="p-6">
                                        <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200">
                                            <CardBody className="p-6">
                                                <h3 className="text-lg font-bold text-gray-900 mb-4">Wallet Information</h3>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-xs text-gray-600 font-semibold mb-2 block">Address (Transparent)</label>
                                                        <div className="flex items-center gap-2 bg-white p-3 rounded-lg border border-yellow-200">
                                                            <code className="text-sm font-mono text-gray-700 flex-1 truncate">{zcashAccount.address}</code>
                                                            <Button
                                                                isIconOnly
                                                                size="sm"
                                                                variant="light"
                                                                onClick={() => handleCopy(zcashAccount.address)}
                                                            >
                                                                {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} className="text-yellow-600" />}
                                    </Button>
                                </div>
                            </div>

                                                    <div>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <label className="text-xs text-gray-600 font-semibold">Mnemonic Phrase</label>
                                                            <Button
                                                                size="sm"
                                                                variant="light"
                                                                onClick={() => setShowMnemonic(!showMnemonic)}
                                                                className="text-xs text-yellow-600"
                                                            >
                                                                {showMnemonic ? <><EyeOff size={12} className="mr-1" /> Hide</> : <><Eye size={12} className="mr-1" /> Show</>}
                                                            </Button>
                                                        </div>
                                                        {showMnemonic && (
                                                            <div className="bg-yellow-100 p-4 rounded-lg border border-yellow-200">
                                                                <code className="text-sm font-mono text-yellow-900 break-words leading-relaxed">
                                                                    {zcashAccount.mnemonic}
                                                                </code>
                                                            </div>
                                                        )}
                                                    </div>

                            <Button
                                color="danger"
                                variant="light"
                                                        className="w-full mt-4"
                                onClick={disconnect}
                            >
                                Disconnect Wallet
                            </Button>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    </div>
                                </Tab>

                                <Tab
                                    key="history"
                                    title={
                                        <div className="flex items-center gap-2">
                                            <History size={18} />
                                            <span>History</span>
                                        </div>
                                    }
                                >
                                    <div className="p-6">
                                        <Card className="bg-white border border-gray-200">
                                            <CardBody className="p-6">
                                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                                    <History className="w-12 h-12 text-gray-300" />
                                                    <p className="text-gray-500 text-center">
                                                        Transaction history will appear here once you start making transactions.
                                                    </p>
                                                </div>
                                            </CardBody>
                                        </Card>
                                    </div>
                                </Tab>
                            </Tabs>
                        </CardBody>
                    </Card>

                    {/* Info Card */}
                    <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200">
                        <CardBody className="p-6">
                            <div className="flex items-start gap-3">
                                <Shield className="w-6 h-6 text-yellow-600 mt-0.5" />
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-2">About Zcash Integration</h3>
                                    <p className="text-gray-600 text-sm">
                                        This integration currently supports transparent addresses via simulation. Shielded address support 
                                        requires a backend service or heavy WASM client. All transactions are simulated on testnet.
                                    </p>
                                </div>
                    </div>
                        </CardBody>
                    </Card>
                </div>
            )}
        </div>
    );
}
