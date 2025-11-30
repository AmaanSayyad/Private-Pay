import { createContext, useContext, useEffect, useState } from "react";
import {
  connectAptosWallet,
  disconnectAptosWallet,
  getAptosAccountAddress,
  getAptosClient,
} from "../lib/aptos";

const AptosContext = createContext({
  account: null,
  isConnected: false,
  connect: async () => {},
  disconnect: async () => {},
  client: null,
});

export const useAptos = () => {
  const context = useContext(AptosContext);
  if (!context) {
    throw new Error("useAptos must be used within AptosProvider");
  }
  return context;
};

export default function AptosProvider({ children, isTestnet = true }) {
  const [account, setAccount] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [client] = useState(() => getAptosClient(isTestnet));

  useEffect(() => {
    // Check if wallet is already connected
    const checkConnection = async () => {
      try {
        const address = await getAptosAccountAddress();
        if (address) {
          setAccount(address);
          setIsConnected(true);
        }
      } catch (error) {
        // Petra wallet not installed or not available - this is OK
        if (error.message?.includes("PetraApiError") || error.message?.includes("not found")) {
          console.log("Aptos wallet (Petra) not installed. User can install it to use Aptos features.");
        } else {
          console.error("Error checking Aptos connection:", error);
        }
      }
    };

    checkConnection();

    // Listen for wallet events
    if (typeof window !== "undefined" && window.aptos) {
      window.aptos.onAccountChange((newAccount) => {
        if (newAccount) {
          setAccount(newAccount.address);
          setIsConnected(true);
        } else {
          setAccount(null);
          setIsConnected(false);
        }
      });
    }
  }, []);

  const connect = async () => {
    try {
      const address = await connectAptosWallet();
      setAccount(address);
      setIsConnected(true);
      return address;
    } catch (error) {
      console.error("Error connecting Aptos wallet:", error);
      throw error;
    }
  };

  const disconnect = async () => {
    try {
      await disconnectAptosWallet();
      setAccount(null);
      setIsConnected(false);
    } catch (error) {
      console.error("Error disconnecting Aptos wallet:", error);
    }
  };

  return (
    <AptosContext.Provider
      value={{
        account,
        isConnected,
        connect,
        disconnect,
        client,
      }}
    >
      {children}
    </AptosContext.Provider>
  );
}


