/**
 * Stablecoin Component
 * 
 * UI for pZUSD (Zcash-backed stablecoin) operations
 */

import { useState, useEffect } from 'react';
import { Button, Card, CardBody, Input, Tabs, Tab, Spinner } from '@nextui-org/react';
import toast from 'react-hot-toast';

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
      }
    }
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
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">pZUSD Stablecoin</h1>

      {zecPrice && (
        <Card className="mb-6">
          <CardBody>
            <div className="text-center">
              <p className="text-sm text-gray-600">Current ZEC Price</p>
              <p className="text-3xl font-bold">${zecPrice.toFixed(2)}</p>
            </div>
          </CardBody>
        </Card>
      )}

      <Tabs selectedKey={activeTab} onSelectionChange={setActiveTab} className="mb-6">
        <Tab key="mint" title="Mint pZUSD">
          <Card>
            <CardBody className="space-y-4">
              <div>
                <Input
                  label="ZEC Amount"
                  placeholder="0.0"
                  type="number"
                  value={zecAmount}
                  onChange={(e) => {
                    setZecAmount(e.target.value);
                    setStablecoinAmount(calculateStablecoin(e.target.value));
                  }}
                  endContent={<span className="text-gray-500">ZEC</span>}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Collateralization: 150% (Minimum)
                </p>
              </div>

              <div className="text-center text-gray-400">↓</div>

              <div>
                <Input
                  label="pZUSD Amount"
                  placeholder="0.0"
                  type="number"
                  value={stablecoinAmount}
                  onChange={(e) => {
                    setStablecoinAmount(e.target.value);
                    setZecAmount(calculateZEC(e.target.value));
                  }}
                  endContent={<span className="text-gray-500">pZUSD</span>}
                  isReadOnly
                />
                <p className="text-xs text-gray-500 mt-2">
                  You will receive this amount of pZUSD
                </p>
              </div>

              <Button
                color="primary"
                size="lg"
                className="w-full"
                onClick={handleMint}
                isLoading={isLoading}
                disabled={!zecAmount || parseFloat(zecAmount) <= 0}
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Minting...
                  </>
                ) : (
                  'Mint pZUSD'
                )}
              </Button>
            </CardBody>
          </Card>
        </Tab>

        <Tab key="burn" title="Redeem ZEC">
          <Card>
            <CardBody className="space-y-4">
              <div>
                <Input
                  label="pZUSD Amount"
                  placeholder="0.0"
                  type="number"
                  value={stablecoinAmount}
                  onChange={(e) => {
                    setStablecoinAmount(e.target.value);
                    setZecAmount(calculateZEC(e.target.value));
                  }}
                  endContent={<span className="text-gray-500">pZUSD</span>}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Redemption: 1:1 ratio
                </p>
              </div>

              <div className="text-center text-gray-400">↓</div>

              <div>
                <Input
                  label="ZEC Amount"
                  placeholder="0.0"
                  type="number"
                  value={zecAmount}
                  onChange={(e) => {
                    setZecAmount(e.target.value);
                    setStablecoinAmount(calculateStablecoin(e.target.value));
                  }}
                  endContent={<span className="text-gray-500">ZEC</span>}
                  isReadOnly
                />
                <p className="text-xs text-gray-500 mt-2">
                  You will receive this amount of ZEC
                </p>
              </div>

              <Button
                color="primary"
                size="lg"
                className="w-full"
                onClick={handleBurn}
                isLoading={isLoading}
                disabled={!stablecoinAmount || parseFloat(stablecoinAmount) <= 0}
              >
                {isLoading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Redeeming...
                  </>
                ) : (
                  'Redeem ZEC'
                )}
              </Button>
            </CardBody>
          </Card>
        </Tab>
      </Tabs>

      <Card>
        <CardBody>
          <h2 className="text-xl font-semibold mb-4">Your Position</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Collateral (ZEC):</span>
              <span className="font-mono">0.00000000 ZEC</span>
            </div>
            <div className="flex justify-between">
              <span>Debt (pZUSD):</span>
              <span className="font-mono">0.00 pZUSD</span>
            </div>
            <div className="flex justify-between">
              <span>Collateralization Ratio:</span>
              <span className="font-mono">—</span>
            </div>
            <div className="flex justify-between">
              <span>Liquidation Threshold:</span>
              <span className="font-mono text-red-600">130%</span>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

