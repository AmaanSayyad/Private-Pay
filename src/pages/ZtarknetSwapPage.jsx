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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50 to-purple-50">
      <div className="max-w-6xl mx-auto px-4 py-8 pb-24">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/starknet"
            className="p-2 rounded-full bg-white shadow-md hover:shadow-lg transition-shadow"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Atomic Swap</h1>
            <p className="text-gray-600">Trustless ZEC ↔ Starknet asset swaps</p>
          </div>
        </div>

        {/* How it Works */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100 mb-8">
          <h3 className="font-semibold mb-4">How Atomic Swaps Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">1</div>
              <div>
                <p className="font-medium text-sm">Create Swap</p>
                <p className="text-xs text-gray-500">Lock assets with hashlock</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">2</div>
              <div>
                <p className="font-medium text-sm">Counterparty Locks</p>
                <p className="text-xs text-gray-500">Other party locks their assets</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">3</div>
              <div>
                <p className="font-medium text-sm">Reveal Preimage</p>
                <p className="text-xs text-gray-500">Claim with secret preimage</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-medium">4</div>
              <div>
                <p className="font-medium text-sm">Complete Swap</p>
                <p className="text-xs text-gray-500">Both parties receive assets</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Actions */}
          <div className="space-y-6">
            {!isConnected ? (
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
                <Wallet className="w-12 h-12 mx-auto mb-4 text-indigo-500" />
                <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
                <p className="text-gray-500 mb-4">Connect your Starknet wallet to start swapping</p>
                <button
                  onClick={() => connect("argentX")}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 justify-center"
                >
                  <img src="/assets/argentx_logo.png" alt="ArgentX" className="w-5 h-5 rounded-full" />
                  Connect Wallet
                </button>
              </div>
            ) : (
              <>
                {/* Tab Selector */}
                <div className="bg-white rounded-2xl p-2 shadow-lg border border-gray-100">
                  <div className="flex">
                    <button
                      onClick={() => setActiveTab("create")}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                        activeTab === "create"
                          ? "bg-indigo-600 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <ArrowRightLeft className="w-4 h-4 inline mr-2" />
                      Create Swap
                    </button>
                    <button
                      onClick={() => setActiveTab("claim")}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                        activeTab === "claim"
                          ? "bg-indigo-600 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Claim Swap
                    </button>
                  </div>
                </div>

                {/* Create Swap Form */}
                {activeTab === "create" && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">Create Atomic Swap</h3>

                    <div className="space-y-4">
                      {/* From */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <label className="block text-sm font-medium text-gray-500 mb-2">You Send</label>
                        <div className="flex gap-3">
                          <input
                            type="number"
                            value={fromAmount}
                            onChange={(e) => setFromAmount(e.target.value)}
                            placeholder="0.0"
                            className="flex-1 bg-transparent text-2xl font-medium focus:outline-none"
                          />
                          <select
                            value={fromAsset}
                            onChange={(e) => setFromAsset(e.target.value)}
                            className="px-4 py-2 bg-white rounded-lg border border-gray-200"
                          >
                            <option value="ZEC">ZEC</option>
                            <option value="ETH">ETH</option>
                            <option value="STRK">STRK</option>
                          </select>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex justify-center">
                        <div className="p-2 bg-indigo-100 rounded-full">
                          <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                        </div>
                      </div>

                      {/* To */}
                      <div className="bg-gray-50 rounded-xl p-4">
                        <label className="block text-sm font-medium text-gray-500 mb-2">You Receive</label>
                        <div className="flex gap-3">
                          <input
                            type="number"
                            value={toAmount}
                            onChange={(e) => setToAmount(e.target.value)}
                            placeholder="0.0"
                            className="flex-1 bg-transparent text-2xl font-medium focus:outline-none"
                          />
                          <select
                            value={toAsset}
                            onChange={(e) => setToAsset(e.target.value)}
                            className="px-4 py-2 bg-white rounded-lg border border-gray-200"
                          >
                            <option value="ETH">ETH</option>
                            <option value="ZEC">ZEC</option>
                            <option value="STRK">STRK</option>
                          </select>
                        </div>
                      </div>

                      {/* Timelock */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Clock className="w-4 h-4 inline mr-1" />
                          Timelock Duration
                        </label>
                        <select
                          value={timelock}
                          onChange={(e) => setTimelock(e.target.value)}
                          className="w-full p-3 border border-gray-200 rounded-xl"
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
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Lock className="w-4 h-4 inline mr-2" />
                        Create Swap
                      </button>
                    </div>
                  </div>
                )}

                {/* Claim Swap Form */}
                {activeTab === "claim" && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">Claim Swap</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Swap ID</label>
                        <input
                          type="text"
                          value={claimSwapId}
                          onChange={(e) => setClaimSwapId(e.target.value)}
                          placeholder="Enter swap ID..."
                          className="w-full p-3 border border-gray-200 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Preimage (Secret)</label>
                        <input
                          type="text"
                          value={preimage}
                          onChange={(e) => setPreimage(e.target.value)}
                          placeholder="Enter preimage to claim..."
                          className="w-full p-3 border border-gray-200 rounded-xl font-mono text-sm"
                        />
                      </div>

                      <button
                        onClick={handleClaimSwap}
                        disabled={!claimSwapId || !preimage}
                        className="w-full py-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">Your Swaps</h3>

              {swaps.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <ArrowRightLeft className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No swaps yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {swaps.map((swap) => (
                    <div key={swap.id} className="p-4 rounded-xl border border-gray-200 hover:border-indigo-200 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(swap.status)}`}>
                            {swap.status.charAt(0).toUpperCase() + swap.status.slice(1)}
                          </span>
                          <p className="font-medium mt-2">
                            {swap.fromAmount} {swap.fromAsset} → {swap.toAmount} {swap.toAsset}
                          </p>
                          <p className="text-xs text-gray-500 font-mono mt-1">
                            Hashlock: {swap.hashlock}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm">{getTimeRemaining(swap.createdAt, swap.timelock)}</span>
                          </div>
                        </div>
                      </div>

                      {swap.status === "pending" && (
                        <button
                          onClick={() => handleRefundSwap(swap.id)}
                          className="w-full py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
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
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
              <Shield className="w-8 h-8 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Trustless & Secure</h3>
              <p className="text-indigo-100 text-sm">
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
