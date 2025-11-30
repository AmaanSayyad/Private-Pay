import { useState } from "react";
import { Button, Input } from "@nextui-org/react";
import { useAptos } from "../../providers/AptosProvider";
import { sendAptTransfer } from "../../lib/aptos";
import { recordPayment, getUserByUsername, getPaymentLinkByAlias } from "../../lib/supabase";
import toast from "react-hot-toast";
import { usePhoton } from "../../providers/PhotonProvider.jsx";
import SuccessDialog from "../dialogs/SuccessDialog.jsx";

const TREASURY_WALLET = import.meta.env.VITE_TREASURY_WALLET_ADDRESS;

export default function AptosSendToUsername() {
  const { account, isConnected } = useAptos();
  const { trackRewardedEvent } = usePhoton();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [amount, setAmount] = useState("");
  const [openSuccess, setOpenSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  const handleSendPayment = async () => {
    if (!username || !amount) {
      toast.error("Please fill all fields");
      return;
    }

    if (!isConnected || !account) {
      toast.error("Please connect your Aptos wallet first");
      return;
    }

    if (!TREASURY_WALLET) {
      toast.error("Treasury wallet not configured");
      return;
    }

    setIsLoading(true);
    try {
      // Check if it's a username or alias
      let recipientUsername = username;
      
      // First try to find as username
      let recipient = await getUserByUsername(username);
      
      // If not found, try to find as payment link alias
      if (!recipient) {
        const { getPaymentLinkByAlias } = await import("../../lib/supabase");
        const paymentLink = await getPaymentLinkByAlias(username);
        
        if (paymentLink) {
          recipientUsername = paymentLink.username;
          recipient = await getUserByUsername(recipientUsername);
        }
      }
      
      if (!recipient) {
        toast.error(`Username or payment link ${username} not found`);
        setIsLoading(false);
        return;
      }

      // Send APT to treasury wallet
      const result = await sendAptTransfer({
        accountAddress: account,
        recipientAddress: TREASURY_WALLET,
        amount: parseFloat(amount),
        isTestnet: true,
      });

      if (!result.success) {
        throw new Error("Transaction failed");
      }

      // Record payment in Supabase (use the actual username, not alias)
      await recordPayment(
        account,
        recipientUsername,
        parseFloat(amount),
        result.hash
      );

      // Trigger balance update event so chart updates
      window.dispatchEvent(new Event('balance-updated'));

      const shortHash = result.hash.slice(0, 6) + "..." + result.hash.slice(-4);
      
      toast.success(
        (t) => (
          <div 
            onClick={() => {
              window.open(result.explorerUrl, '_blank');
              toast.dismiss(t.id);
            }}
            className="cursor-pointer hover:underline"
          >
            Payment sent to {username}.privatepay.me! TX: {shortHash} (click to view)
          </div>
        ),
        { duration: 8000 }
      );

      // Track rewarded event for successful username payment
      trackRewardedEvent("aptos_username_payment_sent", {
        amount: parseFloat(amount),
        tokenSymbol: "APT",
        recipientUsername: username,
        recipientActualUsername: recipientUsername,
        txHash: result.hash.slice(0, 10),
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
        destinationAddress: `${username}.privatepay.me`,
        txHashes: [result.hash],
      };
      setSuccessData(successDataObj);
      setOpenSuccess(true);

      // Reset form
      setUsername("");
      setAmount("");
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error.message || "Failed to send payment");
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
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <p className="text-sm text-blue-800">
          💡 Send APT to any .privatepay.me username. Funds go to treasury and recipient can withdraw anytime.
        </p>
      </div>

      <Input
        label="Recipient Username or Alias"
        placeholder="username or alias"
        value={username}
        onChange={(e) => setUsername(e.target.value.toLowerCase())}
        description="Enter username or payment link alias"
        endContent={
          <span className="text-sm text-gray-500">.privatepay.me</span>
        }
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
        description="Amount in APT"
        classNames={{
          input: "rounded-full",
          inputWrapper: "rounded-full",
        }}
      />

      <Button
        color="primary"
        onClick={handleSendPayment}
        isLoading={isLoading}
        disabled={!username || !amount}
        className="w-full h-14 rounded-full"
        size="lg"
      >
        Send to {username || "username"}.privatepay.me
      </Button>
    </div>
    </>
  );
}
