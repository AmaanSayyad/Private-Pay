import React, { useEffect, useState } from 'react';
import { useChain } from '@cosmos-kit/react';
import { CosmosWalletButton } from '../components/osmosis/CosmosWalletButton';
import { BridgeComponent } from '../components/osmosis/BridgeComponent';
import { PrivacyPayment } from '../components/osmosis/PrivacyPayment';
import { motion } from 'framer-motion';

export default function OsmosisPage() {
  const { address, status, getCosmWasmClient } = useChain('osmosis');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);

  useEffect(() => {
    async function fetchBalance() {
      if (status === 'Connected' && address) {
        try {
          setLoading(true);
          const client = await getCosmWasmClient();
          const coin = await client.getBalance(address, 'uosmo');
          setBalance(coin);
        } catch (error) {
          console.error('Error fetching balance:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setBalance(null);
      }
    }
    fetchBalance();
  }, [status, address, getCosmWasmClient]);

  const togglePrivacy = () => setPrivacyMode(!privacyMode);

  return (
    <div className="min-h-screen bg-white text-black p-8 mt-20">
        <div className="max-w-6xl mx-auto space-y-8 ">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-gray-800/20 pb-6 gap-4">
                <div className="flex items-center gap-3">
                    <img src="/assets/osmosis-logo.png" alt="Osmosis" className="w-10 h-10 rounded-full" />
                <div>
                    <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-purple-500 to-pink-600">
                        Osmosis Privacy Layer
                    </h1>
                    <p className="text-gray-400 mt-2">Interchain Shielded Pool & Asset Bridge</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={togglePrivacy}
                        className={`flex items-center gap-2 px-4 py-2 rounded-3xl border transition-all ${
                            privacyMode 
                            ? 'bg-purple-500 text-white' 
                            : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500'
                        }`}
                    >
                        {privacyMode ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        )}
                        {privacyMode ? 'Privacy ON' : 'Privacy OFF'}
                    </button>
                    <CosmosWalletButton />
                </div>
            </header>

            <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Balance Card - Enhanced */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="border border-gray-800/20 rounded-xl p-6 backdrop-blur-sm lg:col-span-1 shadow-lg"
                >
                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>
                        Assets
                    </h2>
                    
                    <div className="space-y-6">
                        <div className=" p-4 rounded-lg border border-gray-800/20">
                             <span className="text-gray-500 text-sm block mb-1">Total Balance</span>
                             <span className={`text-3xl font-mono font-bold ${privacyMode ? 'blur-md' : ''} transition-all duration-300`}>
                                 {loading ? '...' : privacyMode ? '$0.00' : balance ? `$${(Number(balance.amount) / 1_000_000 * 1.5).toFixed(2)}` : '$0.00'}
                             </span>
                        </div>

                         <div className="flex justify-between items-center pt-2">
                            <span className="text-gray-400">OSMO</span>
                            <span className={`font-mono font-bold ${privacyMode ? 'blur-sm text-gray-500' : ''}`}>
                                {loading ? '...' : balance ? `${(Number(balance.amount) / 1_000_000).toFixed(4)}` : '0.0000'}
                            </span>
                        </div>
                    </div>
                </motion.div>

                {/* Bridge Component - New */}
                <div className="lg:col-span-2">
                     <BridgeComponent />
                </div>

                {/* Privacy Payment Form - New */}
                <div className="lg:col-span-3">
                     <PrivacyPayment />
                </div>
            </main>
        </div>
    </div>
  );
}
