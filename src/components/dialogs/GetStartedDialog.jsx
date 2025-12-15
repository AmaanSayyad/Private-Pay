import {
  Modal,
  ModalContent,
  Button,
  Input,
  Skeleton,
} from "@nextui-org/react";
import { useEffect, useState } from "react";
import Confetti from "react-dom-confetti";
import SquidlLogo from "../../assets/squidl.svg?react";
import { useAtom } from "jotai";
import { isGetStartedDialogAtom } from "../../store/dialog-store";
import toast from "react-hot-toast";
import { squidlAPI } from "../../api/squidl";
import { useUserWallets } from "@dynamic-labs/sdk-react-core";
import Nounsies from "../shared/Nounsies";
import useSWR, { mutate } from "swr";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../../providers/Web3Provider";
import { useDebounce } from "@uidotdev/usehooks";
import { ethers } from "ethers";
import { sapphireTestnet } from "../../config";

const confettiConfig = {
  angle: 90,
  spread: 300,
  startVelocity: 20,
  elementCount: 60,
  dragFriction: 0.1,
  duration: 3000,
  stagger: 3,
  width: "8px",
  height: "8px",
  perspective: "500px",
};

export default function GetStartedDialog() {
  const [isOpen, setOpen] = useAtom(isGetStartedDialogAtom);

  const [step, setStep] = useState("one");

  const handleClose = () => {
    // Mark that user has skipped username setup
    localStorage.setItem("username_setup_skipped", "true");
    setOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      isDismissable={true}
      isKeyboardDismissDisabled={false}
      hideCloseButton={false}
      onClose={handleClose}
      placement="center"
    >
      <ModalContent className="bg-white rounded-4xl p-8 max-w-[562px] flex flex-col items-start relative">
        {step === "one" ? (
          <StepOne setStep={setStep} setOpen={setOpen} />
        ) : (
          <StepTwo setOpen={setOpen} />
        )}
      </ModalContent>
    </Modal>
  );
}

