import Confetti from "react-dom-confetti";
import { isCreateLinkDialogAtom } from "../../store/dialog-store.js";
import { useAtom } from "jotai";
import {
  Button,
  Input,
  Modal,
  ModalContent,
} from "@nextui-org/react";
import { useEffect, useState } from "react";
import { Icons } from "../shared/Icons.jsx";
import Nounsies from "../shared/Nounsies.jsx";
import { validateAlphanumeric } from "../../utils/string.js";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useAptos } from "../../providers/AptosProvider.jsx";
import { CARDS_SCHEME } from "../home/dashboard/PaymentLinksDashboard.jsx";
import SquidLogo from "../../assets/squidl-logo.svg?react";
import { cnm } from "../../utils/style.js";
import { createPaymentLink, getPaymentLinks } from "../../lib/supabase.js";
import { usePhoton } from "../../providers/PhotonProvider.jsx";

const confettiConfig = {
  angle: 90, // Angle at which the confetti will explode
  spread: 300, // How much area the confetti will cover
  startVelocity: 20, // Starting speed of the particles
  elementCount: 60, // Number of confetti pieces
  dragFriction: 0.1, // Drag friction applied to particles
  duration: 3000, // How long the confetti effect lasts
  stagger: 3, // Delay between confetti particle launch
  width: "8px", // Width of confetti pieces
  height: "8px", // Height of confetti pieces
  perspective: "500px", // Perspective value for 3D effect
};

export default function CreateLinkDialog() {
  const { account } = useAptos();
  const [isOpen, setOpen] = useAtom(isCreateLinkDialogAtom);
  const [step, setStep] = useState("one");
  const [alias, setAlias] = useState("");
  const [username, setUsername] = useState("");
  const [initialAliasCount, setInitialAliasCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      if (account) {
        const savedUsername = localStorage.getItem(`aptos_username_${account}`);
        setUsername(savedUsername || account.slice(2, 8));
        
        const paymentLinks = await getPaymentLinks(account);
        setInitialAliasCount(paymentLinks.length);
      }
    }
    loadData();
  }, [account]);

  function reset() {
    setInitialAliasCount(0);
    setAlias("");
  }

  const nextColorScheme =
    CARDS_SCHEME[initialAliasCount % CARDS_SCHEME.length] + 1;

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={setOpen}
      isKeyboardDismissDisabled={true}
      hideCloseButton
      placement="center"
    >
      <ModalContent className="bg-white rounded-4xl p-8 max-w-[562px] flex flex-col items-start relative">
        <button
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="absolute right-4 top-4 bg-[#F8F8F8] rounded-full p-3"
        >
          <Icons.close className="text-black size-6" />
        </button>

        {step === "one" ? (
          <StepOne
            setStep={setStep}
            username={username}
            alias={alias}
            setAlias={setAlias}
            setInitialAliasCount={setInitialAliasCount}
          />
        ) : (
          <StepTwo
            username={username}
            setOpen={setOpen}
            setStep={setStep}
            alias={alias}
            nextColorScheme={nextColorScheme}
            reset={reset}
          />
        )}
      </ModalContent>
    </Modal>
  );
}

