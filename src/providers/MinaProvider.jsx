import { createContext, useContext, useState, useEffect } from "react";
import {
    checkMinaProvider,
    connectMinaWallet,
    getMinaBalance,
    requestNetwork
} from "../lib/mina";
import toast from "react-hot-toast";

const MinaContext = createContext({});

export const useMina = () => useContext(MinaContext);

export default function MinaProvider({ children }) {
    const [minaAccount, setMinaAccount] = useState(null);
    const [minaBalance, setMinaBalance] = useState({
        total: 0,
        liquid: 0,
        simulated: parseFloat(localStorage.getItem("simulated_mina") || "0")
    });
    const [network, setNetwork] = useState(null);
    const [isConnected, setIsConnected] = useState(false);

    const simulateDeposit = (amount) => {
        const newSimulated = (minaBalance.simulated || 0) + parseFloat(amount);
        setMinaBalance(prev => ({
            ...prev,
            simulated: newSimulated
        }));
        localStorage.setItem("simulated_mina", newSimulated.toString());
        toast.success(`Received incoming transfer: ${amount} MINA (Simulated)`);
    };
    const [isInstalled, setIsInstalled] = useState(false);

    // Initial check for Auro wallet
    useEffect(() => {
        const checkInstall = () => {
            const installed = checkMinaProvider();
            setIsInstalled(installed);
            if (installed && window.mina) {
                // Add event listeners if available (Auro specific)
                window.mina.on('accountsChanged', (accounts) => {
                    if (accounts.length > 0) {
                        setMinaAccount(accounts[0]);
                        setIsConnected(true);
                        updateBalance(accounts[0]);
                    } else {
                        disconnect();
                    }
                });

                window.mina.on('chainChanged', (chain) => {
                    setNetwork(chain);
                    updateBalance(minaAccount);
                });
            }
        };

        checkInstall();
        // Retry check after a moment in case extension loads slowly
        setTimeout(checkInstall, 500);
        setTimeout(checkInstall, 2000);
    }, []);

    const updateBalance = async (address) => {
        if (!address) return;
        const bal = await getMinaBalance(address);
        setMinaBalance(bal);

        const net = await requestNetwork();
        setNetwork(net);
    };

    const connect = async () => {
        try {
            const accounts = await connectMinaWallet();
            if (accounts && accounts.length > 0) {
                setMinaAccount(accounts[0]);
                setIsConnected(true);
                await updateBalance(accounts[0]);
                return accounts[0];
            }
        } catch (error) {
            console.error("Failed to connect Mina wallet:", error);
            throw error;
        }
    };

    const disconnect = () => {
        setMinaAccount(null);
        setIsConnected(false);
        setMinaBalance({ total: 0, liquid: 0 });
        setNetwork(null);
    };

    return (
        <MinaContext.Provider
            value={{
                minaAccount,
                isConnected,
                isInstalled,
                minaBalance: {
                    ...minaBalance,
                    total: (parseFloat(minaBalance.total) + parseFloat(minaBalance.simulated || 0)).toFixed(2)
                },
                network,
                connect,
                disconnect,
                simulateDeposit
            }}
        >
            {children}
        </MinaContext.Provider>
    );
}
