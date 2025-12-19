import { createContext, useContext, useState, useEffect } from "react";
import { 
    generateZcashWallet, 
    getWalletFromMnemonic,
    isShieldedAddress,
    detectAddressType,
    AddressType,
    createMockBridgeTx
} from "../lib/zcash";
import { createConfiguredRPCClient } from "../lib/zcash/index";
import { createZcashWallet as createZcashWalletInstance } from "../lib/zcash/zcashWallet";
import toast from "react-hot-toast";

const ZcashContext = createContext({});

export const useZcash = () => useContext(ZcashContext);

export default function ZcashProvider({ children }) {
    const [zcashAccount, setZcashAccount] = useState(null); // { address, mnemonic, ... }
    const [shieldedAccount, setShieldedAccount] = useState(null); // { address, viewingKey, ... }
    const [balance, setBalance] = useState({
        transparent: 0,
        shielded: 0,
        total: 0,
        pending: 0,
        simulated: parseFloat(localStorage.getItem("simulated_zcash") || "0")
    });
    const [isConnected, setIsConnected] = useState(false);
    const [walletInstance, setWalletInstance] = useState(null);
    const [rpcClient, setRpcClient] = useState(null);
    const [isShieldedEnabled, setIsShieldedEnabled] = useState(false);

    const simulateDeposit = (amount) => {
        const newSimulated = (balance.simulated || 0) + parseFloat(amount);
        setBalance(prev => ({
            ...prev,
            simulated: newSimulated
        }));
        localStorage.setItem("simulated_zcash", newSimulated.toString());
        toast.success(`Received incoming transfer: ${amount} tZEC (Simulated)`);
    };

    // Initialize RPC client
    useEffect(() => {
        try {
            const client = createConfiguredRPCClient();
            setRpcClient(client);
            
            const wallet = createZcashWalletInstance(client);
            setWalletInstance(wallet);
        } catch (error) {
            console.warn("RPC client not configured, using offline mode:", error);
        }
    }, []);

    // Persist wallet in local storage for demo purposes
    useEffect(() => {
        const stored = localStorage.getItem("zcash_wallet");
        const storedShielded = localStorage.getItem("zcash_shielded");
        
        if (stored) {
            try {
                const wallet = JSON.parse(stored);
                setZcashAccount(wallet);
                setIsConnected(true);
            } catch (e) {
                console.error("Failed to load stored wallet", e);
            }
        }
        
        if (storedShielded) {
            try {
                const shielded = JSON.parse(storedShielded);
                setShieldedAccount(shielded);
                setIsShieldedEnabled(true);
            } catch (e) {
                console.error("Failed to load stored shielded account", e);
            }
        }
    }, []);

    const createWallet = (wordCount = 12) => {
        try {
            const wallet = generateZcashWallet(wordCount);
            // Don't save or connect yet - wait for backup verification
            return wallet;
        } catch (error) {
            console.error(error);
            toast.error("Failed to create wallet");
            return null;
        }
    };
    
    const finalizeWalletCreation = (wallet) => {
        // Called after backup verification is complete
        setZcashAccount(wallet);
        setIsConnected(true);
        localStorage.setItem("zcash_wallet", JSON.stringify(wallet));
        toast.success("Zcash wallet created and backed up!");
    };
    
    const createShieldedAddress = async () => {
        try {
            if (!walletInstance) {
                throw new Error("Wallet instance not initialized");
            }
            
            const address = await walletInstance.generateShieldedAddress('sapling');
            const viewingKey = await walletInstance.getViewingKey(address);
            
            const shieldedData = {
                address,
                viewingKey,
                type: AddressType.SHIELDED_SAPLING,
                createdAt: Date.now()
            };
            
            setShieldedAccount(shieldedData);
            setIsShieldedEnabled(true);
            localStorage.setItem("zcash_shielded", JSON.stringify(shieldedData));
            
            toast.success("Shielded address created!");
            return shieldedData;
        } catch (error) {
            console.error("Failed to create shielded address:", error);
            toast.error("Failed to create shielded address");
            return null;
        }
    };

    // Create and broadcast a mock bridge transaction (frontend simulation)
    const createBridgeTx = ({ commitment, nullifier, proof, amount, recipient }) => {
        const tx = createMockBridgeTx({ commitment, nullifier, proof, amount, recipient });
        // Store a last-bridge-tx for demo inspection
        localStorage.setItem('last_bridge_tx', JSON.stringify(tx));
        toast.success('Bridge transaction created (simulated)');
        return tx;
    };

    const importWallet = (mnemonic) => {
        try {
            const wallet = getWalletFromMnemonic(mnemonic);
            setZcashAccount(wallet);
            setIsConnected(true);
            localStorage.setItem("zcash_wallet", JSON.stringify(wallet));
            toast.success("Wallet imported successfully!");
            return wallet;
        } catch (error) {
            console.error(error);
            toast.error("Invalid mnemonic");
        }
    };
    
    const importViewingKey = async (viewingKey, label = '') => {
        try {
            if (!walletInstance) {
                throw new Error("Wallet instance not initialized");
            }
            
            const address = await walletInstance.importViewingKey(viewingKey, label);
            
            const shieldedData = {
                address,
                viewingKey,
                type: detectAddressType(address),
                viewingOnly: true,
                label,
                createdAt: Date.now()
            };
            
            setShieldedAccount(shieldedData);
            setIsShieldedEnabled(true);
            
            toast.success("Viewing key imported!");
            return shieldedData;
        } catch (error) {
            console.error("Failed to import viewing key:", error);
            toast.error("Failed to import viewing key");
            return null;
        }
    };
    
    const shieldFunds = async (amount = null, memo = '') => {
        try {
            if (!walletInstance || !zcashAccount || !shieldedAccount) {
                throw new Error("Wallet not fully initialized");
            }
            
            const txid = await walletInstance.shieldFunds(
                zcashAccount.transparentAddress,
                shieldedAccount.address,
                amount,
                memo
            );
            
            toast.success(`Shielding transaction submitted: ${txid.substring(0, 10)}...`);
            return txid;
        } catch (error) {
            console.error("Failed to shield funds:", error);
            toast.error(`Failed to shield funds: ${error.message}`);
            throw error;
        }
    };
    
    const unshieldFunds = async (amount, memo = '') => {
        try {
            if (!walletInstance || !zcashAccount || !shieldedAccount) {
                throw new Error("Wallet not fully initialized");
            }
            
            const txid = await walletInstance.unshieldFunds(
                shieldedAccount.address,
                zcashAccount.transparentAddress,
                amount,
                memo
            );
            
            toast.success(`Unshielding transaction submitted: ${txid.substring(0, 10)}...`);
            return txid;
        } catch (error) {
            console.error("Failed to unshield funds:", error);
            toast.error(`Failed to unshield funds: ${error.message}`);
            throw error;
        }
    };
    
    const sendShielded = async (toAddress, amount, memo = '') => {
        try {
            if (!walletInstance || !shieldedAccount) {
                throw new Error("Shielded wallet not initialized");
            }
            
            const recipients = [{ address: toAddress, amount, memo }];
            const txid = await walletInstance.sendShieldedTransaction(
                shieldedAccount.address,
                recipients
            );
            
            toast.success(`Shielded transaction sent: ${txid.substring(0, 10)}...`);
            return txid;
        } catch (error) {
            console.error("Failed to send shielded transaction:", error);
            toast.error(`Failed to send: ${error.message}`);
            throw error;
        }
    };
    
    const getShieldedBalance = async () => {
        try {
            if (!walletInstance || !shieldedAccount) {
                return 0;
            }
            
            const bal = await walletInstance.getBalance(shieldedAccount.address);
            return bal;
        } catch (error) {
            console.error("Failed to get shielded balance:", error);
            return 0;
        }
    };
    
    const checkCanShield = async () => {
        try {
            if (!walletInstance || !zcashAccount) {
                return { canShield: false };
            }
            
            return await walletInstance.canShield(zcashAccount.transparentAddress);
        } catch (error) {
            console.error("Failed to check shield status:", error);
            return { canShield: false };
        }
    };

    const disconnect = () => {
        setZcashAccount(null);
        setShieldedAccount(null);
        setIsConnected(false);
        setIsShieldedEnabled(false);
        localStorage.removeItem("zcash_wallet");
        localStorage.removeItem("zcash_shielded");
        toast.success("Wallet disconnected");
    };

    return (
        <ZcashContext.Provider
            value={{
                // Wallet state
                zcashAccount,
                shieldedAccount,
                balance: {
                    transparent: balance.transparent || 0,
                    shielded: balance.shielded || 0,
                    total: balance.total || 0,
                    pending: balance.pending || 0,
                    simulated: balance.simulated || 0,
                    // Computed: total available = transparent + shielded + simulated
                    available: (
                        parseFloat(balance.transparent || 0) + 
                        parseFloat(balance.shielded || 0) + 
                        parseFloat(balance.simulated || 0)
                    )
                },
                isConnected,
                isShieldedEnabled,
                walletInstance,
                rpcClient,
                
                // Wallet operations
                createWallet,
                finalizeWalletCreation,
                importWallet,
                disconnect,
                createBridgeTx,
                
                // Shielded operations
                createShieldedAddress,
                importViewingKey,
                shieldFunds,
                unshieldFunds,
                sendShielded,
                getShieldedBalance,
                checkCanShield,
                
                // Utilities
                simulateDeposit,
                isShieldedAddress,
                detectAddressType,
            }}
        >
            {children}
        </ZcashContext.Provider>
    );
}