function StepOne({
  setStep,
  username,
  alias,
  setAlias,
  setInitialAliasCount,
}) {
  const { account } = useAptos();
  const { trackUnrewardedEvent } = usePhoton();

  async function handleUpdate() {
    if (!alias) {
      return toast.error("Please provide an alias");
    }

    if (!validateAlphanumeric(alias)) {
      return toast.error("Only letters and numbers are allowed");
    }

    if (alias.length > 15) {
      return toast.error("Alias can't be more than 15 characters");
    }

    try {
      // Get username from localStorage
      const currentUsername = localStorage.getItem(`aptos_username_${account}`) || account?.slice(2, 8);

      // Save payment link to Supabase
      await createPaymentLink(account, currentUsername, alias);

      // Get updated count
      const paymentLinks = await getPaymentLinks(account);
      setInitialAliasCount(paymentLinks.length);

      toast.success("Your payment link has been created!");
      
      // Track unrewarded event for attribution
      trackUnrewardedEvent("payment_link_created", {
        alias: alias,
        username: currentUsername,
        totalLinks: paymentLinks.length,
      });
      
      // Trigger a custom event to refresh the dashboard
      window.dispatchEvent(new Event('payment-links-updated'));
      
      setStep("two");
    } catch (error) {
      if (error.message?.includes('duplicate')) {
        toast.error("This alias already exists");
      } else {
        toast.error("Failed to create payment link");
      }
    }
  }

  return (
    <>
      <p className="text-2xl font-semibold">Create payment link</p>
      <p className="text-lg mt-4">
        Enter your client’s name or a unique alias to personalize your payment
        link. We'll also generate a Nounsies image for easy tracking and
        identification
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
          classNames={{
            mainWrapper: "rounded-2xl",
            inputWrapper: "h-16",
            input:
              "focus-visible:outline-primary text-base placeholder:text-neutral-300",
          }}
          value={alias}
          onChange={(e) => {
            const val = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '');
            setAlias(val);
          }}
          placeholder="your-alias"
          variant="bordered"
        />
        <p className="absolute right-4 text-neutral-400">
          .privatepay.me
        </p>
      </div>
      <Button
        onClick={handleUpdate}
        className="h-16 rounded-full text-white flex items-center justify-center w-full mt-4 bg-primary-600"
      >
        Continue
      </Button>
    </>
  );
}

function StepTwo({
  username,
  setOpen,
  setStep,
  alias,
  nextColorScheme,
  reset,
}) {
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const navigate = useNavigate();
  const { account } = useAptos();

  useEffect(() => {
    const interval = setInterval(() => {
      setConfettiTrigger((prev) => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const onCopy = (text) => {
    toast.success("Copied to clipboard", {
      id: "copy",
      duration: 1000,
      position: "bottom-center",
    });
    navigator.clipboard.writeText(text);
  };

  return (
    <>
      <p className="text-2xl font-semibold">Your Payment link is ready!</p>
      <p className="text-lg mt-4">
        Share it via email, social media, or copy and paste it anywhere. Manage
        and track payments easily from your dashboard
      </p>
      {/* Card */}
      <div className="relative w-full h-full mt-5">
        <img
          src={`/assets/card-${nextColorScheme}.png`}
          alt="card-placeholder"
          className="absolute w-full h-full object-cover rounded-2xl"
        />

        <div className="absolute right-5 top-5 size-12 rounded-full overflow-hidden">
          <Nounsies address={account || ""} />
        </div>

        <div className="relative w-full h-52 md:h-60 flex flex-col items-center justify-start py-7 px-6">
          <div className="w-full flex items-center justify-between">
            <div className="flex gap-2 items-center">
              <h1 className="text-white font-medium">
                <p
                  className={`${
                    nextColorScheme === 2 ? "text-black " : "text-white"
                  }`}
                >
                  {alias}.privatepay.me
                </p>
              </h1>
              <button
                onClick={() => onCopy(`${alias}.privatepay.me`)}
              >
                <Icons.copy
                  className={`size-4 ${
                    nextColorScheme === 2 ? "text-black " : "text-white"
                  }`}
                />
              </button>
            </div>
          </div>

          <h1
            className={`absolute top-1/2 -translate-y-1/2 font-extrabold text-2xl ${
              nextColorScheme === 2 ? "text-black " : "text-white"
            }`}
          >
            $0
          </h1>

          <div className="absolute left-5 bottom-6 flex items-center justify-between">
            <h1
              className={`${
                nextColorScheme === 2 ? "text-black " : "text-white"
              } font-bold text-2xl`}
            >
              SQUIDL
            </h1>
          </div>

          <div className="absolute right-5 bottom-6 flex items-center justify-between">
            <SquidLogo
              className={cnm(
                "w-12 ",
                nextColorScheme === 2 ? "fill-black" : "fill-white"
              )}
            />
          </div>
        </div>
      </div>

      <Button
        onClick={async () => {
          try {
            await navigator.share({
              title: "Payment Link",
              text: `${alias}.privatepay.me`,
            });
          } catch (error) {
            // Fallback to copy if share is not supported
            onCopy(`${alias}.privatepay.me`);
          }
        }}
        className="h-16 rounded-full text-white flex items-center justify-center w-full mt-4 bg-primary-600"
      >
        Start Sharing
      </Button>
      <Button
        onClick={() => {
          setOpen(false);
          reset();
          setStep("one");
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
