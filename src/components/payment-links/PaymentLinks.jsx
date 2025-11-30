import { motion } from "framer-motion";
import { cnm } from "../../utils/style.js";
import { useNavigate } from "react-router-dom";
import {
  AVAILABLE_CARDS_BG,
  CARDS_SCHEME,
} from "../home/dashboard/PaymentLinksDashboard.jsx";
import { Button, Spinner } from "@nextui-org/react";
import { useAtom } from "jotai";
import SquidLogo from "../../assets/squidl-logo.svg?react";
import { isCreateLinkDialogAtom } from "../../store/dialog-store.js";
import { useAptos } from "../../providers/AptosProvider.jsx";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { Icons } from "../shared/Icons.jsx";
import { usePhoton } from "../../providers/PhotonProvider.jsx";
import { getPaymentLinks } from "../../lib/supabase.js";

export default function PaymentLinks() {
  const navigate = useNavigate();
  const [, setOpen] = useAtom(isCreateLinkDialogAtom);
  const { account } = useAptos();
  const { trackUnrewardedEvent } = usePhoton();
  const [paymentLinks, setPaymentLinks] = useState([]);
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadPaymentLinks = async () => {
    if (account) {
      const savedUsername = localStorage.getItem(`aptos_username_${account}`);
      setUsername(savedUsername || account.slice(2, 8));

      // Load from Supabase instead of localStorage
      const links = await getPaymentLinks(account);
      setPaymentLinks(links);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPaymentLinks();

    const handleUpdate = () => {
      loadPaymentLinks();
    };

    window.addEventListener('payment-links-updated', handleUpdate);

    return () => {
      window.removeEventListener('payment-links-updated', handleUpdate);
    };
  }, [account]);

  const handleDeleteLink = async (linkId) => {
    try {
      const { deletePaymentLink } = await import("../../lib/supabase.js");
      await deletePaymentLink(linkId);
      
      // Reload payment links
      await loadPaymentLinks();
      
      toast.success("Payment link deleted");
      window.dispatchEvent(new Event('payment-links-updated'));
    } catch (error) {
      console.error("Error deleting payment link:", error);
      toast.error("Failed to delete payment link");
    }
  };

  const handleCopyLink = (alias) => {
    navigator.clipboard.writeText(`${alias}.privatepay.me`);
    toast.success("Link copied to clipboard!");
    
    // Track unrewarded event for attribution
    trackUnrewardedEvent("payment_link_copied", {
      alias: alias,
      username: username,
    });
  };

  return (
    <div className="relative flex flex-col gap-9 w-full max-w-md items-start justify-center bg-light-white rounded-[32px] pb-6">
      <div className="flex items-center justify-between w-full px-6 pt-6">
        <h1 className="text-[#19191B] font-medium text-lg">
          Payment Links
        </h1>
        <Button
          onClick={() => navigate("/")}
          className="bg-white rounded-full px-4 h-10 flex items-center gap-2"
        >
          <Icons.back className="size-4" />
          <span className="text-sm">Back</span>
        </Button>
      </div>

      <div className="w-full flex flex-col px-6">
        {isLoading ? (
          <div className="w-full min-h-64 flex items-center justify-center">
            <Spinner size="lg" color="primary" />
          </div>
        ) : paymentLinks && paymentLinks.length > 0 ? (
          paymentLinks.map((link, idx) => {
            const bgImage = AVAILABLE_CARDS_BG[idx % AVAILABLE_CARDS_BG.length];
            const cardName = `${link.alias}.privatepay.me`;

            return (
              <motion.div
                key={idx}
                layout
                transition={{ duration: 0.4 }}
                className={cnm(
                  "relative rounded-2xl h-52 md:h-60 w-full overflow-hidden group",
                  idx > 0 && "-mt-36 md:-mt-44"
                )}
                whileHover={{ rotate: -5, y: -20 }}
              >
                <img
                  src={bgImage}
                  alt="card-bg"
                  className="absolute w-full h-full object-cover rounded-[24px] inset-0"
                />

                <div
                  className={cnm(
                    "relative px-6 py-5 w-full flex items-center justify-between",
                    bgImage === "/assets/card-2.png" ? "text-black" : "text-white"
                  )}
                >
                  <p className="font-medium">{cardName}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopyLink(link.alias)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 backdrop-blur-sm rounded-full p-2"
                    >
                      <Icons.copy className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity bg-red-500/80 backdrop-blur-sm rounded-full p-2"
                    >
                      <Icons.close className="size-4 text-white" />
                    </button>
                  </div>
                </div>

                <div className="absolute left-5 bottom-6 flex items-center justify-between">
                  <h1
                    className={cnm(
                      "font-bold text-2xl",
                      bgImage === "/assets/card-2.png" ? "text-black" : "text-white"
                    )}
                  >
                    PRIVATEPAY
                  </h1>
                </div>

                <div className="absolute right-5 bottom-6 flex items-center justify-between">
                  <SquidLogo
                    className={cnm(
                      "w-12",
                      bgImage === "/assets/card-2.png" ? "fill-black" : "fill-white"
                    )}
                  />
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="w-full min-h-64 flex flex-col items-center justify-center gap-4 font-medium">
            <p className="text-gray-600">No payment links available yet</p>
            <Button
              onClick={() => {
                setOpen(true);
                navigate("/");
              }}
              className="px-6 py-2 rounded-full bg-primary text-white h-12"
            >
              Create Payment Link
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
