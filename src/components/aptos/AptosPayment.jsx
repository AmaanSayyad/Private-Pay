import { useState } from "react";
import { Button, Input, Spinner, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from "@nextui-org/react";
import { useAptos } from "../../providers/AptosProvider";
import { registerAptosMetaAddress } from "../../lib/aptos";
import { generateMetaAddressKeys } from "../../lib/aptos/stealthAddress";
import toast from "react-hot-toast";
import { Copy, Check } from "lucide-react";

/**
 * Aptos Stealth Payment Component
 * Handles Aptos wallet connection and stealth payments
 */
export default function AptosPayment() {
  const { account, isConnected, connect, disconnect } = useAptos();
  const [isLoading, setIsLoading] = useState(false);
  const [spendPubKey, setSpendPubKey] = useState("");
  const [viewingPubKey, setViewingPubKey] = useState("");
  const [isRegistered, setIsRegistered] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState(null);
  const [copiedField, setCopiedField] = useState(null);
  const { isOpen, onOpen, onClose } = useDisclosure();

  const handleConnect = async () => {
    try {
      await connect();
      toast.success("Aptos wallet connected!");
    } catch (error) {
      toast.error("Failed to connect Aptos wallet");
      console.error(error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      toast.success("Aptos wallet disconnected");
    } catch (error) {
      console.error(error);
    }
  };

  const handleGenerateKeys = () => {
    try {
      const keys = generateMetaAddressKeys();
      setGeneratedKeys(keys);
      setSpendPubKey(`0x${keys.spend.publicKey}`);
      setViewingPubKey(`0x${keys.viewing.publicKey}`);
      onOpen();
      toast.success("Keys generated successfully! Please save your private keys securely.");
    } catch (error) {
      toast.error("Failed to generate keys");
      console.error(error);
    }
  };

  const handleCopy = async (text, field) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast.error("Failed to copy");
      console.error(error);
    }
  };

  const handleRegisterMetaAddress = async () => {
    if (!spendPubKey || !viewingPubKey) {
      toast.error("Please provide both spend and viewing public keys");
      return;
    }

    setIsLoading(true);
    try {
      // Register on-chain (directly to Aptos blockchain)
      const result = await registerAptosMetaAddress({
        accountAddress: account,
        spendPubKey,
        viewingPubKey,
        isTestnet: true,
      });

      // Extract transaction hash for display
      const txHash = result.hash || result.explorerUrl?.split('/txn/')[1]?.split('?')[0] || '';
      const shortHash = txHash.length > 10 ? `${txHash.slice(0, 6)}...${txHash.slice(-4)}` : txHash;
      
      if (result.explorerUrl) {
        const explorerUrl = result.explorerUrl;
        toast.success(
          (t) => (
            <div 
              onClick={() => {
                window.open(explorerUrl, '_blank');
                toast.dismiss(t.id);
              }}
              className="cursor-pointer hover:underline"
            >
              Meta address registered! TX: {shortHash} (click to view)
            </div>
          ),
          {
            duration: 8000,
          }
        );
      } else {
        toast.success("Meta address registered!", { duration: 5000 });
      }
      
      setIsRegistered(true);
    } catch (error) {
      toast.error("Failed to register meta address");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Wallet Connection */}
      <div className="flex flex-col gap-4">
        {!isConnected ? (
          <Button
            color="primary"
            onClick={handleConnect}
            className="w-full h-14 rounded-full"
            size="lg"
          >
            Connect Aptos Wallet
          </Button>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="bg-white rounded-full w-full h-14 flex items-center justify-between pl-6 pr-2 text-black">
              <p className="text-sm font-medium">
                {account?.slice(0, 10)}...{account?.slice(-8)}
              </p>
              <Button
                color="danger"
                variant="light"
                onClick={handleDisconnect}
                size="sm"
                className="rounded-full"
              >
                Disconnect
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Generate Keys Section - Always visible */}
      {!isRegistered && (
        <div className="flex flex-col gap-4 p-4 bg-primary-50 rounded-3xl border border-primary-200">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-neutral-800">Step 1: Generate Keys</h3>
            </div>
            <p className="text-sm text-neutral-600">
              Generate your spend and viewing public keys. You can generate keys before connecting your wallet.
            </p>
            <Button
              color="primary"
              variant="solid"
              onClick={handleGenerateKeys}
              className="w-full h-12 rounded-full font-semibold"
              size="lg"
            >
              Generate Keys
            </Button>
          </div>
        </div>
      )}

      {/* Meta Address Registration */}
      {isConnected && !isRegistered && (
        <div className="flex flex-col gap-4 p-4 bg-neutral-50 rounded-3xl border border-neutral-200">
          <h3 className="text-lg font-semibold text-neutral-800">Step 2: Register Meta Address</h3>
          <p className="text-sm text-neutral-600">
            Connect your wallet and register your meta address on the blockchain.
          </p>
          
          <Input
            label="Spend Public Key"
            placeholder="0x..."
            value={spendPubKey}
            onChange={(e) => setSpendPubKey(e.target.value)}
            description="33 bytes compressed secp256k1 public key"
            classNames={{
              input: "rounded-full",
              inputWrapper: "rounded-full",
            }}
            endContent={
              spendPubKey && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onClick={() => handleCopy(spendPubKey, "spendPub")}
                  className="rounded-full"
                >
                  {copiedField === "spendPub" ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              )
            }
          />
          
          <Input
            label="Viewing Public Key"
            placeholder="0x..."
            value={viewingPubKey}
            onChange={(e) => setViewingPubKey(e.target.value)}
            description="33 bytes compressed secp256k1 public key"
            classNames={{
              input: "rounded-full",
              inputWrapper: "rounded-full",
            }}
            endContent={
              viewingPubKey && (
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  onClick={() => handleCopy(viewingPubKey, "viewingPub")}
                  className="rounded-full"
                >
                  {copiedField === "viewingPub" ? (
                    <Check className="size-4 text-green-500" />
                  ) : (
                    <Copy className="size-4" />
                  )}
                </Button>
              )
            }
          />

          <Button
            color="primary"
            onClick={handleRegisterMetaAddress}
            isLoading={isLoading}
            disabled={!spendPubKey || !viewingPubKey}
            className="w-full h-14 rounded-full"
            size="lg"
          >
            Register Meta Address
          </Button>
        </div>
      )}

      {isRegistered && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-3xl">
          <p className="text-green-800 font-medium">Meta address registered successfully!</p>
          <p className="text-sm text-green-600 mt-2">
            You can now receive stealth payments on Aptos.
          </p>
        </div>
      )}

      {/* Generated Keys Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h2 className="text-xl font-bold">Generated Keys</h2>
            <p className="text-sm text-gray-500 font-normal">
              ⚠️ IMPORTANT: Save these private keys securely! You will need them to access your stealth payments.
            </p>
          </ModalHeader>
          <ModalBody>
            {generatedKeys && (
              <div className="flex flex-col gap-4">
                {/* Spend Keys */}
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold text-sm text-gray-700">Spend Keys</h3>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        label="Spend Private Key"
                        value={`0x${generatedKeys.spend.privateKey}`}
                        readOnly
                        classNames={{
                          input: "rounded-full font-mono text-xs",
                          inputWrapper: "rounded-full",
                        }}
                        endContent={
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onClick={() => handleCopy(`0x${generatedKeys.spend.privateKey}`, "spendPriv")}
                            className="rounded-full"
                          >
                            {copiedField === "spendPriv" ? (
                              <Check className="size-4 text-green-500" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        label="Spend Public Key"
                        value={`0x${generatedKeys.spend.publicKey}`}
                        readOnly
                        classNames={{
                          input: "rounded-full font-mono text-xs",
                          inputWrapper: "rounded-full",
                        }}
                        endContent={
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onClick={() => handleCopy(`0x${generatedKeys.spend.publicKey}`, "spendPubModal")}
                            className="rounded-full"
                          >
                            {copiedField === "spendPubModal" ? (
                              <Check className="size-4 text-green-500" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Viewing Keys */}
                <div className="flex flex-col gap-2">
                  <h3 className="font-semibold text-sm text-gray-700">Viewing Keys</h3>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        label="Viewing Private Key"
                        value={`0x${generatedKeys.viewing.privateKey}`}
                        readOnly
                        classNames={{
                          input: "rounded-full font-mono text-xs",
                          inputWrapper: "rounded-full",
                        }}
                        endContent={
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onClick={() => handleCopy(`0x${generatedKeys.viewing.privateKey}`, "viewingPriv")}
                            className="rounded-full"
                          >
                            {copiedField === "viewingPriv" ? (
                              <Check className="size-4 text-green-500" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        label="Viewing Public Key"
                        value={`0x${generatedKeys.viewing.publicKey}`}
                        readOnly
                        classNames={{
                          input: "rounded-full font-mono text-xs",
                          inputWrapper: "rounded-full",
                        }}
                        endContent={
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onClick={() => handleCopy(`0x${generatedKeys.viewing.publicKey}`, "viewingPubModal")}
                            className="rounded-full"
                          >
                            {copiedField === "viewingPubModal" ? (
                              <Check className="size-4 text-green-500" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </Button>
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-2xl">
                  <p className="text-xs text-yellow-800">
                    <strong>Security Warning:</strong> Private keys are shown only once. Make sure to save them in a secure location. 
                    If you lose your private keys, you will not be able to access funds sent to your stealth addresses.
                  </p>
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button color="primary" onClick={onClose} className="rounded-full">
              I've Saved My Keys
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}


