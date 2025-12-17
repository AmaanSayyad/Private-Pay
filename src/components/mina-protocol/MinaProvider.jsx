import { createContext, useContext, useState, useEffect } from "react";
import {
    checkMinaProvider,
    connectMinaWallet,
    getMinaBalance,
    requestNetwork
} from "./mina";
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

    const simulateDeposit = async (amount) => {
        try {
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                throw new Error('Invalid amount');
            }
            const newSimulated = (minaBalance.simulated || 0) + amountNum;
            setMinaBalance(prev => ({
                ...prev,
                simulated: newSimulated
            }));
            const txHash = `mina_sim_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem("simulated_mina", newSimulated.toString());
            toast.success(`Received incoming transfer: ${amount} MINA (Simulated)`);
            return txHash;
        } catch (error) {
            console.error('Error in simulateDeposit:', error);
            toast.error(`Failed to simulate deposit: ${error.message}`);
            throw error;
        }
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
        try {
            const bal = await getMinaBalance(address);
            setMinaBalance(prev => ({
                ...bal,
                simulated: prev?.simulated || 0  // Keep existing simulated balance
            }));

            const net = await requestNetwork();
            setNetwork(net);
            return bal;
        } catch (error) {
            console.error('Error updating balance:', error);
            throw error;
        }
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
                updateBalance,
                minaBalance: {
                    ...minaBalance,
                    total: (parseFloat(minaBalance.liquid || 0) + parseFloat(minaBalance.simulated || 0)).toFixed(2)
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
