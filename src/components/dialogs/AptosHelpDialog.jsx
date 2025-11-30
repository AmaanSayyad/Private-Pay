import { Modal, ModalContent, Button } from "@nextui-org/react";
import { Icons } from "../shared/Icons.jsx";

export default function AptosHelpDialog({ open, setOpen }) {
  return (
    <Modal
      isOpen={open}
      onOpenChange={setOpen}
      size="2xl"
      placement="center"
      scrollBehavior="inside"
      hideCloseButton
    >
      <ModalContent className="relative flex flex-col rounded-4xl items-start justify-start gap-6 p-8 max-h-[85vh] overflow-y-auto">
        <button
          onClick={() => setOpen(false)}
          className="absolute right-6 top-6 bg-[#F8F8F8] rounded-full p-3 z-10 hover:bg-gray-200 transition-colors"
        >
          <Icons.close className="text-black size-6" />
        </button>

        <div className="flex flex-col gap-2 w-full pr-12">
          <h1 className="font-bold text-2xl text-[#19191B]">How to Use Aptos Stealth Payments</h1>
          <p className="text-sm text-gray-600">
            Step-by-step guide to send and receive private payments on Aptos
          </p>
        </div>

        <div className="flex flex-col gap-6 w-full">
          {/* Receiving Payments */}
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-xl text-primary-600">📥 Receiving Payments</h2>
            
            <div className="flex flex-col gap-4 pl-4 border-l-2 border-primary-200">
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-lg">Step 1: Connect Your Wallet</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Click "Connect Aptos Wallet" button. Make sure you have Petra wallet installed in your browser.
                  Approve the connection request in your wallet.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-lg">Step 2: Generate Your Keys</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  You need to generate two public keys:
                </p>
                <ul className="list-disc list-inside text-sm text-gray-700 ml-4 space-y-2 leading-relaxed">
                  <li><strong>Spend Public Key:</strong> Used to derive private keys for stealth addresses (33 bytes, compressed secp256k1)</li>
                  <li><strong>Viewing Public Key:</strong> Used to scan and identify payments sent to your stealth addresses (33 bytes, compressed secp256k1)</li>
                </ul>
                <p className="text-sm text-gray-700 mt-2 leading-relaxed">
                  You can generate these keys using the Python script: <code className="bg-gray-100 px-2 py-1 rounded text-xs">python scripts/offchain_helper.py</code>
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-lg">Step 3: Register Meta Address</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Enter your Spend Public Key and Viewing Public Key in the form.
                  Click "Register Meta Address" to register your keys on-chain.
                  This allows others to send you stealth payments.
                </p>
                <p className="text-sm text-gray-500 italic mt-1 leading-relaxed">
                  Note: You only need to register once. After registration, you can receive unlimited stealth payments.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-lg">Step 4: Share Your Public Keys</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Share your Spend Public Key and Viewing Public Key with anyone who wants to send you payments.
                  They will use these keys to generate a unique stealth address for each payment.
                </p>
              </div>
            </div>
          </div>

          {/* Sending Payments */}
          <div className="flex flex-col gap-4">
            <h2 className="font-bold text-xl text-primary-600">📤 Sending Payments</h2>
            
            <div className="flex flex-col gap-4 pl-4 border-l-2 border-primary-200">
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-lg">Step 1: Connect Your Wallet</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Make sure your Aptos wallet is connected. Switch to "Send" tab if you're on the "Receive" tab.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-lg">Step 2: Get Recipient's Public Keys</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Obtain the recipient's Spend Public Key and Viewing Public Key.
                  These are the keys they registered when setting up to receive payments.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-lg">Step 3: Generate Stealth Address</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Click "Generate Stealth Address" button.
                  Enter the recipient's Spend Public Key and Viewing Public Key.
                  Click "Generate" to create a unique stealth address for this payment.
                </p>
                <p className="text-sm text-gray-500 italic mt-1 leading-relaxed">
                  Each payment uses a different stealth address, ensuring complete privacy.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-lg">Step 4: Enter Amount</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Enter the amount you want to send in APT (Aptos tokens).
                  The amount will be automatically converted to octas (1 APT = 100,000,000 octas).
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-lg">Step 5: Send Payment</h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  Review the stealth address and ephemeral public key (generated automatically).
                  Click "Send Stealth Payment" to submit the transaction.
                  Approve the transaction in your wallet.
                </p>
                <p className="text-sm text-gray-500 italic mt-1 leading-relaxed">
                  The transaction will be recorded on-chain, but the link between sender and recipient remains private.
                </p>
              </div>
            </div>
          </div>

          {/* Important Notes */}
          <div className="flex flex-col gap-3 bg-yellow-50 border border-yellow-200 rounded-3xl p-5">
            <h2 className="font-bold text-lg text-yellow-800">⚠️ Important Notes</h2>
            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-2 ml-2 leading-relaxed">
              <li>Always verify public keys before sending payments</li>
              <li>Keep your private keys secure - never share them</li>
              <li>Each stealth address is unique and can only be used once</li>
              <li>Recipients need to scan the blockchain to find their payments</li>
              <li>This system is currently on Aptos Testnet</li>
            </ul>
          </div>

          {/* Technical Details */}
          <div className="flex flex-col gap-3 bg-blue-50 border border-blue-200 rounded-3xl p-5">
            <h2 className="font-bold text-lg text-blue-800">🔧 Technical Details</h2>
            <div className="flex flex-col gap-2 text-sm text-blue-700 leading-relaxed">
              <p>
                <strong>Stealth Addresses:</strong> Each payment uses a unique, unlinkable address derived from the recipient's meta address and an ephemeral key.
              </p>
              <p>
                <strong>ECDH (Elliptic Curve Diffie-Hellman):</strong> Used to compute a shared secret between sender and recipient for address derivation.
              </p>
              <p>
                <strong>View Hints:</strong> Small data included in transactions to help recipients quickly filter relevant payments.
              </p>
              <p>
                <strong>Meta Address:</strong> A user's public identifier consisting of spend_pub_key and viewing_pub_key.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => setOpen(false)}
          className="w-full h-14 rounded-full bg-primary text-white"
          size="lg"
        >
          Got it!
        </Button>
      </ModalContent>
    </Modal>
  );
}

