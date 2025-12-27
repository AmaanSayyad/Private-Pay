import { useChain } from '@cosmos-kit/react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardBody, Input, Button } from '@nextui-org/react';
import { ArrowLeftRight, Shield, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import { bridgeService } from '../../lib/osmosis/bridgeService.js';

// Check if testnet
const isTestnet = import.meta.env.VITE_OSMOSIS_CHAIN_ID === 'osmo-test-5';
const chainName = isTestnet ? 'osmosistestnet' : 'osmosis';

export const BridgeComponent = () => {
  const { address, getSigningStargateClient } = useChain(chainName);
  const [amount, setAmount] = useState('');
  const [zcashAddress, setZcashAddress] = useState('');
  const [isBridging, setIsBridging] = useState(false);
  const [step, setStep] = useState('idle'); // idle, signing, bridging, completed
  const [txHash, setTxHash] = useState('');
  const [zcashTxId, setZcashTxId] = useState('');
  const [estimatedZec, setEstimatedZec] = useState('0.00');

  // Update ZEC estimation when amount changes
  const updateEstimation = async (osmoAmount) => {
    if (osmoAmount && parseFloat(osmoAmount) > 0) {
      try {
        const zcashAmount = await bridgeService.getZcashExchangeRate(osmoAmount);
        setEstimatedZec(zcashAmount.toFixed(6));
      } catch (error) {
        console.error('Error getting exchange rate:', error);
        setEstimatedZec((parseFloat(osmoAmount) * 0.05).toFixed(6));
      }
    } else {
      setEstimatedZec('0.00');
    }
  };

  const handleBridge = async () => {
    if (!amount || !address || !zcashAddress) {
      toast.error('Please enter amount and Zcash address');
      return;
    }

    if (!bridgeService.isValidZcashAddress(zcashAddress)) {
      toast.error('Invalid Zcash shielded address. Use zs1... or u1... address');
      return;
    }

    setIsBridging(true);
    setStep('signing');

    try {
      const result = await bridgeService.bridgeToZcash(
        address,
        amount,
        zcashAddress,
        getSigningStargateClient
      );

      if (result.code === 0) {
        setTxHash(result.transactionHash);
        setStep('bridging');
        toast.success('Bridge transaction submitted!');

        // Monitor bridge status
        monitorBridgeStatus(result.transactionHash);
      } else {
        throw new Error(result.rawLog || 'Transaction failed');
      }

    } catch (error) {
      console.error('Bridge Error:', error);
      setIsBridging(false);
      setStep('idle');
      toast.error(`Bridge failed: ${error.message}`);
    }
  };

  const monitorBridgeStatus = async (txHash) => {
    const maxAttempts = 60; // 2 minutes
    let attempts = 0;

    const checkStatus = () => {
      try {
        const status = bridgeService.getBridgeStatus(txHash);
        
        if (status.status === 'completed') {
          setZcashTxId(status.zcashTxId);
          setStep('completed');
          setIsBridging(false);
          toast.success('Bridge completed successfully!');
        } else if (status.status === 'failed') {
          setStep('idle');
          setIsBridging(false);
          toast.error(`Bridge failed: ${status.error}`);
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 2000);
        } else {
          setStep('idle');
          setIsBridging(false);
          toast.error('Bridge timeout - please check status manually');
        }
      } catch (error) {
        if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkStatus, 2000);
        } else {
          setStep('idle');
          setIsBridging(false);
          toast.error('Unable to monitor bridge status');
        }
      }
    };

    // Start monitoring after a short delay
    setTimeout(checkStatus, 1000);
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm rounded-2xl">
      <CardBody className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-blue-600" />
          Privacy Bridge (Osmosis ↔ Zcash)
        </h3>

        <div className="space-y-4">
          {/* From Section */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">From (Osmosis)</label>
            <div className="flex gap-3 p-4 border border-gray-200 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 items-center">
              <img src="/assets/osmosis-logo.png" alt="Osmosis" className="w-8 h-8 rounded-full" />
              <Input
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  updateEstimation(e.target.value);
                }}
                isDisabled={isBridging}
                classNames={{
                  inputWrapper: "h-12 bg-white border-gray-200 flex-1 focus-within:border-blue-400",
                  input: "text-lg font-semibold"
                }}
                endContent={
                  <div className="flex items-center gap-1">
                    <span className="text-blue-600 text-sm font-semibold">OSMO</span>
                  </div>
                }
                variant="bordered"
              />
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center -my-2 z-10 relative">
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-3 rounded-full border-2 border-blue-300 shadow-lg flex items-center justify-center">
              <ArrowLeftRight size={20} className="text-blue-600" />
            </div>
          </div>

          {/* To Section */}
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">To (Zcash Shielded)</label>
            <div className="flex flex-col gap-3 p-4 border border-gray-200 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="flex gap-3 items-center">
                <img src="/assets/zcash_logo.png" alt="Zcash" className="w-8 h-8 rounded-full" />
                <div className="flex-1 bg-white/70 rounded-lg px-4 py-2 border border-gray-200">
                  <div className="text-xl font-bold text-gray-900">
                    {estimatedZec}
                  </div>
                  <div className="text-xs text-gray-500 font-semibold uppercase">Estimated ZEC</div>
                </div>
              </div>

              <Input
                placeholder="zs1... or u1..."
                label="Destination Zcash Shielded Address"
                value={zcashAddress}
                onChange={(e) => setZcashAddress(e.target.value)}
                isDisabled={isBridging}
                variant="bordered"
                classNames={{
                  inputWrapper: "bg-white border-gray-200 focus-within:border-blue-400",
                  label: "text-gray-700 font-semibold text-xs"
                }}
                description="Must be a Zcash shielded address (zs1... or u1...)"
              />

              <div className="flex items-center gap-2 text-[10px] text-blue-600 px-1">
                <Shield size={10} />
                <span>Your assets will be shielded automatically on arrival</span>
              </div>
            </div>
          </div>

          {/* Bridge Info */}
          {amount && (
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Exchange Rate</span>
                <span className="text-gray-900 font-medium">Live market rate</span>
              </div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Bridge Fee</span>
                <span className="text-gray-900 font-medium">0.1%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Estimated Time</span>
                <span className="text-gray-900 font-medium">2-5 minutes</span>
              </div>
            </div>
          )}

          {/* Status */}
          {step !== 'idle' && step !== 'completed' && (
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  {step === 'signing' ? (
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 animate-pulse" />
                  )}
                  <div>
                    <p className="font-semibold text-gray-900">
                      {step === 'signing' ? 'Signing Transaction...' : 'Processing Bridge...'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {step === 'signing' 
                        ? 'Please confirm in your wallet' 
                        : 'Converting OSMO to ZEC and sending to shielded address'}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}

          {/* Success */}
          {step === 'completed' ? (
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
              <CardBody className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-green-900">Bridge Completed!</p>
                    <p className="text-sm text-green-700">
                      {estimatedZec} ZEC sent to your shielded address
                    </p>
                    <div className="flex flex-col gap-1 mt-2">
                      {txHash && (
                        <a
                          href={`https://www.mintscan.io/osmosis/tx/${txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:text-green-700 hover:underline flex items-center gap-1"
                        >
                          Osmosis TX <ExternalLink size={12} />
                        </a>
                      )}
                      {zcashTxId && (
                        <a
                          href={`https://explorer.zcha.in/transactions/${zcashTxId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-600 hover:text-green-700 hover:underline flex items-center gap-1"
                        >
                          Zcash TX <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="bordered"
                  className="w-full mt-3 border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => {
                    setStep('idle');
                    setAmount('');
                    setZcashAddress('');
                    setTxHash('');
                    setZcashTxId('');
                    setEstimatedZec('0.00');
                  }}
                >
                  Bridge More Assets
                </Button>
              </CardBody>
            </Card>
          ) : (
            <Button
              className="w-full h-12 font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:from-blue-500 hover:to-indigo-500 transition-all"
              onClick={handleBridge}
              isDisabled={!amount || !zcashAddress || isBridging}
              isLoading={isBridging}
            >
              {step === 'signing' ? 'Signing Transaction...' :
                step === 'bridging' ? 'Processing Bridge...' :
                  `Bridge ${amount || '0'} OSMO to Privacy`}
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
};
