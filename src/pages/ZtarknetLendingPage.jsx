import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Wallet, TrendingUp, Shield, Lock, Unlock, AlertTriangle, CheckCircle, DollarSign, Percent } from "lucide-react";
import { useStarknet } from "../providers/StarknetProvider";

export default function ZtarknetLendingPage() {
  const { account, isConnected, connect, balance, depositCollateral, borrow, repayLoan, withdrawCollateral } = useStarknet();
  const [activeTab, setActiveTab] = useState("deposit");
  const [amount, setAmount] = useState("");
  const [collateralType, setCollateralType] = useState("ETH");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [selectedCollateral, setSelectedCollateral] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [positions, setPositions] = useState([]);

  const handleDeposit = async () => {
    if (!amount) return;
    setIsLoading(true);
    try {
      const result = await depositCollateral(parseFloat(amount), collateralType);
      setPositions(prev => [...prev, {
        id: Date.now(),
        type: "collateral",
        asset: collateralType,
        amount: amount,
        value: `$${(parseFloat(amount) * 2000).toFixed(2)}`,
        status: "active",
        healthFactor: 185,
        txHash: result?.transaction_hash,
      }]);
      setAmount("");
    } catch (error) {
      console.error("Deposit failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBorrow = async () => {
    if (!borrowAmount || !selectedCollateral) return;
    setIsLoading(true);
    try {
      const result = await borrow(parseFloat(borrowAmount), selectedCollateral);
      setPositions(prev => [...prev, {
        id: Date.now(),
        type: "loan",
        asset: "sZEC",
        amount: borrowAmount,
        borrowed: `$${(parseFloat(borrowAmount) * 3).toFixed(2)}`,
        interest: "5%",
        status: "active",
        healthFactor: 185,
        collateralId: selectedCollateral,
        txHash: result?.transaction_hash,
      }]);
      setBorrowAmount("");
    } catch (error) {
      console.error("Borrow failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepay = async (loanId) => {
    setIsLoading(true);
    try {
      const loan = positions.find(p => p.id === loanId);
      await repayLoan(loanId, parseFloat(loan?.amount || 0));
      setPositions(prev => prev.filter(p => p.id !== loanId));
    } catch (error) {
      console.error("Repay failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async (collateralId) => {
    setIsLoading(true);
    try {
      await withdrawCollateral(collateralId);
      setPositions(prev => prev.filter(p => p.id !== collateralId));
    } catch (error) {
      console.error("Withdraw failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="/assets/starknet-logo.png" alt="Starknet" className="w-12 h-12 rounded-full" />
          <div className="text-center">
            <h1 className="text-2xl font-bold" style={{ color: '#0d08e3' }}>
              Ztarknet Private Lending
            </h1>
            <p className="text-gray-600 text-sm">Privacy-preserving lending protocol on Starknet</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 shadow-md border-2 border-indigo-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg shadow-md" style={{ backgroundColor: '#0d08e3' }}>
                <DollarSign className="w-4 h-4 text-white" />
              </div>
              <span className="text-gray-600 text-xs font-bold">Total Deposits</span>
            </div>
            <p className="text-xl font-bold text-gray-900">$5.2M</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 shadow-md border-2 border-indigo-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg shadow-md" style={{ backgroundColor: '#0d08e3' }}>
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <span className="text-gray-600 text-xs font-bold">Total Borrowed</span>
            </div>
            <p className="text-xl font-bold text-gray-900">$2.8M</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 shadow-md border-2 border-indigo-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg shadow-md" style={{ backgroundColor: '#0d08e3' }}>
                <Percent className="w-4 h-4 text-white" />
              </div>
              <span className="text-gray-600 text-xs font-bold">Borrow APY</span>
            </div>
            <p className="text-xl font-bold text-gray-900">5.0%</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 shadow-md border-2 border-indigo-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg shadow-md" style={{ backgroundColor: '#0d08e3' }}>
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="text-gray-600 text-xs font-bold">Collateral Ratio</span>
            </div>
            <p className="text-xl font-bold text-gray-900">150%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Actions */}
          <div className="space-y-6">
            {/* Wallet Connection */}
            {!isConnected ? (
              <div className="bg-gradient-to-br from-indigo-500/10 via-indigo-500/10 to-indigo-500/10 border-2 border-indigo-300/50 shadow-xl backdrop-blur-sm rounded-2xl p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center shadow-xl" style={{ backgroundColor: '#0d08e3' }}>
                  <Wallet className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-gray-900">Connect Wallet</h3>
                <p className="text-gray-600 text-sm mb-4">Connect your Starknet wallet to start lending</p>
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
                      onClick={() => setActiveTab("deposit")}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                        activeTab === "deposit"
                          ? "text-white shadow-lg"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                      style={activeTab === "deposit" ? { backgroundColor: '#0d08e3' } : {}}
                    >
                      <Lock className="w-4 h-4 inline mr-2" />
                      Deposit
                    </button>
                    <button
                      onClick={() => setActiveTab("borrow")}
                      className={`flex-1 py-3 px-4 rounded-xl font-bold transition-all ${
                        activeTab === "borrow"
                          ? "text-white shadow-lg"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                      style={activeTab === "borrow" ? { backgroundColor: '#0d08e3' } : {}}
                    >
                      <TrendingUp className="w-4 h-4 inline mr-2" />
                      Borrow
                    </button>
                  </div>
                </div>

                {/* Deposit Form */}
                {activeTab === "deposit" && (
                  <div className="bg-white/80 backdrop-blur-xl border-2 border-indigo-200 shadow-xl rounded-2xl p-5">
                    <h3 className="text-base font-bold mb-4 text-gray-900 flex items-center gap-2">
                      <Lock className="w-5 h-5" style={{ color: '#0d08e3' }} />
                      Deposit Collateral
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">
                          Collateral Type
                        </label>
                        <div className="relative">
                        <select
                          value={collateralType}
                          onChange={(e) => setCollateralType(e.target.value)}
                            className="w-full p-3 pl-10 border-2 border-gray-200 rounded-xl focus:ring-2 font-semibold appearance-none bg-white"
                            onFocus={(e) => e.currentTarget.style.borderColor = '#0d08e3'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                        >
                          <option value="ETH">ETH</option>
                          <option value="STRK">STRK</option>
                          <option value="sZEC">sZEC</option>
                        </select>
                          <img 
                            src={collateralType === "ETH" ? "/assets/eth-logo.png" : collateralType === "STRK" ? "/assets/starknet-logo.png" : "/assets/zcash_logo.png"} 
                            alt={collateralType} 
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full pointer-events-none" 
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">
                          Amount
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.0"
                            className="w-full p-3 pr-20 border-2 border-gray-200 rounded-xl focus:ring-2 text-lg font-bold"
                            onFocus={(e) => e.currentTarget.style.borderColor = '#0d08e3'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <img 
                              src={collateralType === "ETH" ? "/assets/eth-logo.png" : collateralType === "STRK" ? "/assets/starknet-logo.png" : "/assets/zcash_logo.png"} 
                              alt={collateralType} 
                              className="w-4 h-4 rounded-full" 
                            />
                            <span className="text-sm font-semibold text-gray-600">
                            {collateralType}
                          </span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-medium">
                          Balance: {balance.eth} ETH
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-xl p-4">
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-gray-700 font-semibold flex items-center gap-2">
                            <img src="/assets/zcash_logo.png" alt="sZEC" className="w-4 h-4 rounded-full" />
                            Max Borrow (66%)
                          </span>
                          <span className="font-bold" style={{ color: '#0d08e3' }}>
                            {amount ? (parseFloat(amount) * 0.66).toFixed(4) : "0"} sZEC
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleDeposit}
                        disabled={!amount || isLoading}
                        className="w-full py-4 text-white rounded-xl font-bold hover:scale-[1.01] transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        style={{ backgroundColor: '#0d08e3' }}
                        onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#0a06b8')}
                        onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#0d08e3')}
                      >
                        {isLoading ? "Processing..." : "Deposit Collateral"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Borrow Form */}
                {activeTab === "borrow" && (
                  <div className="bg-white/80 backdrop-blur-xl border-2 border-indigo-200 shadow-xl rounded-2xl p-5">
                    <h3 className="text-base font-bold mb-4 text-gray-900 flex items-center gap-2">
                      <img src="/assets/zcash_logo.png" alt="sZEC" className="w-5 h-5 rounded-full" />
                      Borrow sZEC
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">
                          Select Collateral
                        </label>
                        <select
                          value={selectedCollateral || ""}
                          onChange={(e) => setSelectedCollateral(e.target.value)}
                          className="w-full p-3 border-2 border-gray-200 rounded-xl focus:ring-2 font-semibold"
                          onFocus={(e) => e.currentTarget.style.borderColor = '#0d08e3'}
                          onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                        >
                          <option value="">Select collateral...</option>
                          <option value="1">Collateral #1 - 1.5 ETH ($3,000)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-gray-800 mb-2">
                          Borrow Amount
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={borrowAmount}
                            onChange={(e) => setBorrowAmount(e.target.value)}
                            placeholder="0.0"
                            className="w-full p-3 pr-20 border-2 border-gray-200 rounded-xl focus:ring-2 text-lg font-bold"
                            onFocus={(e) => e.currentTarget.style.borderColor = '#0d08e3'}
                            onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            <img src="/assets/zcash_logo.png" alt="sZEC" className="w-4 h-4 rounded-full" />
                            <span className="text-sm font-semibold text-gray-600">sZEC</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1 font-medium">
                          Max borrow: 2,000 sZEC
                        </p>
                      </div>

                      <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-gray-700 font-semibold">Interest Rate</span>
                          <span className="font-bold" style={{ color: '#0d08e3' }}>5.0% APY</span>
                        </div>
                        <div className="flex justify-between text-sm items-center">
                          <span className="text-gray-700 font-semibold">Health Factor</span>
                          <span className="font-bold text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            185%
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleBorrow}
                        disabled={!borrowAmount || !selectedCollateral || isLoading}
                        className="w-full py-4 text-white rounded-xl font-bold hover:scale-[1.01] transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        style={{ backgroundColor: '#0d08e3' }}
                        onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#0a06b8')}
                        onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = '#0d08e3')}
                      >
                        {isLoading ? "Processing..." : "Borrow sZEC"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Positions */}
          <div className="space-y-5">
            <div className="bg-white/80 backdrop-blur-xl border-2 border-gray-200 shadow-xl rounded-2xl p-5">
              <h3 className="text-base font-bold mb-4 text-gray-900 flex items-center gap-2">
                <Shield className="w-5 h-5" style={{ color: '#0d08e3' }} />
                Your Positions
              </h3>

              {positions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Shield className="w-8 h-8 text-gray-400" />
                  </div>
                  <p className="font-medium">No active positions</p>
                  <p className="text-sm text-gray-400 mt-1">Deposit collateral to get started</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {positions.map((position) => (
                    <div
                      key={position.id}
                      className={`p-4 rounded-xl border ${
                        position.type === "collateral"
                          ? "bg-indigo-50 border-indigo-200"
                          : "bg-indigo-50 border-indigo-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            position.type === "collateral"
                              ? "bg-indigo-200"
                              : "bg-indigo-200"
                          }`}
                          style={{ color: '#0d08e3' }}>
                            {position.type === "collateral" ? "Collateral" : "Loan"}
                          </span>
                          <h4 className="font-medium mt-2">
                            {position.amount} {position.asset}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {position.type === "collateral" ? position.value : position.borrowed}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className={`flex items-center gap-1 ${
                            position.healthFactor > 150 ? "text-green-600" : "text-yellow-600"
                          }`}>
                            {position.healthFactor > 150 ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <AlertTriangle className="w-4 h-4" />
                            )}
                            <span className="text-sm font-medium">{position.healthFactor}%</span>
                          </div>
                          <span className="text-xs text-gray-500">Health Factor</span>
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          position.type === "collateral"
                            ? handleWithdraw(position.id)
                            : handleRepay(position.id)
                        }
                        className="w-full py-2 rounded-lg text-sm font-medium transition-colors text-white"
                        style={{ backgroundColor: '#0d08e3' }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0a06b8'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0d08e3'}
                      >
                        {position.type === "collateral" ? (
                          <>
                            <Unlock className="w-4 h-4 inline mr-1" />
                            Withdraw
                          </>
                        ) : (
                          "Repay Loan"
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Privacy Info */}
            <div className="rounded-2xl p-5 text-white shadow-xl" style={{ backgroundColor: '#0d08e3' }}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Shield className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold">Privacy-Preserving</h3>
              </div>
              <p className="text-indigo-100 text-sm leading-relaxed">
                All lending positions use stealth addresses. Your collateral deposits and
                loan amounts are shielded from public view using Ztarknet's privacy layer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
