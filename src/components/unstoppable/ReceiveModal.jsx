import { Button, Modal, ModalContent, Select, SelectItem } from "@nextui-org/react";
import { QRCode } from "react-qrcode-logo";
import { Download, Copy } from "lucide-react";
import { useRef, useState } from "react";
import toast from "react-hot-toast";

const CHAINS = [
    { key: "zcash", label: "Zcash (ZEC)", color: "#f59e0b" },
    { key: "solana", label: "Solana (SOL)", color: "#a78bfa" },
    { key: "ethereum", label: "Ethereum (ETH)", color: "#60a5fa" },
    { key: "mina", label: "Mina", color: "#34d399" },
    { key: "aztec", label: "Aztec", color: "#3b82f6" },
];

export default function ReceiveModal({ isOpen, onClose, wallet }) {
    const [selectedChain, setSelectedChain] = useState("zcash");
    const qrRef = useRef(null);

    const getAddress = () => {
        switch (selectedChain) {
            case "zcash":
                return wallet?.zcashAddress || "";
            case "solana":
                return wallet?.solanaPublicKey || "";
            case "ethereum":
                return wallet?.ethereumAddress || "";
            case "mina":
                return wallet?.minaPublicKey || "";
            case "aztec":
                return wallet?.aztecAddress || "";
            default:
                return "";
        }
    };

    const handleCopy = () => {
        const address = getAddress();
        navigator.clipboard.writeText(address);
        toast.success("Address copied to clipboard!");
    };

    const handleDownload = async () => {
        try {
            await qrRef.current.download("png", {
                name: `${selectedChain}-address-qr`,
            });
            toast.success("QR code downloaded!");
        } catch (error) {
            console.error("Error downloading QR code:", error);
            toast.error("Failed to download QR code");
        }
    };

    if (!wallet) return null;

    const address = getAddress();

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md" placement="center">
            <ModalContent className="p-6">
                <div className="flex flex-col items-center gap-4 mt-2">
                    <h2 className="text-2xl font-bold" style={{ color: '#0d08e3' }}>
                        Receive Crypto
                    </h2>
                    <p className="text-gray-600 text-sm text-center">
                        Select a blockchain and share your address or QR code
                    </p>

                    <Select
                        label="Select Blockchain"
                        selectedKeys={[selectedChain]}
                        onChange={(e) => setSelectedChain(e.target.value)}
                        className="w-full"
                        variant="bordered"
                    >
                        {CHAINS.map((chain) => (
                            <SelectItem key={chain.key} value={chain.key}>
                                {chain.label}
                            </SelectItem>
                        ))}
                    </Select>

                    <div className="w-full bg-gray-50 rounded-2xl p-4">
                        <div className="bg-white p-4 rounded-xl">
                            <QRCode
                                ref={qrRef}
                                value={address}
                                qrStyle="dots"
                                size={220}
                                logoImage="/favicon.ico"
                                logoWidth={40}
                                logoHeight={40}
                                style={{ width: "100%", height: "auto" }}
                            />
                        </div>

                        <div className="mt-3 flex items-center gap-2 p-3 bg-white rounded-lg">
                            <p className="text-sm font-mono text-gray-800 flex-1 truncate">
                                {address}
                            </p>
                            <button
                                onClick={handleCopy}
                                className="p-2 hover:bg-gray-100 rounded transition-colors"
                            >
                                <Copy className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                    </div>

                    <div className="flex w-full gap-3 mt-2">
                        <Button
                            onClick={handleDownload}
                            className="flex-1 h-12 bg-white border-2 text-gray-700"
                            style={{ borderColor: '#0d08e3' }}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download QR
                        </Button>
                        <Button
                            onClick={handleCopy}
                            className="flex-1 h-12 text-white"
                            style={{ backgroundColor: '#0d08e3' }}
                        >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Address
                        </Button>
                    </div>
                </div>
            </ModalContent>
        </Modal>
    );
}
