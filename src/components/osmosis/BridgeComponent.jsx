import { useChain } from '@cosmos-kit/react';
import { coins } from '@cosmjs/amino';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardBody, Input, Button } from '@nextui-org/react';
import { ArrowLeftRight, Shield, CheckCircle2, Loader2, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

// PrivatePay Bridge Vault on Osmosis
const BRIDGE_VAULT_ADDRESS = 'osmo18s5lynnx550aw5rqlmg32cne6083893nq8p5q4';

export const BridgeComponent = () => {
  const { address, getSigningStargateClient } = useChain('osmosis');
  const [amount, setAmount] = useState('');
  const [zcashAddress, setZcashAddress] = useState('');
  const [isBridging, setIsBridging] = useState(false);
  const [step, setStep] = useState('idle'); // idle, signing, bridging, completed
  const [txHash, setTxHash] = useState('');

  const handleBridge = async () => {
    if (!amount || !address || !zcashAddress) {
      toast.error('Please enter amount and Zcash address');
      return;
    }

    setIsBridging(true);
    setStep('signing');

    try {
      const client = await getSigningStargateClient();

      // 1. Convert amount to uosmo (6 decimals)
      const microAmount = Math.floor(parseFloat(amount) * 1_000_000).toString();

      const fee = {
        amount: coins(5000, 'uosmo'),
        gas: '200000'
      };

      // Construct memo with the user's Zcash address
      const memo = `BRIDGE_TO_ZCASH:${zcashAddress}`;

      const result = await client.sendTokens(
        address,
        BRIDGE_VAULT_ADDRESS,
        coins(microAmount, 'uosmo'),
        fee,
        memo
      );

      if (result.code === 0) {
        setTxHash(result.transactionHash);
        setStep('bridging');
        // Simulate bridge operator time (on-chain part is done)
        setTimeout(() => {
          setStep('completed');
          setIsBridging(false);
        }, 2000);
      } else {
        console.error('Transaction Failed:', result);
        setIsBridging(false);
        setStep('idle');
        toast.error(`Transaction failed: ${result.rawLog}`);
      }

    } catch (error) {
      console.error('Bridge Error:', error);
      setIsBridging(false);
      setStep('idle');
      toast.error(error.message);
    }
  };

  return (
    <Card className="bg-white border border-gray-200 shadow-sm rounded-2xl">
      <CardBody className="p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-blue-600" />
          Privacy Bridge (IBC ↔ Zcash)
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
                onChange={(e) => setAmount(e.target.value)}
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
                    {amount ? (parseFloat(amount) * 0.05).toFixed(4) : '0.00'}
                  </div>
                  <div className="text-xs text-gray-500 font-semibold uppercase">Estimated ZEC</div>
                </div>
              </div>

              <Input
                placeholder="zs1..."
                label="Destination Zcash Shielded Address"
                value={zcashAddress}
                onChange={(e) => setZcashAddress(e.target.value)}
                isDisabled={isBridging}
                variant="bordered"
                classNames={{
                  inputWrapper: "bg-white border-gray-200 focus-within:border-blue-400",
                  label: "text-gray-700 font-semibold text-xs"
                }}
              />

              <div className="flex items-center gap-2 text-[10px] text-blue-600 px-1">
                <Shield size={10} />
                <span>Your assets will be shielded automatically on arrival</span>
              </div>
            </div>
          </div>

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
                      {step === 'signing' ? 'Signing Transaction...' : 'Bridging Assets...'}
                    </p>
                    <p className="text-xs text-gray-600">Processing your bridge request</p>
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
                    <p className="font-bold text-green-900">Bridge Successful!</p>
                    <p className="text-sm text-green-700">Assets sent to Bridge Vault.</p>
                    {txHash && (
                      <a
                        href={`https://www.mintscan.io/osmosis/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:text-green-700 hover:underline flex items-center gap-1 mt-1"
                      >
                        View Transaction <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </div>
                <Button
                  variant="bordered"
                  className="w-full mt-3 border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => {
                    setStep('idle');
                    setAmount('');
                    setTxHash('');
                  }}
                >
                  Bridge More
                </Button>
              </CardBody>
            </Card>
          ) : (
            <Button
              className="w-full h-12 font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:from-blue-500 hover:to-indigo-500 transition-all"
              onClick={handleBridge}
              isDisabled={!amount || isBridging}
              isLoading={isBridging}
            >
              {step === 'signing' ? 'Signing Transaction...' :
                step === 'bridging' ? 'Bridging Assets...' :
                  'Bridge to Privacy'}
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
};
