/**
 * Stablecoin Component
 * 
 * UI for pZUSD (Zcash-backed stablecoin) operations
 */

import { useState, useEffect } from 'react';
import { Button, Card, CardBody, Input, Tabs, Tab, Spinner, Chip } from '@nextui-org/react';
import toast from 'react-hot-toast';
import { Coins, ArrowDown, ArrowUp, TrendingUp, Shield, Lock, Zap } from 'lucide-react';

export default function Stablecoin() {
  const [activeTab, setActiveTab] = useState('mint');
  const [zecAmount, setZecAmount] = useState('');
  const [stablecoinAmount, setStablecoinAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [zecPrice, setZecPrice] = useState(null);

  // Fetch ZEC price
  useEffect(() => {
    async function fetchPrice() {
      try {
        // In production, fetch from oracle
        const response = await fetch('/api/oracle/price');
        const data = await response.json();
        setZecPrice(data.price);
      } catch (error) {
        console.error('Failed to fetch price:', error);
        // Fallback price for demo
        setZecPrice(45.50);
      }
    }
    // Set fallback price immediately for demo
    setZecPrice(45.50);
    fetchPrice();
    const interval = setInterval(fetchPrice, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  /**
   * Calculate stablecoin amount from ZEC
   */
  const calculateStablecoin = (zec) => {
    if (!zecPrice || !zec) return '0';
    // 150% collateralization: 1 ZEC = (ZEC_PRICE / 1.5) pZUSD
    const stablecoin = (parseFloat(zec) * zecPrice) / 1.5;
    return stablecoin.toFixed(2);
  };

  /**
   * Calculate ZEC amount from stablecoin
   */
  const calculateZEC = (stablecoin) => {
    if (!zecPrice || !stablecoin) return '0';
    // 1:1 redemption: 1 pZUSD = (1 / ZEC_PRICE) ZEC
    const zec = parseFloat(stablecoin) / zecPrice;
    return zec.toFixed(8);
  };

  /**
   * Handle minting stablecoin
   */
  const handleMint = async () => {
    if (!zecAmount || parseFloat(zecAmount) <= 0) {
      toast.error('Please enter a valid ZEC amount');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Deposit ZEC to collateral pool
      // 2. Mint pZUSD based on collateralization ratio
      // 3. Receive pZUSD tokens

      const calculated = calculateStablecoin(zecAmount);
      toast.success(`Minting ${calculated} pZUSD`);
    } catch (error) {
      console.error('Mint failed:', error);
      toast.error(`Mint failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle burning stablecoin
   */
  const handleBurn = async () => {
    if (!stablecoinAmount || parseFloat(stablecoinAmount) <= 0) {
      toast.error('Please enter a valid pZUSD amount');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Burn pZUSD tokens
      // 2. Calculate ZEC to return (1:1)
      // 3. Receive ZEC from collateral pool

      const calculated = calculateZEC(stablecoinAmount);
      toast.success(`Redeeming ${calculated} ZEC`);
    } catch (error) {
      console.error('Burn failed:', error);
      toast.error(`Burn failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full min-h-screen py-12 px-4 pb-24">
      <div className="w-full max-w-5xl">
        <div className="flex flex-col items-center gap-6 mb-8">
          <div className="flex items-center gap-3">
            <img src="/assets/zcash_logo.png" alt="Zcash" className="w-10 h-10 rounded-full" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-500 to-amber-600 bg-clip-text text-transparent">
              pZUSD Stablecoin
            </h1>
          </div>
          <p className="text-gray-600 max-w-lg text-center">
            Zcash-backed stablecoin with 150% collateralization. Mint and redeem pZUSD using ZEC.
          </p>
        </div>

      {zecPrice && (
          <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 shadow-sm mb-6 rounded-3xl">
            <CardBody className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Current ZEC Price</p>
                  <div className="flex items-center gap-2">
                    <p className="text-3xl font-bold text-gray-900">${zecPrice.toFixed(2)}</p>
                    <img src="/assets/zcash_logo.png" alt="ZEC" className="w-6 h-6 rounded-full" />
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-yellow-200">
                  <TrendingUp className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-semibold text-gray-700">Live Price</span>
                </div>
            </div>
          </CardBody>
        </Card>
      )}

        <Card className="bg-white border border-gray-200 shadow-lg rounded-3xl mb-6">
          <CardBody className="p-0">
            <Tabs 
              selectedKey={activeTab} 
              onSelectionChange={setActiveTab}
              variant="underlined"
              color="warning"
              classNames={{
                tabList: "gap-6 w-full relative rounded-none p-0 border-b border-divider px-6",
                cursor: "bg-gradient-to-r from-yellow-500 to-amber-500",
                tab: "max-w-fit px-0 h-12",
                tabContent: "group-data-[selected=true]:text-yellow-600 group-data-[selected=true]:font-semibold"
              }}
            >
              <Tab 
                key="mint" 
                title={
                  <div className="flex items-center gap-2">
                    <ArrowUp size={18} />
                    <span>Mint pZUSD</span>
                  </div>
                }
              >
                <div className="p-6 space-y-6">
                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-200">
                    <div className="flex items-center gap-2 mb-4">
                      <img src="/assets/zcash_logo.png" alt="Zcash" className="w-6 h-6 rounded-full" />
                      <span className="text-gray-700 text-sm font-semibold">Deposit ZEC</span>
                    </div>
                <Input
                  placeholder="0.0"
                  type="number"
                  value={zecAmount}
                  onChange={(e) => {
                    setZecAmount(e.target.value);
                    setStablecoinAmount(calculateStablecoin(e.target.value));
                  }}
                      size="lg"
                      classNames={{
                        input: "text-2xl font-bold",
                        inputWrapper: "h-14 bg-white border-gray-200",
                      }}
                      endContent={
                        <div className="flex items-center gap-2">
                          <img src="/assets/zcash_logo.png" alt="ZEC" className="w-5 h-5 rounded-full" />
                          <span className="text-gray-600 font-semibold">ZEC</span>
                        </div>
                      }
                />
                    <div className="flex items-center justify-between mt-3">
                      <Chip size="sm" variant="flat" color="warning" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        150% Collateral
                      </Chip>
                      <p className="text-xs text-gray-500">
                        Minimum: 150% collateralization
                      </p>
                    </div>
              </div>

                  <div className="flex justify-center -my-2 z-10 relative">
                    <div className="bg-white p-3 rounded-full border-2 border-yellow-300 shadow-lg flex items-center justify-center">
                      <ArrowDown className="w-6 h-6 text-yellow-600" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Coins className="w-6 h-6 text-blue-600" />
                      <span className="text-gray-700 text-sm font-semibold">Receive pZUSD</span>
                    </div>
                <Input
                  placeholder="0.0"
                  type="number"
                  value={stablecoinAmount}
                  onChange={(e) => {
                    setStablecoinAmount(e.target.value);
                    setZecAmount(calculateZEC(e.target.value));
                  }}
                      size="lg"
                      classNames={{
                        input: "text-2xl font-bold",
                        inputWrapper: "h-14 bg-white border-gray-200",
                      }}
                      endContent={
                        <div className="flex items-center gap-2">
                          <Coins className="w-5 h-5 text-blue-600" />
                          <span className="text-gray-600 font-semibold">pZUSD</span>
                        </div>
                      }
                  isReadOnly
                />
                    <p className="text-xs text-gray-500 mt-3">
                      You will receive this amount of pZUSD stablecoin
                </p>
              </div>

              <Button
                size="lg"
                    className="w-full h-12 font-bold bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg hover:shadow-xl hover:from-yellow-400 hover:to-amber-500 transition-all"
                onClick={handleMint}
                isLoading={isLoading}
                disabled={!zecAmount || parseFloat(zecAmount) <= 0}
                    startContent={!isLoading && <ArrowUp className="w-5 h-5" />}
                  >
                    {isLoading ? 'Minting...' : 'Mint pZUSD'}
              </Button>
                </div>
        </Tab>

              <Tab 
                key="burn" 
                title={
                  <div className="flex items-center gap-2">
                    <ArrowDown size={18} />
                    <span>Redeem ZEC</span>
                  </div>
                }
              >
                <div className="p-6 space-y-6">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center gap-2 mb-4">
                      <Coins className="w-6 h-6 text-blue-600" />
                      <span className="text-gray-700 text-sm font-semibold">Burn pZUSD</span>
                    </div>
                <Input
                  placeholder="0.0"
                  type="number"
                  value={stablecoinAmount}
                  onChange={(e) => {
                    setStablecoinAmount(e.target.value);
                    setZecAmount(calculateZEC(e.target.value));
                  }}
                      size="lg"
                      classNames={{
                        input: "text-2xl font-bold",
                        inputWrapper: "h-14 bg-white border-gray-200",
                      }}
                      endContent={
                        <div className="flex items-center gap-2">
                          <Coins className="w-5 h-5 text-blue-600" />
                          <span className="text-gray-600 font-semibold">pZUSD</span>
                        </div>
                      }
                />
                    <div className="flex items-center justify-between mt-3">
                      <Chip size="sm" variant="flat" color="primary" className="text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        1:1 Redemption
                      </Chip>
                      <p className="text-xs text-gray-500">
                        Fixed 1:1 redemption ratio
                </p>
                    </div>
              </div>

                  <div className="flex justify-center -my-2 z-10 relative">
                    <div className="bg-white p-3 rounded-full border-2 border-blue-300 shadow-lg flex items-center justify-center">
                      <ArrowDown className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-6 border border-yellow-200">
                    <div className="flex items-center gap-2 mb-4">
                      <img src="/assets/zcash_logo.png" alt="Zcash" className="w-6 h-6 rounded-full" />
                      <span className="text-gray-700 text-sm font-semibold">Receive ZEC</span>
                    </div>
                <Input
                  placeholder="0.0"
                  type="number"
                  value={zecAmount}
                  onChange={(e) => {
                    setZecAmount(e.target.value);
                    setStablecoinAmount(calculateStablecoin(e.target.value));
                  }}
                      size="lg"
                      classNames={{
                        input: "text-2xl font-bold",
                        inputWrapper: "h-14 bg-white border-gray-200",
                      }}
                      endContent={
                        <div className="flex items-center gap-2">
                          <img src="/assets/zcash_logo.png" alt="ZEC" className="w-5 h-5 rounded-full" />
                          <span className="text-gray-600 font-semibold">ZEC</span>
                        </div>
                      }
                  isReadOnly
                />
                    <p className="text-xs text-gray-500 mt-3">
                  You will receive this amount of ZEC
                </p>
              </div>

              <Button
                size="lg"
                    className="w-full h-12 font-bold bg-gradient-to-r from-yellow-500 to-amber-600 text-white shadow-lg hover:shadow-xl hover:from-yellow-400 hover:to-amber-500 transition-all"
                onClick={handleBurn}
                isLoading={isLoading}
                disabled={!stablecoinAmount || parseFloat(stablecoinAmount) <= 0}
                    startContent={!isLoading && <ArrowDown className="w-5 h-5" />}
                  >
                    {isLoading ? 'Redeeming...' : 'Redeem ZEC'}
              </Button>
                </div>
              </Tab>
            </Tabs>
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl">
            <CardBody className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-yellow-600" />
                Your Position
              </h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2">
                    <img src="/assets/zcash_logo.png" alt="ZEC" className="w-5 h-5 rounded-full" />
                    <span className="text-sm text-gray-700 font-medium">Collateral (ZEC)</span>
                  </div>
                  <span className="font-mono font-bold text-gray-900">0.00000000 ZEC</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-blue-600" />
                    <span className="text-sm text-gray-700 font-medium">Debt (pZUSD)</span>
                  </div>
                  <span className="font-mono font-bold text-gray-900">0.00 pZUSD</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-700 font-medium">Collateralization Ratio</span>
                  <span className="font-mono font-bold text-gray-900">—</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <span className="text-sm text-gray-700 font-medium">Liquidation Threshold</span>
                  <span className="font-mono font-bold text-red-600">130%</span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 shadow-sm rounded-3xl">
            <CardBody className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Lock className="w-5 h-5 text-yellow-600" />
                How It Works
              </h2>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-400 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    1
                  </div>
                  <p className="min-w-0 break-words">Deposit ZEC as collateral (150% minimum ratio)</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-400 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    2
            </div>
                  <p className="min-w-0 break-words">Mint pZUSD stablecoin based on ZEC price and collateralization</p>
            </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-amber-400 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    3
            </div>
                  <p className="min-w-0 break-words">Redeem pZUSD 1:1 for ZEC anytime (subject to collateral ratio)</p>
            </div>
          </div>
        </CardBody>
      </Card>
        </div>
      </div>
    </div>
  );
}

