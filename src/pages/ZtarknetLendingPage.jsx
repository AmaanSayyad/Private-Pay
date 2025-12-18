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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50 to-indigo-50">
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
            <h1 className="text-3xl font-bold text-gray-900">Ztarknet Private Lending</h1>
            <p className="text-gray-600">Privacy-preserving lending protocol on Starknet</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border border-purple-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-gray-500 text-sm">Total Deposits</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">$5.2M</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-gray-500 text-sm">Total Borrowed</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">$2.8M</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-green-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Percent className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-gray-500 text-sm">Borrow APY</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">5.0%</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border border-yellow-100">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Shield className="w-5 h-5 text-yellow-600" />
              </div>
              <span className="text-gray-500 text-sm">Collateral Ratio</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">150%</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Actions */}
          <div className="space-y-6">
            {/* Wallet Connection */}
            {!isConnected ? (
              <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100 text-center">
                <Wallet className="w-12 h-12 mx-auto mb-4 text-purple-500" />
                <h3 className="text-lg font-semibold mb-2">Connect Wallet</h3>
                <p className="text-gray-500 mb-4">Connect your Starknet wallet to start lending</p>
                <button
                  onClick={() => connect("argentX")}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors flex items-center gap-2 justify-center"
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
                      onClick={() => setActiveTab("deposit")}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                        activeTab === "deposit"
                          ? "bg-purple-600 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <Lock className="w-4 h-4 inline mr-2" />
                      Deposit Collateral
                    </button>
                    <button
                      onClick={() => setActiveTab("borrow")}
                      className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all ${
                        activeTab === "borrow"
                          ? "bg-purple-600 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <TrendingUp className="w-4 h-4 inline mr-2" />
                      Borrow
                    </button>
                  </div>
                </div>

                {/* Deposit Form */}
                {activeTab === "deposit" && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">Deposit Collateral</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Collateral Type
                        </label>
                        <select
                          value={collateralType}
                          onChange={(e) => setCollateralType(e.target.value)}
                          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="ETH">ETH</option>
                          <option value="STRK">STRK</option>
                          <option value="sZEC">sZEC</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="0.0"
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            {collateralType}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Balance: {balance.eth} ETH
                        </p>
                      </div>

                      <div className="bg-purple-50 rounded-xl p-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Max Borrow (66%)</span>
                          <span className="font-medium">
                            {amount ? (parseFloat(amount) * 0.66).toFixed(4) : "0"} sZEC
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={handleDeposit}
                        disabled={!amount}
                        className="w-full py-4 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Deposit Collateral
                      </button>
                    </div>
                  </div>
                )}

                {/* Borrow Form */}
                {activeTab === "borrow" && (
                  <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">Borrow sZEC</h3>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Collateral
                        </label>
                        <select
                          value={selectedCollateral || ""}
                          onChange={(e) => setSelectedCollateral(e.target.value)}
                          className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Select collateral...</option>
                          <option value="1">Collateral #1 - 1.5 ETH ($3,000)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Borrow Amount
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={borrowAmount}
                            onChange={(e) => setBorrowAmount(e.target.value)}
                            placeholder="0.0"
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                            sZEC
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Max borrow: 2,000 sZEC
                        </p>
                      </div>

                      <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Interest Rate</span>
                          <span className="font-medium">5.0% APY</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Health Factor</span>
                          <span className="font-medium text-green-600">185%</span>
                        </div>
                      </div>

                      <button
                        onClick={handleBorrow}
                        disabled={!borrowAmount || !selectedCollateral}
                        className="w-full py-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Borrow sZEC
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right: Positions */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
              <h3 className="text-lg font-semibold mb-4">Your Positions</h3>

              {positions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No active positions</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {positions.map((position) => (
                    <div
                      key={position.id}
                      className={`p-4 rounded-xl border ${
                        position.type === "collateral"
                          ? "bg-purple-50 border-purple-200"
                          : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            position.type === "collateral"
                              ? "bg-purple-200 text-purple-700"
                              : "bg-blue-200 text-blue-700"
                          }`}>
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
                        className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${
                          position.type === "collateral"
                            ? "bg-purple-600 text-white hover:bg-purple-700"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
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
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
              <Shield className="w-8 h-8 mb-3" />
              <h3 className="text-lg font-semibold mb-2">Privacy-Preserving</h3>
              <p className="text-purple-100 text-sm">
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
