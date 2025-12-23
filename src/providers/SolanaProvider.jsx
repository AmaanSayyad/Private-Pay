import { useMemo, createContext, useContext, useState, useCallback, useEffect } from "react";
import {
  ConnectionProvider,
  WalletProvider,
  useWallet,
  useConnection,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl, PublicKey, Connection } from "@solana/web3.js";
import { HeliusClient } from "../lib/helius/index";

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

// Arcium-specific context for MPC operations
const ArciumContext = createContext(null);

// Solana context with Helius integration
const SolanaContext = createContext(null);

export function useArcium() {
  const context = useContext(ArciumContext);
  if (!context) {
    throw new Error("useArcium must be used within an ArciumProvider");
  }
  return context;
}

export function useSolana() {
  const context = useContext(SolanaContext);
  if (!context) {
    throw new Error("useSolana must be used within a SolanaProvider");
  }
  return context;
}

// Arcium Provider for MPC-specific functionality
function ArciumProvider({ children }) {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const [mxePublicKey, setMxePublicKey] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize Arcium connection
  const initializeArcium = useCallback(async (programId) => {
    if (!connection || !programId) return null;

    try {
      // This will be replaced with actual getMXEPublicKey call when @arcium-hq/client is installed
      // For now, we create a placeholder that will work with the actual implementation
      console.log("Initializing Arcium for program:", programId.toString());
      setIsInitialized(true);
      return true;
    } catch (error) {
      console.error("Failed to initialize Arcium:", error);
      return false;
    }
  }, [connection]);

  // Get computation accounts for Arcium operations
  const getComputationAccounts = useCallback((clusterOffset, computationOffset) => {
    // These will be populated when the actual Arcium client is used
    return {
      clusterOffset,
      computationOffset,
    };
  }, []);

  const value = useMemo(
    () => ({
      connection,
      publicKey,
      signTransaction,
      signAllTransactions,
      mxePublicKey,
      isInitialized,
      initializeArcium,
      getComputationAccounts,
    }),
    [
      connection,
      publicKey,
      signTransaction,
      signAllTransactions,
      mxePublicKey,
      isInitialized,
      initializeArcium,
      getComputationAccounts,
    ]
  );

  return (
    <ArciumContext.Provider value={value}>{children}</ArciumContext.Provider>
  );
}

// Helius + Solana Provider for enhanced Solana functionality
function HeliusSolanaProvider({ children }) {
  const { connection } = useConnection();
  const { publicKey, connected, wallet } = useWallet();
  const [heliusClient, setHeliusClient] = useState(null);
  const [priorityFees, setPriorityFees] = useState(null);
  const [isHeliusReady, setIsHeliusReady] = useState(false);

  // Initialize Helius client
  useEffect(() => {
    const apiKey = import.meta.env.VITE_HELIUS_API_KEY;
    const network = import.meta.env.VITE_SOLANA_NETWORK || "devnet";

    if (apiKey) {
      const client = new HeliusClient(apiKey, network);
      setHeliusClient(client);
      setIsHeliusReady(true);
    }
  }, []);

  // Fetch priority fees when wallet connects
  useEffect(() => {
    if (heliusClient && publicKey) {
      heliusClient
        .getPriorityFeeEstimate({ accountKeys: [publicKey.toBase58()] })
        .then((result) => {
          // Handle both response formats
          if (result?.priorityFeeLevels) {
            setPriorityFees(result.priorityFeeLevels);
          } else if (result?.priorityFeeEstimate) {
            setPriorityFees({
              low: Math.floor(result.priorityFeeEstimate * 0.5),
              medium: result.priorityFeeEstimate,
              high: Math.floor(result.priorityFeeEstimate * 2),
            });
          }
        })
        .catch((error) => {
          console.warn("Failed to fetch priority fees via Helius, using defaults:", error.message);
          setPriorityFees({ low: 1000, medium: 5000, high: 10000 });
        });
    }
  }, [heliusClient, publicKey]);

  // Get transaction history using Helius Enhanced API
  const getTransactionHistory = useCallback(
    async (address, limit = 20) => {
      if (!heliusClient) {
        throw new Error("Helius client not initialized");
      }
      return heliusClient.getTransactionHistory(address || publicKey?.toBase58(), limit);
    },
    [heliusClient, publicKey]
  );

  // Parse transactions using Helius Enhanced API
  const parseTransactions = useCallback(
    async (signatures) => {
      if (!heliusClient) {
        throw new Error("Helius client not initialized");
      }
      return heliusClient.parseTransactions(signatures);
    },
    [heliusClient]
  );

  // Send transaction with priority fee
  const sendTransactionWithPriorityFee = useCallback(
    async (transaction, signers = []) => {
      if (!heliusClient || !wallet?.adapter) {
        throw new Error("Helius client or wallet not initialized");
      }

      // Add priority fee to transaction using Helius estimate
      const { transaction: txWithFee } = await heliusClient.addPriorityFee(
        transaction,
        { accountKeys: [publicKey.toBase58()] }
      );

      // Sign and send
      const signature = await wallet.adapter.sendTransaction(txWithFee, connection, {
        signers,
      });

      return signature;
    },
    [heliusClient, wallet, connection, publicKey]
  );

  // Confirm transaction with Helius enhanced confirmation
  const confirmTransactionEnhanced = useCallback(
    async (signature, commitment = "confirmed") => {
      if (!heliusClient) {
        return connection.confirmTransaction(signature, commitment);
      }
      return heliusClient.confirmTransaction(signature, commitment);
    },
    [heliusClient, connection]
  );

  const value = useMemo(
    () => ({
      connection,
      publicKey,
      connected,
      wallet,
      heliusClient,
      isHeliusReady,
      priorityFees,
      getTransactionHistory,
      parseTransactions,
      sendTransactionWithPriorityFee,
      confirmTransactionEnhanced,
    }),
    [
      connection,
      publicKey,
      connected,
      wallet,
      heliusClient,
      isHeliusReady,
      priorityFees,
      getTransactionHistory,
      parseTransactions,
      sendTransactionWithPriorityFee,
      confirmTransactionEnhanced,
    ]
  );

  return (
    <SolanaContext.Provider value={value}>{children}</SolanaContext.Provider>
  );
}

// Main Solana Provider component
export default function SolanaProvider({ children }) {
  // Use Helius RPC if API key is available, otherwise fallback to public endpoint
  const endpoint = useMemo(() => {
    const heliusApiKey = import.meta.env.VITE_HELIUS_API_KEY;
    const network = import.meta.env.VITE_SOLANA_NETWORK || "devnet";

    if (heliusApiKey) {
      return `https://${network}.helius-rpc.com/?api-key=${heliusApiKey}`;
    }

    return import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl("devnet");
  }, []);

  // Configure supported wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <HeliusSolanaProvider>
            <ArciumProvider>{children}</ArciumProvider>
          </HeliusSolanaProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

// Export useful hooks
export { useWallet, useConnection } from "@solana/wallet-adapter-react";



