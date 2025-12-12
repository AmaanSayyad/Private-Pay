import { createContext, useContext, useState, useEffect } from "react";
import { generateZcashWallet, getWalletFromMnemonic } from "../lib/zcash";
import toast from "react-hot-toast";

const ZcashContext = createContext({});

export const useZcash = () => useContext(ZcashContext);

export default function ZcashProvider({ children }) {
    const [zcashAccount, setZcashAccount] = useState(null); // { address, mnemonic, ... }
    const [balance, setBalance] = useState({
        available: 0,
        pending: 0,
        simulated: parseFloat(localStorage.getItem("simulated_zcash") || "0")
    });
    const [isConnected, setIsConnected] = useState(false);

    const simulateDeposit = (amount) => {
        const newSimulated = (balance.simulated || 0) + parseFloat(amount);
        setBalance(prev => ({
            ...prev,
            simulated: newSimulated
        }));
        localStorage.setItem("simulated_zcash", newSimulated.toString());
        toast.success(`Received incoming transfer: ${amount} tZEC (Simulated)`);
    };

    // Persist wallet in local storage for demo purposes
    useEffect(() => {
        const stored = localStorage.getItem("zcash_wallet");
        if (stored) {
            try {
                const wallet = JSON.parse(stored);
                setZcashAccount(wallet);
                setIsConnected(true);
            } catch (e) {
                console.error("Failed to load stored wallet", e);
            }
        }
    }, []);

    const createWallet = () => {
        try {
            const wallet = generateZcashWallet();
            setZcashAccount(wallet);
            setIsConnected(true);
            localStorage.setItem("zcash_wallet", JSON.stringify(wallet));
            toast.success("New Zcash wallet created!");
            return wallet;
        } catch (error) {
            console.error(error);
            toast.error("Failed to create wallet");
        }
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

    const disconnect = () => {
        setZcashAccount(null);
        setIsConnected(false);
        localStorage.removeItem("zcash_wallet");
        toast.success("Wallet disconnected");
    };

    return (
        <ZcashContext.Provider
            value={{
                zcashAccount,
                isConnected,
                balance: {
                    ...balance,
                    available: (parseFloat(balance.available) + parseFloat(balance.simulated || 0)).toFixed(4),
                    simulated: balance.simulated
                },
                createWallet,
                importWallet,
                disconnect,
                simulateDeposit
            }}
        >
            {children}
        </ZcashContext.Provider>
    );
}
