import { useState, useEffect } from "react";
import { Button, Input } from "@nextui-org/react";
import { useAptos } from "../../providers/AptosProvider";
import { getUserBalance } from "../../lib/supabase";
import toast from "react-hot-toast";
import { Icons } from "../shared/Icons";
import { useNavigate } from "react-router-dom";
import SuccessDialog from "../dialogs/SuccessDialog.jsx";

export function AptosWithdraw() {
  const { account, isConnected, connect } = useAptos();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [amount, setAmount] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [balance, setBalance] = useState(0);
  const [username, setUsername] = useState("");
  const [openSuccess, setOpenSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);

  useEffect(() => {
    async function loadBalance() {
      if (account) {
        setIsLoadingBalance(true);
        const savedUsername = localStorage.getItem(`aptos_username_${account}`);
        const currentUsername = savedUsername || account.slice(2, 8);
        setUsername(currentUsername);

        try {
          const balanceData = await getUserBalance(currentUsername);
          setBalance(balanceData?.available_balance || 0);
        } catch (error) {
          console.error('Error loading balance:', error);
          setBalance(0);
        } finally {
          setIsLoadingBalance(false);
        }
      }
    }

    loadBalance();

    // Listen for balance updates
    const handleBalanceUpdate = () => {
      loadBalance();
    };

    window.addEventListener('balance-updated', handleBalanceUpdate);

    return () => {
      window.removeEventListener('balance-updated', handleBalanceUpdate);
    };
  }, [account]);

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected) {
      toast.error("Please connect your Aptos wallet first");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (parseFloat(amount) > balance) {
      toast.error("Insufficient balance");
      return;
    }

    if (!destinationAddress) {
      toast.error("Please enter a destination address");
      return;
    }

    setIsLoading(true);
    try {
      toast.loading("Processing withdrawal...", { id: "withdraw" });

      // Import Aptos SDK
      const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = await import("@aptos-labs/ts-sdk");
      const { withdrawFunds } = await import("../../lib/supabase");

      // Treasury private key (should be in env)
      const treasuryPrivateKeyHex = import.meta.env.VITE_TREASURY_PRIVATE_KEY;
      
      if (!treasuryPrivateKeyHex) {
        throw new Error("Treasury private key not configured");
      }

      // Initialize Aptos client with custom configuration
      const config = new AptosConfig({ 
        network: Network.TESTNET,
        // Add custom headers to identify our app
        clientConfig: {
          headers: {
            "x-aptos-client": "privatepay-app"
          }
        }
      });
      const aptos = new Aptos(config);

      // Create treasury account from private key
      const privateKey = new Ed25519PrivateKey(treasuryPrivateKeyHex);
      const treasuryAccount = Account.fromPrivateKey({ privateKey });

      console.log("Treasury address:", treasuryAccount.accountAddress.toString());

      // Convert amount to octas (1 APT = 100000000 octas)
      const amountInOctas = Math.floor(parseFloat(amount) * 100_000_000);

      // Helper function to retry with exponential backoff
      const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn();
          } catch (error) {
            const isRateLimitError = 
              error?.message?.includes('429') || 
              error?.message?.includes('Too Many Requests') ||
              error?.message?.includes('rate limit') ||
              (error?.message?.includes('Unexpected token') && error?.message?.includes('Per anonym'));
            
            if (isRateLimitError && i < maxRetries - 1) {
              const delay = baseDelay * Math.pow(2, i);
              console.warn(`⚠️ Rate limited by Aptos API. Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
              toast.loading(`Rate limited. Retrying in ${delay / 1000}s...`, { id: "withdraw" });
              await new Promise(resolve => setTimeout(resolve, delay));
              continue;
            }
            throw error;
          }
        }
      };

      // Build transaction with retry logic
      toast.loading("Building transaction...", { id: "withdraw" });
      const transaction = await retryWithBackoff(async () => {
        return await aptos.transaction.build.simple({
          sender: treasuryAccount.accountAddress,
          data: {
            function: "0x1::coin::transfer",
            typeArguments: ["0x1::aptos_coin::AptosCoin"],
            functionArguments: [destinationAddress, amountInOctas],
          },
        });
      });

      // Sign and submit transaction with retry logic
      toast.loading("Submitting transaction...", { id: "withdraw" });
      const committedTxn = await retryWithBackoff(async () => {
        return await aptos.signAndSubmitTransaction({
          signer: treasuryAccount,
          transaction,
        });
      });

      console.log("Transaction submitted:", committedTxn.hash);

      // Wait for transaction with retry logic
      toast.loading("Waiting for confirmation...", { id: "withdraw" });
      const executedTxn = await retryWithBackoff(async () => {
        return await aptos.waitForTransaction({
          transactionHash: committedTxn.hash,
        });
      });

      if (!executedTxn.success) {
        throw new Error("Transaction failed on blockchain");
      }

      // Update Supabase balance (optional - transaction already succeeded on-chain)
      let result = null;
      try {
        result = await withdrawFunds(username, parseFloat(amount), destinationAddress, committedTxn.hash);
        console.log("Supabase balance updated successfully");
      } catch (supabaseError) {
        console.warn("Failed to update Supabase balance, but transaction succeeded on-chain:", supabaseError);
        // Continue anyway since the blockchain transaction succeeded
      }

      toast.dismiss("withdraw");
      
      toast.success(
        `Withdrawal successful! ${parseFloat(amount).toFixed(4)} APT sent to ${destinationAddress.slice(0, 6)}...${destinationAddress.slice(-4)}`,
        { duration: 8000 }
      );

      // Update local balance (fallback to calculation if Supabase fails)
      const newBalance = result?.newBalance ?? (balance - parseFloat(amount));
      setBalance(newBalance);

      // Trigger balance update
      window.dispatchEvent(new Event('balance-updated'));

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
        destinationAddress: destinationAddress,
        txHashes: [committedTxn.hash],
      };
      setSuccessData(successDataObj);
      setOpenSuccess(true);

      // Reset form
      setAmount("");
      setDestinationAddress("");
    } catch (error) {
      console.error("Withdrawal error:", error);
      toast.dismiss("withdraw");
      
      // Provide more specific error messages
      let errorMessage = "Failed to process withdrawal";
      
      if (error.message) {
        // Check for rate limit errors
        if (error.message.includes('429') || 
            error.message.includes('Too Many Requests') || 
            error.message.includes('rate limit')) {
          errorMessage = "⚠️ Aptos API rate limit reached. Please wait a moment and try again.";
        }
        // Check for JSON parse errors (likely from rate limit HTML response)
        else if (error.message.includes('Unexpected token') || 
                 error.message.includes('Per anonym') ||
                 error.message.includes('JSON')) {
          errorMessage = "⚠️ Aptos API returned an error (likely rate limited). Please wait 30 seconds and try again.";
        }
        // Check for database errors
        else if (error.message.includes('Database') || error.message.includes('Supabase')) {
          errorMessage = "⚠️ Transaction may have succeeded on blockchain, but couldn't update balance. Check explorer to verify.";
        } 
        // Check for configuration errors
        else if (error.message.includes('Treasury private key')) {
          errorMessage = "Treasury configuration error. Please contact support.";
        } 
        // Check for balance errors
        else if (error.message.includes('Insufficient balance')) {
          errorMessage = "Insufficient balance for withdrawal";
        } 
        // Default to original error message
        else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="relative flex flex-col w-full max-w-md items-center justify-center bg-light-white rounded-[32px] p-6">
        <div className="relative flex gap-4 w-full items-center justify-center mb-8">
          <h1 className="absolute text-[#161618] font-bold">Withdraw Funds</h1>
          <button
            onClick={handleBack}
            className="relative flex w-fit mr-auto items-center justify-center bg-white rounded-full size-11"
          >
            <Icons.back className="text-black size-6" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 py-12">
          <p className="text-gray-600 text-center">Connect your Aptos wallet to withdraw funds</p>
          <Button
            color="primary"
            onClick={connect}
            className="h-14 rounded-full px-8"
            size="lg"
          >
            Connect Aptos Wallet
          </Button>
        </div>
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
          navigate("/");
        }}
        botButtonTitle={"Done"}
        successData={successData}
      />
    <div className="relative flex flex-col w-full max-w-md items-start justify-center bg-neutral-50 rounded-[32px] p-6">
      {/* Header */}
      <div className="relative flex gap-4 w-full items-center justify-center mb-8">
        <h1 className="absolute text-[#161618] font-bold text-xl">Withdraw Funds</h1>
        <button
          onClick={handleBack}
          className="relative flex w-fit mr-auto items-center justify-center bg-white rounded-full size-11 hover:bg-gray-100 transition-colors"
        >
          <Icons.back className="text-black size-6" />
        </button>
      </div>

      <div className="flex flex-col gap-4 w-full">
        {/* Available Balance Card */}
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm opacity-90">Available Balance</p>
            <div className="bg-white/20 rounded-full px-3 py-1">
              <p className="text-xs font-medium">APT</p>
            </div>
          </div>
          {isLoadingBalance ? (
            <div className="flex items-center gap-2">
              <div className="animate-pulse bg-white/30 h-10 w-32 rounded-lg"></div>
            </div>
          ) : (
            <>
              <p className="text-4xl font-bold mb-1">{balance.toFixed(4)}</p>
              <p className="text-xs opacity-75">Held in treasury wallet</p>
            </>
          )}
        </div>

        {/* Amount Input */}
        <div className="flex flex-col gap-2">
          <h1 className="text-sm text-[#A1A1A3] font-medium">Amount (APT)</h1>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                classNames={{
                  input: "text-lg font-medium",
                  inputWrapper: "rounded-2xl h-16 bg-white border-2 border-gray-200 hover:border-primary-300 transition-colors",
                }}
                disabled={isLoadingBalance || balance === 0}
              />
            </div>
            <Button
              onClick={() => setAmount(balance.toString())}
              isDisabled={isLoadingBalance || balance === 0}
              className="h-16 px-6 rounded-2xl bg-primary-50 text-primary font-semibold hover:bg-primary-100 transition-colors"
            >
              Max
            </Button>
          </div>
          {amount && parseFloat(amount) > balance && (
            <p className="text-red-500 text-sm flex items-center gap-1">
              <span>⚠️</span> Insufficient balance
            </p>
          )}
        </div>

        {/* Destination Address */}
        <div className="flex flex-col gap-2">
          <h1 className="text-sm text-[#A1A1A3] font-medium">Destination Address</h1>
          <Input
            placeholder="0x..."
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            classNames={{
              input: "text-sm font-mono",
              inputWrapper: "rounded-2xl h-16 bg-white border-2 border-gray-200 hover:border-primary-300 transition-colors",
            }}
          />
          <Button
            size="sm"
            variant="light"
            onClick={() => setDestinationAddress(account)}
            className="w-fit rounded-full text-primary hover:bg-primary-50"
          >
            Use my connected wallet
          </Button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mt-2">
          <div className="flex gap-3">
            <div className="text-blue-600 text-xl">ℹ️</div>
            <div>
              <p className="text-sm text-blue-900 font-medium mb-1">How it works</p>
              <p className="text-xs text-blue-800 leading-relaxed">
                Funds will be transferred from the treasury wallet to your specified address. 
                The transaction will be processed on the Aptos blockchain and may take a few moments.
                If you see a rate limit error, please wait 30 seconds and try again.
              </p>
            </div>
          </div>
        </div>

        {/* Withdraw Button */}
        <Button
          onClick={handleWithdraw}
          isLoading={isLoading}
          isDisabled={!amount || !destinationAddress || parseFloat(amount) > balance || parseFloat(amount) <= 0 || isLoadingBalance}
          className="h-16 mt-4 bg-primary hover:bg-primary-600 w-full rounded-2xl font-bold text-white text-lg shadow-lg transition-all disabled:opacity-50"
        >
          {isLoading ? "Processing Withdrawal..." : "Withdraw Funds"}
        </Button>
      </div>
    </div>
    </>
  );
}
