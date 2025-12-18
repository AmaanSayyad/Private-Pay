import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRightLeft, Wallet, Clock, Shield, Lock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { useStarknet } from "../providers/StarknetProvider";

export default function ZtarknetSwapPage() {
  const { account, isConnected, connect, balance, initiateSwap, claimSwap, refundSwap } = useStarknet();
  const [activeTab, setActiveTab] = useState("create");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [fromAsset, setFromAsset] = useState("ZEC");
  const [toAsset, setToAsset] = useState("ETH");
  const [timelock, setTimelock] = useState("3600");
  const [claimSwapId, setClaimSwapId] = useState("");
  const [preimage, setPreimage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [swaps, setSwaps] = useState([]);
  const [generatedHashlock, setGeneratedHashlock] = useState("");
  const [generatedPreimage, setGeneratedPreimage] = useState("");

  const generateHashlock = () => {
    const preimageBytes = crypto.getRandomValues(new Uint8Array(32));
    const preimageHex = "0x" + Array.from(preimageBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    setGeneratedPreimage(preimageHex);

    // Simple hash for demo (in production use proper crypto)
    const hashlock = "0x" + Array.from(preimageBytes).reverse().map(b => b.toString(16).padStart(2, '0')).join('');
    setGeneratedHashlock(hashlock);
    return { preimage: preimageHex, hashlock };
  };

  const handleCreateSwap = async () => {
    if (!fromAmount || !toAmount) return;
    setIsLoading(true);

    try {
      const { preimage: newPreimage, hashlock } = generateHashlock();
      const starknetAsset = toAsset === "ETH"
        ? "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7"
        : "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";

      const result = await initiateSwap(
        parseFloat(fromAmount),
        starknetAsset,
        parseFloat(toAmount),
        account,
        hashlock,
        parseInt(timelock)
      );

      setSwaps(prev => [...prev, {
        id: Date.now(),
        fromAsset,
        fromAmount,
        toAsset,
        toAmount,
        status: "pending",
        timelock: parseInt(timelock),
        createdAt: Date.now(),
        hashlock: hashlock.slice(0, 10) + "..." + hashlock.slice(-4),
        preimage: newPreimage,
        txHash: result?.transaction_hash,
      }]);

      setFromAmount("");
      setToAmount("");
    } catch (error) {
      console.error("Swap creation failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClaimSwap = async () => {
    if (!claimSwapId || !preimage) return;
    setIsLoading(true);

    try {
      await claimSwap(claimSwapId, preimage);
      setSwaps(prev => prev.map(s =>
        s.id.toString() === claimSwapId ? { ...s, status: "claimed" } : s
      ));
      setClaimSwapId("");
      setPreimage("");
    } catch (error) {
      console.error("Claim failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefundSwap = async (swapId) => {
    setIsLoading(true);
    try {
      await refundSwap(swapId);
      setSwaps(prev => prev.map(s =>
        s.id === swapId ? { ...s, status: "refunded" } : s
      ));
    } catch (error) {
      console.error("Refund failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-700";
      case "claimed": return "bg-green-100 text-green-700";
      case "refunded": return "bg-gray-100 text-gray-700";
      case "expired": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getTimeRemaining = (createdAt, timelock) => {
    const elapsed = (Date.now() - createdAt) / 1000;
    const remaining = timelock - elapsed;
    if (remaining <= 0) return "Expired";
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="/assets/starknet-logo.png" alt="Starknet" className="w-12 h-12 rounded-full" />
          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{ color: '#0d08e3' }}>Atomic Swap</h1>
            <p className="text-gray-600 text-sm">Trustless ZEC ↔ Starknet asset swaps</p>
          </div>
        </div>

        {/* How it Works */}
        <div className="bg-white/80 backdrop-blur-xl border-2 border-indigo-200 shadow-xl rounded-2xl p-5 mb-6">
          <h3 className="font-bold mb-4 text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: '#0d08e3' }} />
            How Atomic Swaps Work
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#0d08e3' }}>1</div>
              <div>
                <p className="font-bold text-sm">Create Swap</p>
                <p className="text-xs text-gray-500">Lock assets with hashlock</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#0d08e3' }}>2</div>
              <div>
                <p className="font-bold text-sm">Counterparty Locks</p>
                <p className="text-xs text-gray-500">Other party locks their assets</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#0d08e3' }}>3</div>
              <div>
                <p className="font-bold text-sm">Reveal Preimage</p>
                <p className="text-xs text-gray-500">Claim with secret preimage</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: '#0d08e3' }}>4</div>
              <div>
                <p className="font-bold text-sm">Complete Swap</p>
                <p className="text-xs text-gray-500">Both parties receive assets</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Actions */}
          <div className="space-y-6">
            {!isConnected ? (
              <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/10 to-indigo-500/10 border-2 border-indigo-300/50 shadow-xl backdrop-blur-sm rounded-2xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center shadow-xl" style={{ backgroundColor: '#0d08e3' }}>
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-900">Connect Wallet</h3>
                <p className="text-gray-600 text-sm mb-4">Connect your Starknet wallet to start swapping</p>
                <button
                  onClick={() => connect("argentX")}
                  className="mx-auto px-6 py-3 text-white rounded-xl hover:scale-105 transition-all shadow-xl font-bold flex items-center gap-2 justify-center"
                  style={{ backgroundColor: '#0d08e3' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0a06b8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0d08e3'}
                >
                  <img src="/assets/argentx_logo.png" alt="ArgentX" className="w-5 h-5 rounded-full" />
                  Connect Wallet
                </button>
              </div>
            ) : (
              <>
                {/* Tab Selector */}
                <div className="bg-white/80 backdrop-blur-xl border-2 border-gray-200 shadow-xl rounded-2xl p-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveTab("create")}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                        activeTab === "create"
                          ? "text-white shadow-lg"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                      style={activeTab === "create" ? { backgroundColor: '#0d08e3' } : {}}
                    >
                      <ArrowRightLeft className="w-4 h-4 inline mr-2" />
                      Create Swap
                    </button>
                    <button
                      onClick={() => setActiveTab("claim")}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                        activeTab === "claim"
                          ? "text-white shadow-lg"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                      style={activeTab === "claim" ? { backgroundColor: '#0d08e3' } : {}}
                    >
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Claim Swap
                    </button>
                  </div>
                </div>

                {/* Create Swap Form */}
                {activeTab === "create" && (
                  <div className="bg-white/80 backdrop-blur-xl border-2 border-indigo-200 shadow-xl rounded-2xl p-5">
                    <h3 className="text-base font-bold mb-4 text-gray-900 flex items-center gap-2">
                      <ArrowRightLeft className="w-5 h-5" style={{ color: '#0d08e3' }} />
                      Create Atomic Swap
                    </h3>

                    <div className="space-y-4">
                      {/* From */}
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-xl p-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">You Send</label>
                        <div className="flex gap-3 items-center">
                          <img 
                            src={fromAsset === "ZEC" ? "/assets/zcash_logo.png" : fromAsset === "ETH" ? "/assets/eth-logo.png" : "/assets/starknet-logo.png"} 
                            alt={fromAsset} 
                            className="w-8 h-8 rounded-full flex-shrink-0" 
                          />
                          <input
                            type="number"
                            value={fromAmount}
                            onChange={(e) => setFromAmount(e.target.value)}
                            placeholder="0.0"
                            className="flex-1 bg-transparent text-2xl font-bold focus:outline-none"
                          />
                          <select
                            value={fromAsset}
                            onChange={(e) => setFromAsset(e.target.value)}
                            className="px-4 py-2 bg-white rounded-lg border-2 border-gray-200 font-semibold"
                            onFocus={(e) => e.currentTarget.style.borderColor = '#0d08e3'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                          >
                            <option value="ZEC">ZEC</option>
                            <option value="ETH">ETH</option>
                            <option value="STRK">STRK</option>
                          </select>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex justify-center">
                        <div className="p-2 rounded-full" style={{ backgroundColor: '#0d08e3' }}>
                          <ArrowRightLeft className="w-5 h-5 text-white" />
                        </div>
                      </div>

                      {/* To */}
                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-xl p-4">
                        <label className="block text-sm font-bold text-gray-700 mb-2">You Receive</label>
                        <div className="flex gap-3 items-center">
                          <img 
                            src={toAsset === "ZEC" ? "/assets/zcash_logo.png" : toAsset === "ETH" ? "/assets/eth-logo.png" : "/assets/starknet-logo.png"} 
                            alt={toAsset} 
                            className="w-8 h-8 rounded-full flex-shrink-0" 
                          />
                          <input
                            type="number"
                            value={toAmount}
                            onChange={(e) => setToAmount(e.target.value)}
                            placeholder="0.0"
                            className="flex-1 bg-transparent text-2xl font-bold focus:outline-none"
                          />
                          <select
                            value={toAsset}
                            onChange={(e) => setToAsset(e.target.value)}
                            className="px-4 py-2 bg-white rounded-lg border-2 border-gray-200 font-semibold"
                            onFocus={(e) => e.currentTarget.style.borderColor = '#0d08e3'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                          >
                            <option value="ETH">ETH</option>
                            <option value="ZEC">ZEC</option>
                            <option value="STRK">STRK</option>
                          </select>
                        </div>
                      </div>

                      {/* Timelock */}
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
                          <Clock className="w-4 h-4" style={{ color: '#0d08e3' }} />
                          Timelock Duration
                        </label>
                        <select
                          value={timelock}
                          onChange={(e) => setTimelock(e.target.value)}
                          className="w-full p-3 border-2 border-gray-200 rounded-xl font-semibold"
                          onFocus={(e) => e.currentTarget.style.borderColor = '#0d08e3'}
                          onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                        >
                          <option value="3600">1 Hour</option>
                          <option value="7200">2 Hours</option>
                          <option value="14400">4 Hours</option>
                          <option value="86400">24 Hours</option>
                        </select>
                      </div>

                      <button
                        onClick={handleCreateSwap}
                        disabled={!fromAmount || !toAmount}
                        className="w-full py-4 text-white rounded-xl font-bold hover:scale-[1.01] transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        style={{ backgroundColor: '#0d08e3' }}
                        onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#0a06b8')}
                        onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#0d08e3')}
                      >
                        <Lock className="w-4 h-4 inline mr-2" />
                        Create Swap
                      </button>
                    </div>
                  </div>
                )}

                {/* Claim Swap Form */}
                {activeTab === "claim" && (
                  <div className="bg-white/80 backdrop-blur-xl border-2 border-indigo-200 shadow-xl rounded-2xl p-5">
                    <h3 className="text-base font-bold mb-4 text-gray-900 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" style={{ color: '#0d08e3' }} />
                      Claim Swap
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">Swap ID</label>
                        <input
                          type="text"
                          value={claimSwapId}
                          onChange={(e) => setClaimSwapId(e.target.value)}
                          placeholder="Enter swap ID..."
                          className="w-full p-3 border-2 border-gray-200 rounded-xl font-semibold"
                          onFocus={(e) => e.currentTarget.style.borderColor = '#0d08e3'}
                          onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">Preimage (Secret)</label>
                        <input
                          type="text"
                          value={preimage}
                          onChange={(e) => setPreimage(e.target.value)}
                          placeholder="Enter preimage to claim..."
                          className="w-full p-3 border-2 border-gray-200 rounded-xl font-mono text-sm"
                          onFocus={(e) => e.currentTarget.style.borderColor = '#0d08e3'}
                          onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                        />
                      </div>

                      <button
                        onClick={handleClaimSwap}
                        disabled={!claimSwapId || !preimage}
                        className="w-full py-4 text-white rounded-xl font-bold hover:scale-[1.01] transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        style={{ backgroundColor: '#0d08e3' }}
                        onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#0a06b8')}
                        onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#0d08e3')}
                      >
                        <CheckCircle className="w-4 h-4 inline mr-2" />
                        Claim Swap
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Swap History */}
          <div className="space-y-5">
            <div className="bg-white/80 backdrop-blur-xl border-2 border-gray-200 shadow-xl rounded-2xl p-5">
              <h3 className="text-base font-bold mb-4 text-gray-900 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5" style={{ color: '#0d08e3' }} />
                Your Swaps
              </h3>

              {swaps.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <ArrowRightLeft className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="font-medium">No swaps yet</p>
                  <p className="text-sm text-gray-400 mt-1">Create a swap to get started</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {swaps.map((swap) => (
                    <div key={swap.id} className="p-4 rounded-xl border-2 border-indigo-200 bg-indigo-50 hover:border-indigo-300 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${getStatusColor(swap.status)}`}>
                            {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
                          </span>
                          <p className="font-bold mt-2">
                            {swap.fromAmount} {swap.fromAsset} → {swap.toAmount} {swap.toAsset}
                          </p>
                          <p className="text-xs text-gray-500 font-mono mt-1">
                            Hashlock: {swap.hashlock}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-semibold">{getTimeRemaining(swap.createdAt, swap.timelock)}</span>
                          </div>
                        </div>
                      </div>

                      {swap.status === "pending" && (
                        <button
                          onClick={() => handleRefundSwap(swap.id)}
                          className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors"
                        >
                          <RefreshCw className="w-4 h-4 inline mr-1" />
                          Refund (after timelock)
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Security Info */}
            <div className="rounded-2xl p-5 text-white shadow-xl" style={{ backgroundColor: '#0d08e3' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold">Trustless & Secure</h3>
              </div>
              <p className="text-indigo-100 text-sm leading-relaxed">
                Atomic swaps use Hash Time-Locked Contracts (HTLCs). Either both parties
                complete the swap, or both get refunded. No trusted third party required.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
