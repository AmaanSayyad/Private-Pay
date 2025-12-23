import React, { useEffect, useState, useCallback } from 'react';
import { useChain } from '@cosmos-kit/react';
import { BridgeComponent } from '../components/osmosis/BridgeComponent';
import { PrivacyPayment } from '../components/osmosis/PrivacyPayment';
import { SwapComponent } from '../components/osmosis/SwapComponent';
import { CosmosWalletButton } from '../components/osmosis/CosmosWalletButton';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardBody, Chip, Tabs, Tab, Button, Tooltip } from '@nextui-org/react';
import { Shield, Eye, EyeOff, ArrowLeftRight, Coins, Zap, RefreshCw, BarChart3, Lock, ExternalLink, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OsmosisPage() {
  const { address, status, getCosmWasmClient } = useChain('osmosis');
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [blockHeight, setBlockHeight] = useState('...');

  const fetchChainData = useCallback(async () => {
    if (status === 'Connected' && address) {
      try {
        setLoading(true);
        const client = await getCosmWasmClient();
        const coin = await client.getBalance(address, 'uosmo');
        setBalance(coin);

        const height = await client.getHeight();
        setBlockHeight(height.toLocaleString());
      } catch (error) {
        console.error('Error fetching chain data:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setBalance(null);
    }
  }, [status, address, getCosmWasmClient]);

  useEffect(() => {
    fetchChainData();

    // Refresh height every 15s
    const interval = setInterval(fetchChainData, 15000);
    return () => clearInterval(interval);
  }, [fetchChainData]);

  const togglePrivacy = () => {
    setPrivacyMode(!privacyMode);
    if (!privacyMode) {
      toast.success('Privacy Mode Enabled: Shielding active');
    }
  };

  return (
    <div className="flex flex-col items-center justify-start w-full min-h-screen gap-8 p-4 md:p-8 pb-32 bg-[#fafafa]">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[20%] -left-[10%] w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[20%] -right-[10%] w-[500px] h-[500px] bg-indigo-100/30 rounded-full blur-[120px]" />
      </div>

      <div className="flex flex-col items-center gap-2 mb-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex items-center gap-3"
        >
          <div className="w-14 h-14 rounded-3xl bg-white shadow-xl flex items-center justify-center p-2 border border-blue-50">
            <img src="/assets/osmosis-logo.png" alt="Osmosis" className="w-10 h-10 object-contain" />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 bg-clip-text text-transparent tracking-tight">
              Osmosis
            </h1>
            <div className="flex items-center gap-2">
              <Chip size="sm" variant="flat" color="primary" className="font-bold text-[10px] uppercase tracking-wider">L5 Privacy</Chip>
              <div className="w-1 h-1 rounded-full bg-gray-300" />
              <span className="text-gray-400 text-xs font-medium uppercase tracking-widest">Interchain DEX</span>
            </div>
          </div>
        </motion.div>
      </div>

      {status !== 'Connected' ? (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-md w-full"
        >
          <Card className="bg-white/80 backdrop-blur-xl border border-white shadow-2xl rounded-3xl">
            <CardBody className="flex flex-col items-center justify-center py-16 gap-8">
              <div className="relative">
                <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-200">
                  <Lock className="w-10 h-10 text-white" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-400 border-4 border-white flex items-center justify-center">
                  <Zap className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-gray-900">Connect Experience</h3>
                <p className="text-gray-500 text-sm max-w-[240px] leading-relaxed mx-auto">
                  Access the most advanced privacy-preserving liquidity layer in Cosmos.
                </p>
              </div>
              <CosmosWalletButton />
            </CardBody>
          </Card>
        </motion.div>
      ) : (
        <div className="flex flex-col w-full max-w-7xl gap-8">
          {/* Top Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 border-none shadow-xl rounded--[32px] overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl transition-transform group-hover:scale-110" />
              <CardBody className="p-8 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="space-y-4">
                    <div>
                      <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Portfolio Balance</p>
                      <div className="flex items-baseline gap-3">
                        <h2 className="text-5xl font-black text-white tracking-tighter">
                          {showBalance && !privacyMode
                            ? (loading ? '...' : balance ? `$${(Number(balance.amount) / 1_000_000 * 1.5).toFixed(2)}` : '$0.00')
                            : '••••••'}
                        </h2>
                        <span className="text-blue-200 font-bold">USD</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <span className="text-blue-200 text-[10px] font-bold uppercase">Staked OSMO</span>
                        <span className="text-white font-bold opacity-90">{showBalance ? '1,240.45' : '••••'}</span>
                      </div>
                      <div className="w-px h-8 bg-white/20" />
                      <div className="flex flex-col">
                        <span className="text-blue-200 text-[10px] font-bold uppercase">Pending Rewards</span>
                        <span className="text-emerald-300 font-bold">+12.4%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Tooltip content={showBalance ? "Hide Balance" : "Show Balance"} closeDelay={0}>
                      <Button
                        isIconOnly
                        onClick={() => setShowBalance(!showBalance)}
                        className="bg-white/20 backdrop-blur-md text-white hover:bg-white/30 border border-white/30 rounded-2xl"
                      >
                        {showBalance ? <EyeOff size={18} /> : <Eye size={18} />}
                      </Button>
                    </Tooltip>
                    <Tooltip content="Privacy Status" closeDelay={0}>
                      <Button
                        onClick={togglePrivacy}
                        className={`flex items-center gap-2 h-10 px-4 rounded-2xl border transition-all ${privacyMode
                          ? 'bg-emerald-400 text-white border-transparent shadow-lg shadow-emerald-400/20 font-bold'
                          : 'bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/30'
                          }`}
                      >
                        <Shield size={16} fill={privacyMode ? "currentColor" : "none"} />
                        <span className="text-xs uppercase tracking-wider">{privacyMode ? 'Shielded' : 'Public'}</span>
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </CardBody>
            </Card>

            <Card className="bg-white border border-gray-100 shadow-xl rounded-[32px] p-2">
              <CardBody className="p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="bg-blue-50 p-2 rounded-xl">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </span>
                    <Chip size="sm" color="success" variant="flat" className="font-bold text-[10px]">LIVE</Chip>
                  </div>
                  <h3 className="text-lg font-black text-gray-900">Chain Activity</h3>
                  <p className="text-gray-500 text-xs mt-1">Osmosis Mainnet-1</p>
                </div>
                <div className="space-y-3 mt-6">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Block Height</span>
                    <span className="text-gray-800 font-bold uppercase tracking-tighter">#{blockHeight}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Avg Gas Price</span>
                    <span className="text-gray-800 font-bold uppercase tracking-tighter">0.0025 OSMO</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">TPS</span>
                    <span className="text-emerald-500 font-bold uppercase tracking-tighter">~45/sec</span>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Main Workspace */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
            <div className="xl:col-span-8 space-y-8">
              <Tabs
                selectedKey={activeTab}
                onSelectionChange={setActiveTab}
                variant="light"
                color="primary"
                size="lg"
                classNames={{
                  tabList: "bg-white/50 p-1 rounded-2xl border border-gray-100 shadow-sm",
                  tab: "rounded-xl h-12 font-bold",
                  cursor: "bg-white shadow-md rounded-xl border border-gray-100",
                  tabContent: "group-data-[selected=true]:text-blue-700",
                }}
              >
                <Tab
                  key="overview"
                  title={
                    <div className="flex items-center gap-2 px-2">
                      <Coins size={18} />
                      <span>Overview</span>
                    </div>
                  }
                >
                  <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <SwapComponent />
                    <PrivacyPayment />
                  </div>
                </Tab>
                <Tab
                  key="swap"
                  title={
                    <div className="flex items-center gap-2 px-2">
                      <RefreshCw size={18} />
                      <span>Swap</span>
                    </div>
                  }
                >
                  <div className="pt-6 max-w-xl mx-auto">
                    <SwapComponent />
                  </div>
                </Tab>
                <Tab
                  key="bridge"
                  title={
                    <div className="flex items-center gap-2 px-2">
                      <ArrowLeftRight size={18} />
                      <span>Bridge</span>
                    </div>
                  }
                >
                  <div className="pt-6 max-w-xl mx-auto">
                    <BridgeComponent />
                  </div>
                </Tab>
                <Tab
                  key="shield"
                  title={
                    <div className="flex items-center gap-2 px-2">
                      <Shield size={18} />
                      <span>Privacy</span>
                    </div>
                  }
                >
                  <div className="pt-6 max-w-xl mx-auto">
                    <PrivacyPayment />
                  </div>
                </Tab>
                <Tab
                  key="liquidity"
                  title={
                    <div className="flex items-center gap-2 px-2">
                      <BarChart3 size={18} />
                      <span>Liquidity</span>
                    </div>
                  }
                >
                  <div className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="bg-white border border-gray-200 p-4">
                        <CardBody>
                          <h4 className="font-bold mb-4">Your Liquidity</h4>
                          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                            <BarChart3 size={40} className="mb-2 opacity-20" />
                            <p className="text-sm">No active positions found</p>
                            <Button size="sm" color="primary" variant="flat" className="mt-4 font-bold">Add Liquidity</Button>
                          </div>
                        </CardBody>
                      </Card>
                      <Card className="bg-white border border-gray-200 p-4">
                        <CardBody>
                          <h4 className="font-bold mb-4">Earnings</h4>
                          <div className="space-y-4">
                            <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                              <span className="text-xs text-gray-500">Total Rewards</span>
                              <span className="font-bold">0.00 OSMO</span>
                            </div>
                            <Button className="w-full bg-blue-600 text-white font-bold" isDisabled>Claim All Rewards</Button>
                          </div>
                        </CardBody>
                      </Card>
                    </div>
                  </div>
                </Tab>
              </Tabs>

              {/* Network Stats Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl overflow-hidden">
                  <CardBody className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-blue-50 rounded-2xl">
                        <BarChart3 className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-black text-gray-900">Liquidity Pools</h3>
                        <p className="text-gray-500 text-xs">Direct integration with Osmosis Gamm</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {[
                        { pair: "ATOM/OSMO", apr: "12.5%", tvl: "$45.2M" },
                        { pair: "USDC/OSMO", apr: "8.2%", tvl: "$32.1M" },
                        { pair: "TIA/OSMO", apr: "24.1%", tvl: "$18.5M" },
                      ].map((pool, i) => (
                        <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100 hover:border-blue-200 hover:bg-white transition-all cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="flex -space-x-2">
                              <div className="w-6 h-6 rounded-full bg-blue-600 border-2 border-white" />
                              <div className="w-6 h-6 rounded-full bg-gray-600 border-2 border-white" />
                            </div>
                            <span className="font-bold text-sm text-gray-900">{pool.pair}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-emerald-500 font-black text-xs">{pool.apr} APR</div>
                            <div className="text-gray-400 text-[10px] font-medium">{pool.tvl} TVL</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <Button variant="light" color="primary" className="w-full mt-4 font-bold" endContent={<ExternalLink size={14} />}>
                      View All Pools
                    </Button>
                  </CardBody>
                </Card>

                <Card className="bg-gradient-to-br from-indigo-700 to-blue-900 border-none shadow-xl rounded-3xl overflow-hidden relative">
                  <div className="absolute inset-0 bg-[url('https://osmosis.zone/assets/hero-bg.svg')] opacity-20" />
                  <CardBody className="p-8 relative z-10 flex flex-col justify-center items-center text-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center">
                      <Zap className="w-8 h-8 text-white animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white mb-2">Private IBC</h3>
                      <p className="text-blue-100/70 text-sm max-w-[240px]">
                        Osmosis enables private cross-chain transactions through advanced IBC shielding.
                      </p>
                    </div>
                    <Button className="bg-white text-indigo-900 font-black rounded-2xl px-8 h-12 shadow-xl hover:scale-105 transition-transform">
                      Shield Assets Now
                    </Button>
                  </CardBody>
                </Card>
              </div>
            </div>

            {/* Sidebar / Activity Feed */}
            <div className="xl:col-span-4 space-y-6">
              <Card className="bg-white border border-gray-100 shadow-xl rounded--[32px]">
                <CardBody className="p-6">
                  <h3 className="font-black text-gray-900 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Recent Operations
                  </h3>
                  <div className="space-y-6">
                    {[1, 2, 3].map((_, i) => (
                      <div key={i} className="flex gap-4 relative">
                        {i !== 2 && <div className="absolute left-4 top-10 bottom-0 w-px bg-gray-100" />}
                        <div className="w-8 h-8 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0 z-10">
                          {i === 0 ? <ArrowLeftRight size={14} className="text-blue-500" /> :
                            i === 1 ? <RefreshCw size={14} className="text-indigo-500" /> :
                              <Shield size={14} className="text-emerald-500" />}
                        </div>
                        <div className="flex-1 pb-2">
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-xs font-black text-gray-900">
                              {i === 0 ? 'Bridge Transfer' : i === 1 ? 'Token Swap' : 'Privacy Shield'}
                            </p>
                            <span className="text-[10px] text-gray-400 font-medium uppercase">2m ago</span>
                          </div>
                          <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
                            {i === 0 ? 'Transferred 500 OSMO to Zcash' :
                              i === 1 ? 'Swapped 10 ATOM for 125 OSMO' :
                                'Generated stealth link for account'}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-[10px] font-bold text-gray-400 font-mono tracking-tighter">0x4F...77Ab</span>
                            <ExternalLink size={10} className="text-gray-300" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>

              <Card className="bg-amber-50 border border-amber-100 shadow-sm rounded-3xl">
                <CardBody className="p-6 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-black text-amber-900">Security Recommendation</h4>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      Always verify the recipient address before initiating a bridge transaction. Bridge operations are irreversible.
                    </p>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
