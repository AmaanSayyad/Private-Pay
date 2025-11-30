import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@nextui-org/react";
import { HelpCircle } from "lucide-react";
import AptosPayment from "../components/aptos/AptosPayment";
import AptosSendPayment from "../components/aptos/AptosSendPayment";
import AptosHelpDialog from "../components/dialogs/AptosHelpDialog";
import { cnm } from "../utils/style";

export default function AptosPage() {
  const [mode, setMode] = useState("receive");
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <motion.div
      layoutScroll
      className="w-full h-screen flex flex-col items-center overflow-y-auto"
    >
      <div className="flex flex-col items-center py-20 w-full">
        <div className="w-full max-w-md flex flex-col items-center gap-4 pt-12 pb-20">
          {/* Receive/Send Toggle Card */}
          <div className="bg-primary-600 p-4 rounded-3xl text-white w-full">
            <div className="w-full flex items-center justify-between">
              <p className="text-xl">Aptos Stealth Payments</p>
              <div className="bg-white rounded-full flex relative items-center font-medium px-1 py-1">
                <div
                  className={cnm(
                    "w-24 h-10 bg-primary-500 absolute left-1 rounded-full transition-transform ease-in-out",
                    mode === "receive" ? "translate-x-0" : "translate-x-full"
                  )}
                ></div>
                <button
                  onClick={() => setMode("receive")}
                  className={cnm(
                    "w-24 h-10 rounded-full flex items-center justify-center relative transition-colors",
                    mode === "receive" ? "text-white" : "text-primary"
                  )}
                >
                  Receive
                </button>
                <button
                  onClick={() => setMode("send")}
                  className={cnm(
                    "w-24 h-8 rounded-full flex items-center justify-center relative transition-colors",
                    mode === "send" ? "text-white" : "text-primary"
                  )}
                >
                  Send
                </button>
              </div>
            </div>
          </div>

          {/* Content Card */}
          <div className="w-full rounded-3xl bg-neutral-50 overflow-hidden">
            <AnimatePresence mode="wait">
              {mode === "receive" ? (
                <motion.div
                  key="receive"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-6"
                >
                  <AptosPayment />
                </motion.div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="p-6"
                >
                  <AptosSendPayment />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Help Button */}
      <Button
        isIconOnly
        className="fixed bottom-24 right-6 bg-primary text-white rounded-full w-14 h-14 z-50 shadow-lg"
        onClick={() => setHelpOpen(true)}
        aria-label="Help"
      >
        <HelpCircle className="size-6" />
      </Button>

      {/* Help Dialog */}
      <AptosHelpDialog open={helpOpen} setOpen={setHelpOpen} />
    </motion.div>
  );
}


