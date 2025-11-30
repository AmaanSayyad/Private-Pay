import { useState } from "react";
import { Button, Input, Spinner } from "@nextui-org/react";
import { useAptos } from "../../providers/AptosProvider";
import { sendAptosStealthPayment, getAptosClient, getAptosMetaAddressFromChain } from "../../lib/aptos";
import { generateStealthAddress, generateEphemeralKeyPair, validatePublicKey, hexToBytes } from "../../lib/aptos/stealthAddress";
import toast from "react-hot-toast";
import { usePhoton } from "../../providers/PhotonProvider.jsx";
import SuccessDialog from "../dialogs/SuccessDialog.jsx";

/**
 * Aptos Send Stealth Payment Component
 * Sends stealth payments on Aptos network
 */
export default function AptosSendPayment({ recipientAddress, recipientMetaIndex = 0 }) {
  const { account, isConnected } = useAptos();
  const { trackRewardedEvent } = usePhoton();
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [amount, setAmount] = useState("");
  const [stealthAddress, setStealthAddress] = useState("");
  const [ephemeralPubKey, setEphemeralPubKey] = useState("");
  const [recipientSpendPubKey, setRecipientSpendPubKey] = useState("");
  const [recipientViewingPubKey, setRecipientViewingPubKey] = useState("");
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [openSuccess, setOpenSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);


  const handleGenerateStealthAddress = async () => {
    if (!recipientSpendPubKey || !recipientViewingPubKey) {
      toast.error("Please provide both spend and viewing public keys");
      return;
    }

    // Trim and validate input
    const spendKey = recipientSpendPubKey.trim();
    const viewingKey = recipientViewingPubKey.trim();

    if (!spendKey || !viewingKey) {
      toast.error("Please provide both spend and viewing public keys");
      return;
    }

    // Validate public keys
    const spendValidation = validatePublicKey(spendKey);
    const viewingValidation = validatePublicKey(viewingKey);

    if (!spendValidation.valid) {
      toast.error(`Invalid spend public key: ${spendValidation.error}`);
      console.error("Spend key validation failed:", spendKey, spendValidation);
      return;
    }

    if (!viewingValidation.valid) {
      toast.error(`Invalid viewing public key: ${viewingValidation.error}`);
      console.error("Viewing key validation failed:", viewingKey, viewingValidation);
      return;
    }

    setIsGenerating(true);
    try {
      console.log("Generating ephemeral key pair...");
      // Generate ephemeral key pair
      const ephemeralKeyPair = generateEphemeralKeyPair();
      console.log("Ephemeral key pair generated:", {
        privateKey: ephemeralKeyPair.privateKey.substring(0, 20) + "...",
        publicKey: ephemeralKeyPair.publicKey.substring(0, 20) + "..."
      });

      const ephemeralPrivKey = hexToBytes(ephemeralKeyPair.privateKey);
      console.log("Ephemeral private key converted to bytes:", ephemeralPrivKey.length, "bytes");

      console.log("Generating stealth address with:", {
        spendPubKey: spendKey.substring(0, 20) + "...",
        viewingPubKey: viewingKey.substring(0, 20) + "...",
        ephemeralPrivKeyLength: ephemeralPrivKey.length
      });

      // Generate stealth address
      const result = generateStealthAddress(
        spendKey,
        viewingKey,
        ephemeralPrivKey,
        0 // k = 0
      );

      console.log("Stealth address generated successfully:", {
        stealthAddress: result.stealthAddress,
        ephemeralPubKey: result.ephemeralPubKey.substring(0, 20) + "..."
      });

      setStealthAddress(result.stealthAddress);
      setEphemeralPubKey(result.ephemeralPubKey);
      setShowGenerateForm(false);

      toast.success("Stealth address generated successfully!", {
        duration: 5000,
      });
    } catch (error) {
      console.error("Error generating stealth address:", error);
      const errorMessage = error?.message || "Unknown error occurred";
      toast.error(`Failed to generate stealth address: ${errorMessage}`, {
        duration: 8000,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendPayment = async () => {
    console.log("handleSendPayment called", {
      stealthAddress,
      ephemeralPubKey,
      amount,
      isConnected,
      account
    });

    if (!stealthAddress || !ephemeralPubKey || !amount) {
      toast.error("Please fill all fields");
      return;
    }

    if (!isConnected || !account) {
      toast.error("Please connect your Aptos wallet first");
      return;
    }

    setIsLoading(true);
    try {
      const amountOctas = parseFloat(amount) * 100000000; // Convert APT to octas

      console.log("Sending payment with:", {
        account,
        recipientAddress: recipientAddress || account,
        recipientMetaIndex,
        amount: amountOctas,
        ephemeralPubKey,
        stealthAddress,
      });

      const result = await sendAptosStealthPayment({
        accountAddress: account,
        recipientAddress: recipientAddress || account,
        recipientMetaIndex,
        amount: amountOctas,
        k: 0,
        ephemeralPubKey,
        stealthAddress,
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
              Payment sent! TX: {shortHash} (click to view)
            </div>
          ),
          {
            duration: 8000,
          }
        );
      } else {
        toast.success("Payment sent successfully!", { duration: 5000 });
      }

      // Track rewarded event for successful stealth payment
      trackRewardedEvent("aptos_stealth_payment_sent", {
        amount: amountOctas,
        tokenSymbol: "APT",
        recipientAddress: recipientAddress?.slice(0, 10) || "self",
        stealthAddress: stealthAddress.slice(0, 10),
        txHash: txHash.slice(0, 10),
      }, account);

      // Show success dialog with spy video
      const successDataObj = {
        type: "PRIVATE_TRANSFER",
        amount: parseFloat(amount),
        chain: { name: "Aptos", id: "aptos" },
        token: { 
          nativeToken: { 
            symbol: "APT", 
            logo: "/assets/aptos-logo.png" 
          } 
        },
        destinationAddress: stealthAddress,
        txHashes: [txHash],
      };
      setSuccessData(successDataObj);
      setOpenSuccess(true);

      // Reset form
      setAmount("");
      setStealthAddress("");
      setEphemeralPubKey("");
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error.message || "Failed to send payment. Check console for details.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please connect your Aptos wallet first
      </div>
    );
  }

  return (
    <>
      <SuccessDialog
        open={openSuccess}
        setOpen={setOpenSuccess}
        botButtonHandler={() => {
          setOpenSuccess(false);
        }}
        botButtonTitle={"Done"}
        successData={successData}
      />
    <div className="flex flex-col gap-4 w-full">

      <div className="flex flex-col gap-4">
        <Input
          label="Recipient Address"
          value={recipientAddress || account}
          disabled
          description="Aptos account address"
          classNames={{
            input: "rounded-full",
            inputWrapper: "rounded-full",
          }}
        />

        <Input
          label="Amount (APT)"
          type="number"
          placeholder="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          description="Amount in APT (will be converted to octas)"
          classNames={{
            input: "rounded-full",
            inputWrapper: "rounded-full",
          }}
        />

        {/* Generate Stealth Address Section */}
        {!stealthAddress && (
          <div className="p-4 border rounded-3xl bg-neutral-50">
            {!showGenerateForm ? (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-gray-600">
                  Generate stealth address from recipient's meta address
                </p>
                <Button
                  color="secondary"
                  variant="bordered"
                  onClick={() => setShowGenerateForm(true)}
                  className="w-full h-14 rounded-full"
                  size="lg"
                >
                  Generate Stealth Address
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <h3 className="text-lg font-semibold">Generate Stealth Address</h3>
                
                <Input
                  label="Recipient Spend Public Key"
                  placeholder="0x..."
                  value={recipientSpendPubKey}
                  onChange={(e) => setRecipientSpendPubKey(e.target.value)}
                  description="33 bytes compressed secp256k1 public key"
                  classNames={{
                    input: "rounded-full",
                    inputWrapper: "rounded-full",
                  }}
                />

                <Input
                  label="Recipient Viewing Public Key"
                  placeholder="0x..."
                  value={recipientViewingPubKey}
                  onChange={(e) => setRecipientViewingPubKey(e.target.value)}
                  description="33 bytes compressed secp256k1 public key"
                  classNames={{
                    input: "rounded-full",
                    inputWrapper: "rounded-full",
                  }}
                />

                <div className="flex gap-2">
                  <Button
                    color="primary"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Generate button clicked!", {
                        spendKey: recipientSpendPubKey,
                        viewingKey: recipientViewingPubKey,
                        isGenerating
                      });
                      handleGenerateStealthAddress();
                    }}
                    isLoading={isGenerating}
                    disabled={!recipientSpendPubKey || !recipientViewingPubKey || isGenerating}
                    className="flex-1 h-14 rounded-full"
                    size="lg"
                  >
                    Generate
                  </Button>
                  <Button
                    color="default"
                    variant="light"
                    onClick={() => {
                      setShowGenerateForm(false);
                      setRecipientSpendPubKey("");
                      setRecipientViewingPubKey("");
                    }}
                    className="h-14 rounded-full"
                    size="lg"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual Input (if stealth address already generated) */}
        {stealthAddress && (
          <>
            <Input
              label="Stealth Address"
              placeholder="0x..."
              value={stealthAddress}
              onChange={(e) => setStealthAddress(e.target.value)}
              description="Generated stealth address"
              classNames={{
                input: "rounded-full",
                inputWrapper: "rounded-full",
              }}
              endContent={
                <Button
                  size="sm"
                  variant="light"
                  onClick={() => {
                    setStealthAddress("");
                    setEphemeralPubKey("");
                  }}
                  className="rounded-full"
                >
                  Clear
                </Button>
              }
            />

            <Input
              label="Ephemeral Public Key"
              placeholder="0x..."
              value={ephemeralPubKey}
              onChange={(e) => setEphemeralPubKey(e.target.value)}
              description="Ephemeral public key"
              classNames={{
                input: "rounded-full",
                inputWrapper: "rounded-full",
              }}
            />
          </>
        )}

        <Button
          color="primary"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log("Send Stealth Payment button clicked!", {
              stealthAddress,
              ephemeralPubKey,
              amount,
              isLoading,
              isConnected,
              account
            });
            handleSendPayment();
          }}
          isLoading={isLoading}
          disabled={!stealthAddress || !ephemeralPubKey || !amount || isLoading}
          className="w-full h-14 rounded-full"
          size="lg"
        >
          Send Stealth Payment
        </Button>
      </div>
    </div>
    </>
  );
}


