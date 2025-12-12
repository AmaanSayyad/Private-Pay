import { createContext, useContext, useMemo } from "react";
import { AptosWalletAdapterProvider, useWallet } from "@aptos-labs/wallet-adapter-react";
import { PetraWallet } from "petra-plugin-wallet-adapter";
import { getAptosClient } from "../lib/aptos";

// Initialize wallets
const wallets = [new PetraWallet()];

// Create a context wrapper to maintain backward compatibility with existing code
const AptosContext = createContext({
  account: null,
  isConnected: false,
  connect: async () => { },
  disconnect: async () => { },
  client: null,
  signAndSubmitTransaction: async () => { }, // Added for signature delegation
});

export const useAptos = () => {
  const context = useContext(AptosContext);
  if (!context) {
    throw new Error("useAptos must be used within AptosProvider");
  }
  return context;
};

// Internal component to consume useWallet and expose it via our custom context
function InternalAptosProvider({ children, isTestnet }) {
  const { account, connected, connect, disconnect, signAndSubmitTransaction } = useWallet();
  const client = useMemo(() => getAptosClient(isTestnet), [isTestnet]);

  // Wrapper to match old connect() signature (no args) -> defaults to Petra
  const handleConnect = async () => {
    try {
      // Connect to Petra by default if no argument
      await connect("Petra");
    } catch (error) {
      console.error("Failed to connect to Petra:", error);
      throw error;
    }
  };

  const value = {
    account: account?.address ? account.address.toString() : null, // Adapter returns object, we need string
    isConnected: connected,
    connect: handleConnect,
    disconnect,
    client,
    signAndSubmitTransaction,
  };

  return (
    <AptosContext.Provider value={value}>
      {children}
    </AptosContext.Provider>
  );
}

export default function AptosProvider({ children, isTestnet = true }) {
  return (
    <AptosWalletAdapterProvider plugins={wallets} autoConnect={true}>
      <InternalAptosProvider isTestnet={isTestnet}>
        {children}
      </InternalAptosProvider>
    </AptosWalletAdapterProvider>
  );
}
