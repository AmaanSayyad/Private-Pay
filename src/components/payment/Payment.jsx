import { Button, Input, Spinner } from "@nextui-org/react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useLoaderData, useParams } from "react-router-dom";
import { useAptos } from "../../providers/AptosProvider.jsx";
import { getPaymentLinkByAlias, getUserByUsername, recordPayment } from "../../lib/supabase.js";
import { sendAptTransfer } from "../../lib/aptos.js";
import SuccessDialog from "../dialogs/SuccessDialog.jsx";
import { Icons } from "../shared/Icons.jsx";

const TREASURY_WALLET = import.meta.env.VITE_TREASURY_WALLET_ADDRESS;

export default function Payment() {
  const loaderData = useLoaderData();
  const { alias_url } = useParams();
  const { account, isConnected, connect, signAndSubmitTransaction } = useAptos();

  const alias = loaderData ? loaderData.subdomain : alias_url;

  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [paymentLinkData, setPaymentLinkData] = useState(null);
  const [recipientData, setRecipientData] = useState(null);
  const [amount, setAmount] = useState("");
  const [openSuccess, setOpenSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState(null);

  // Fetch payment link data from Supabase
  useEffect(() => {
    async function fetchPaymentLink() {
      if (!alias) {
        setError("No payment link alias provided");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // First, try to get payment link by alias
        const paymentLink = await getPaymentLinkByAlias(alias);

        if (paymentLink) {
          setPaymentLinkData(paymentLink);

          // Get recipient user data
          const recipient = await getUserByUsername(paymentLink.username);
          setRecipientData(recipient);
        } else {
          // If not found as payment link, try as username
          const recipient = await getUserByUsername(alias);
          if (recipient) {
            setRecipientData(recipient);
          } else {
            setError("Payment link not found. Please check the URL and try again.");
          }
        }
      } catch (error) {
        console.error("Error fetching payment link:", error);
        setError("Failed to load payment link. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPaymentLink();
  }, [alias]);

  const handleConnectWallet = async () => {
    try {
      await connect();
      toast.success("Wallet connected successfully!");
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast.error(error.message || "Failed to connect wallet");
    }
  };

  const handleSendPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
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

    const recipientUsername = paymentLinkData?.username || alias;

    if (!recipientUsername) {
      toast.error("Recipient not found");
      return;
    }

    setIsSending(true);
    try {
      // Send APT to treasury wallet
      const result = await sendAptTransfer({
        signer: signAndSubmitTransaction,
        accountAddress: account,
        recipientAddress: TREASURY_WALLET,
        amount: parseFloat(amount),
        isTestnet: true,
      });

      if (!result.success) {
        throw new Error("Transaction failed");
      }

      // Record payment in Supabase
      await recordPayment(
        account,
        recipientUsername,
        parseFloat(amount),
        result.hash
      );

      // Trigger balance update event
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
            Payment sent to {alias}.privatepay.me! TX: {shortHash} (click to view)
          </div>
        ),
        { duration: 8000 }
      );

      // Show success dialog
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
        destinationAddress: `${alias}.privatepay.me`,
        txHashes: [result.hash],
      };
      setSuccessData(successDataObj);
      setOpenSuccess(true);

      // Reset form
      setAmount("");
    } catch (error) {
      console.error("Payment error:", error);
      toast.error(error.message || "Failed to send payment");
    } finally {
      setIsSending(false);
    }
  };

  const onCopy = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard", {
      id: "copy",
      duration: 1000,
      position: "bottom-center",
    });
  };

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

      <div className="flex flex-col w-full max-w-md h-full max-h-screen items-center justify-center gap-5">
        <div className="w-36">
          <img
            src="/assets/squidl-only.svg"
            alt="squidl-logo"
            className="w-full h-full object-contain"
          />
        </div>

        {/* Content Rendering */}
        <div className="w-full h-full flex items-center justify-center">
          {/* Loading State */}
          {isLoading && (
            <div className="my-10 flex flex-col items-center">
              <Spinner color="primary" size="lg" />
              <div className="mt-5 animate-pulse text-gray-600">Loading payment link...</div>
            </div>
          )}

          {/* Error State */}
          {!isLoading && error && (
            <div className="text-center max-w-[20rem] bg-red-50 border border-red-200 rounded-2xl p-6">
              <p className="text-red-800 font-medium">{error}</p>
              <p className="text-red-600 text-sm mt-2">Please check the link and try again.</p>
            </div>
          )}

          {/* Success State - Payment Form */}
          {!isLoading && !error && (paymentLinkData || recipientData) && (
            <div className="bg-white rounded-[32px] py-9 px-10 md:px-20 flex flex-col items-center justify-center w-full border border-gray-200 shadow-lg">
              <h1 className="font-medium text-xl mb-2 text-center">
                Send to{" "}
                <span className="font-semibold text-primary">
                  {alias}
                </span>
              </h1>

              <p className="text-sm text-gray-500 mb-6">
                {alias}.privatepay.me
                {paymentLinkData?.username && paymentLinkData.username !== alias && (
                  <span className="text-xs text-gray-400 ml-2">
                    ({paymentLinkData.username})
                  </span>
                )}
              </p>

              {/* Wallet Connection */}
              {!isConnected ? (
                <div className="w-full flex flex-col gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <p className="text-sm text-blue-800 text-center">
                      Connect your Aptos wallet (Petra) to send a payment
                    </p>
                  </div>
                  <Button
                    onClick={handleConnectWallet}
                    className="bg-primary text-white font-bold py-5 px-6 h-16 w-full rounded-[32px]"
                    size="lg"
                  >
                    Connect Aptos Wallet
                  </Button>
                </div>
              ) : (
                <div className="w-full flex flex-col gap-4">
                  {/* Connected Wallet Info */}
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-800 font-medium">Wallet Connected</p>
                        <p className="text-xs text-green-600 mt-1">
                          {account?.slice(0, 6)}...{account?.slice(-4)}
                        </p>
                      </div>
                      <svg className="text-green-600 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>

                  {/* Amount Input */}
                  <Input
                    label="Amount (APT)"
                    type="number"
                    placeholder="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    description="Enter the amount you want to send"
                    classNames={{
                      input: "text-lg",
                      inputWrapper: "h-14",
                    }}
                    min="0"
                    step="0.00000001"
                  />

                  {/* Send Button */}
                  <Button
                    onClick={handleSendPayment}
                    isLoading={isSending}
                    disabled={!amount || parseFloat(amount) <= 0}
                    className="bg-primary text-white font-bold py-5 px-6 h-16 w-full rounded-[32px]"
                    size="lg"
                  >
                    {isSending ? "Sending..." : `Send ${amount || "0"} APT`}
                  </Button>

                  {/* Info */}
                  <p className="text-xs text-gray-500 text-center mt-2">
                    Funds will be sent to the treasury wallet. The recipient can withdraw anytime.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