function StepOne({ setStep, setOpen }) {
  const [username, setUsername] = useState("");
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const debouncedUsername = useDebounce(username, 500);

  const handleCheckUsername = async () => {
    try {
      if (!debouncedUsername) {
        setIsUsernameAvailable(false);
        return;
      }

      setIsCheckingUsername(true);

      const { data } = await squidlAPI.get(`/stealth-address/aliases/check`, {
        params: {
          alias: debouncedUsername,
        },
      });

      setIsUsernameAvailable(data)
    } catch (error) {
      // If backend is not available, allow username (skip validation)
      if (error.code === 'ERR_NETWORK' || error.message?.includes('CONNECTION_REFUSED')) {
        // Backend unavailable - allow username to proceed
        setIsUsernameAvailable(true);
      } else {
        // Other errors - don't allow username
        setIsUsernameAvailable(false);
      }
    } finally {
      setIsCheckingUsername(false);
    }
  };

  useEffect(() => {
    if (!debouncedUsername) {
      setIsUsernameAvailable(false);
      setIsCheckingUsername(false);
      return;
    } else {
      handleCheckUsername()
    }
  }, [debouncedUsername])

  const [loading, setLoading] = useState(false);

  const { contract } = useWeb3();

  async function handleUpdate() {
    console.log('handleUpdate')
    if (loading) return;

    if (!username) {
      return toast.error("Please provide a username");
    }

    setLoading(true);

    try {
      toast.loading(
        "Preparing meta address, please sign the transaction...",
        {
          id: 'loading-meta-address',
        }
      );

      let authSigner;
      try {
        const authSignerData = localStorage.getItem("auth_signer");
        if (!authSignerData) {
          throw new Error("Auth signer not found in localStorage");
        }
        // Validate JSON before parsing
        if (typeof authSignerData !== 'string' || !authSignerData.trim().startsWith('{')) {
          console.error("Invalid auth_signer data in localStorage");
          throw new Error("Invalid signer data. Please reconnect your wallet.");
        }
        authSigner = JSON.parse(authSignerData);
      } catch (error) {
        console.error("Failed to parse auth_signer:", error);
        throw error;
      }
      if (!authSigner) {
        throw new Error("Auth signer not found in localStorage");
      }

      // Sapphire Provider and Paymaster Wallet
      const sapphireProvider = new ethers.JsonRpcProvider(sapphireTestnet.rpcUrls[0]);
      const paymasterPK = import.meta.env.VITE_PAYMASTER_PK;
      
      // Validate paymaster private key
      if (!paymasterPK || paymasterPK === "[REDACTED]" || paymasterPK.trim() === "" || paymasterPK.includes("REDACTED")) {
        toast.error("Paymaster private key not configured. Please set VITE_PAYMASTER_PK environment variable.");
        throw new Error("Paymaster private key not configured. Please set VITE_PAYMASTER_PK environment variable.");
      }
      
      let paymasterWallet;
      try {
        paymasterWallet = new ethers.Wallet(paymasterPK, sapphireProvider);
        // Validate the wallet was created successfully
        if (!paymasterWallet.address) {
          throw new Error("Failed to create wallet from private key");
        }
      } catch (keyError) {
        const errorMessage = keyError.message?.includes("invalid private key") 
          ? "Invalid paymaster private key format. Please check VITE_PAYMASTER_PK environment variable."
          : `Failed to create paymaster wallet: ${keyError.message}`;
        toast.error(errorMessage);
        throw new Error(errorMessage);
      }

      // Check paymaster balance before attempting transaction
      toast.loading("Checking paymaster balance...", {
        id: 'loading-meta-address',
      });
      
      const paymasterBalance = await sapphireProvider.getBalance(paymasterWallet.address);
      const minBalance = ethers.parseEther("0.01"); // Minimum 0.01 ROSE needed
      
      if (paymasterBalance < minBalance) {
        const balanceFormatted = ethers.formatEther(paymasterBalance);
        const errorMsg = `Paymaster wallet has insufficient balance (${balanceFormatted} ROSE). Please fund the wallet at: ${paymasterWallet.address}`;
        toast.error(
          (t) => (
            <div className="flex flex-col gap-2">
              <p className="font-semibold">Insufficient Paymaster Balance</p>
              <p className="text-sm">Balance: {balanceFormatted} ROSE</p>
              <p className="text-sm">Required: 0.01 ROSE minimum</p>
              <p className="text-xs mt-2">Fund at: <span className="font-mono">{paymasterWallet.address}</span></p>
              <p className="text-xs">
                <a 
                  href={`https://faucet.sapphire.oasis.dev/`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 underline"
                  onClick={() => toast.dismiss(t.id)}
                >
                  Get testnet tokens from faucet
                </a>
              </p>
            </div>
          ),
          { duration: 10000 }
        );
        throw new Error(errorMsg);
      }

      const contract = new ethers.Contract(
        sapphireTestnet.stealthSignerContract.address,
        sapphireTestnet.stealthSignerContract.abi.abi,
        paymasterWallet
      )
      toast.loading(
        "Cooking your meta address and ENS username, please wait...",
        {
          id: 'loading-meta-address',
        }
      );

      // Populate transaction
      const tx = await contract.register(authSigner);
      console.log("Populated Transaction:", tx);

      await tx.wait();

      console.log("Transaction Confirmed:", tx);

      // Get the user meta address
      const metaAddress = await contract.getMetaAddress.staticCall(authSigner, 1);
      const metaAddressInfo = {
        metaAddress: metaAddress[0],
        spendPublicKey: metaAddress[1],
        viewingPublicKey: metaAddress[2],
      }

      console.log("Meta Address Info:", metaAddressInfo);

      try {
        await squidlAPI.post("/user/update-user", {
          username: username.toLowerCase(),
          metaAddressInfo: metaAddressInfo
        });

        // Invalidate SWR cache to refresh user data
        await mutate("/auth/me");

        toast.success("Meta address and ENS username successfully created");
      } catch (error) {
        // If backend is not available, still allow local flow
        if (error.code === 'ERR_NETWORK' || error.message?.includes('CONNECTION_REFUSED')) {
          console.warn("[GetStartedDialog] Backend not available, skipping user update");
          toast.success("Meta address created (local mode - backend unavailable)");
          // Still invalidate cache to update local state
          await mutate("/auth/me");
        } else {
          throw error;
        }
      }

      // Clear skip flag since user successfully created username
      localStorage.removeItem("username_setup_skipped");
      setStep("two");
    } catch (e) {
      console.error('Error creating username', e)
      
      // Check for specific error types and provide helpful messages
      let errorMessage = "Error creating your username";
      let showDetailedError = false;
      
      // Check for insufficient balance errors
      const isInsufficientBalance = 
        e?.message?.includes("insufficient balance") ||
        e?.message?.includes("insufficient balance to pay fees") ||
        e?.code === -32000 ||
        (e?.error?.message?.includes("insufficient balance"));
      
      if (isInsufficientBalance) {
        // Get paymaster wallet address for error message
        try {
          const paymasterPK = import.meta.env.VITE_PAYMASTER_PK;
          if (paymasterPK) {
            const tempProvider = new ethers.JsonRpcProvider(sapphireTestnet.rpcUrls[0]);
            const tempWallet = new ethers.Wallet(paymasterPK, tempProvider);
            const balance = await tempProvider.getBalance(tempWallet.address);
            const balanceFormatted = ethers.formatEther(balance);
            
            errorMessage = `Paymaster wallet has insufficient balance (${balanceFormatted} ROSE). Please fund the wallet.`;
            showDetailedError = true;
            
            toast.error(
              (t) => (
                <div className="flex flex-col gap-2 max-w-md">
                  <p className="font-semibold text-red-600">⚠️ Insufficient Paymaster Balance</p>
                  <p className="text-sm">Current Balance: <span className="font-mono">{balanceFormatted} ROSE</span></p>
                  <p className="text-sm">Required: <span className="font-mono">0.01 ROSE</span> minimum</p>
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
                    <p className="font-semibold mb-1">Paymaster Address:</p>
                    <p className="font-mono break-all">{tempWallet.address}</p>
                  </div>
                  <div className="mt-2">
                    <a 
                      href="https://faucet.sapphire.oasis.dev/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 underline text-sm font-semibold"
                      onClick={() => toast.dismiss(t.id)}
                    >
                      → Get testnet tokens from faucet
                    </a>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Copy the address above and request tokens from the faucet, then try again.
                  </p>
                </div>
              ),
              { 
                id: 'loading-meta-address',
                duration: 15000 
              }
            );
          } else {
            errorMessage = "Paymaster wallet has insufficient balance. Please fund the paymaster wallet with ROSE tokens.";
          }
        } catch (balanceError) {
          errorMessage = "Paymaster wallet has insufficient balance to pay gas fees. Please fund the wallet with ROSE tokens.";
        }
      } else if (e?.message?.includes("Paymaster wallet has insufficient balance")) {
        // Already handled above with detailed toast, don't show again
        return; // Exit early, error already shown
      } else if (e?.message) {
        errorMessage = e.message;
      }
      
      // Only show generic error if we haven't shown a detailed one
      if (!showDetailedError) {
        toast.error(errorMessage, {
          id: 'loading-meta-address',
          duration: 8000,
        });
      }
    } finally {
      toast.dismiss('loading-meta-address');
      setLoading(false);
    }
  }

  return (
    <>
      <p className="text-2xl font-semibold">Let's get started!</p>
      <p className="text-lg mt-4">
        Pick a cool username for your SQUIDL. This will be your payment link and
        ENS, so anyone can easily send you money
      </p>
      <div className="mt-8 rounded-xl size-24 aspect-square bg-neutral-100 overflow-hidden mx-auto">
        <img
          src="/assets/nouns-placeholder.png"
          alt="nouns-placeholder"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="mt-8 w-full flex items-center relative">
        <Input
          className="w-full"
          type="text"
          classNames={{
            mainWrapper: "rounded-2xl",
            inputWrapper: "h-16",
            input:
              "focus-visible:outline-primary text-base placeholder:text-neutral-300",
          }}
          value={username}
          onChange={(e) => {
            const val = e.target.value;
            setUsername(val);
          }}
          placeholder="your-username"
          variant="bordered"
          isInvalid={!isUsernameAvailable && username}
        />
        <p className="absolute right-4 text-neutral-400">.squidl.me</p>
      </div>
      {(isUsernameAvailable === false && username) &&
        <div className="text-red-500 mt-1">
          Username is already taken
        </div>
      }
      <div className="w-full mt-4 flex flex-col gap-3">
        <Button
          onClick={handleUpdate}
          loading={loading || isCheckingUsername}
          isDisabled={loading || !isUsernameAvailable || isCheckingUsername}
          className="h-16 rounded-full text-white flex items-center justify-center w-full bg-primary-600"
        >
          Continue
        </Button>
        <Button
          onClick={() => {
            // Mark that user has skipped username setup
            localStorage.setItem("username_setup_skipped", "true");
            setOpen(false);
            toast.success("You can set up your username later from your profile");
          }}
          variant="light"
          className="h-12 rounded-full text-gray-600 flex items-center justify-center w-full"
        >
          Skip for now
        </Button>
      </div>
    </>
  );
}

function StepTwo({ setOpen }) {
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const userWallets = useUserWallets();
  const { data: user, isLoading } = useSWR("/auth/me", async (url) => {
    try {
      const { data } = await squidlAPI.get(url);
      return data;
    } catch (error) {
      // If backend is not available, return fallback user data
      if (error.code === 'ERR_NETWORK' || error.message?.includes('CONNECTION_REFUSED')) {
        console.warn("[GetStartedDialog] Backend not available, using fallback user data");
        return {
          user: {
            address: userWallets?.[0]?.address,
            username: null,
          },
        };
      }
      throw error;
    }
  }, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    errorRetryCount: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setConfettiTrigger((prev) => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <p className="text-2xl font-semibold">You're all set!</p>
      <p className="text-lg mt-4">
        Your Squidl username is live and ready for action. Share it with anyone
        to start receiving payments like a pro
      </p>
      {/* Card */}
      <div className="w-full rounded-2xl bg-primary-600 h-[221px] mt-5 flex flex-col overflow-hidden relative">
        <div className="w-full flex items-center justify-end px-6 py-5 text-white">
          {isLoading ? (
            <Skeleton className="w-24 h-8 rounded-md" />
          ) : (
            <p className="text-xl">{user?.username}.squidl.me</p>
          )}
        </div>
        <div className="bg-primary-50 flex-1 flex flex-col justify-end">
          <div className="w-full flex items-end justify-between py-5 px-6">
            <p className="text-primary-600 text-2xl font-medium">SQUIDL</p>
            <SquidlLogo className="w-14" />
          </div>
        </div>
        {/* Image */}
        <div className="absolute size-24 top-6 left-6 rounded-xl bg-neutral-200 overflow-hidden">
          <Nounsies address={userWallets[0]?.address} />
        </div>
      </div>

      <Button
        onClick={async () => {
          await navigator.share({
            title: "Link",
            text: `${user?.username}.squidl.me`,
          });
        }}
        className="h-16 rounded-full text-white flex items-center justify-center w-full mt-4 bg-primary-600"
      >
        Start Sharing
      </Button>
      <Button
        onClick={async () => {
          // Refresh user data before closing
          await mutate("/auth/me");
          setOpen(false);
          navigate("/");
        }}
        className="h-16 rounded-full bg-transparent flex items-center justify-center w-full mt-1 text-primary-600"
      >
        Go to dashboard
      </Button>
      <div className="absolute inset-0 overflow-hidden flex flex-col items-center mx-auto pointer-events-none">
        <Confetti
          active={confettiTrigger}
          config={confettiConfig}
          className="-translate-y-[4rem] translate-x-[0.4rem]"
        />
      </div>
    </>
  );
}
