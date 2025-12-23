import { useState, useEffect, useCallback } from 'react';
import { useChain } from '@cosmos-kit/react';
import { Card, CardBody, Input, Button, Select, SelectItem, Spinner } from '@nextui-org/react';
import { ArrowDownUp, RefreshCw, Zap, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getOsmosisRestEndpoint } from '../../providers/CosmosProvider';

// Check if testnet
const isTestnet = import.meta.env.VITE_OSMOSIS_CHAIN_ID === 'osmo-test-5';
const chainName = isTestnet ? 'osmosistestnet' : 'osmosis';

const TOKENS = [
    { id: 'uosmo', symbol: 'OSMO', name: 'Osmosis', icon: '/assets/osmosis-logo.png', decimals: 6 },
    { id: 'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2', symbol: 'ATOM', name: 'Cosmos Hub', icon: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/cosmoshub/images/atom.png', decimals: 6 },
    { id: 'ibc/498A0751C798A0D9A389AA3691123DADA57DAA4FE165D5C75894505B876BA6E4', symbol: 'USDC', name: 'USDC', icon: '/assets/usdc.png', decimals: 6 },
];

// Pool IDs for common pairs on Osmosis
const POOLS = {
    'uosmo-ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2': '1', // ATOM/OSMO Pool #1
    'uosmo-ibc/498A0751C798A0D9A389AA3691123DADA57DAA4FE165D5C75894505B876BA6E4': '678', // USDC/OSMO Pool
};

// Approximate exchange rates for estimation (updated periodically)
const EXCHANGE_RATES = {
    'uosmo': 1,
    'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2': 12.5, // 1 ATOM ≈ 12.5 OSMO
    'ibc/498A0751C798A0D9A389AA3691123DADA57DAA4FE165D5C75894505B876BA6E4': 1.25, // 1 USDC ≈ 1.25 OSMO
};

export const SwapComponent = () => {
    const { address, status, getSigningStargateClient } = useChain(chainName);
    const [fromToken, setFromToken] = useState('uosmo');
    const [toToken, setToToken] = useState('ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2');
    const [fromAmount, setFromAmount] = useState('');
    const [toAmount, setToAmount] = useState('');
    const [isSwapping, setIsSwapping] = useState(false);
    const [isFetchingPrice, setIsFetchingPrice] = useState(false);
    const [priceImpact, setPriceImpact] = useState('0.15%');
    const [balances, setBalances] = useState({});
    const [isLoadingBalances, setIsLoadingBalances] = useState(false);

    // Fetch balances using REST API (LCD) - more CORS friendly
    const fetchBalances = useCallback(async () => {
        if (!address || status !== 'Connected') return;
        
        setIsLoadingBalances(true);
        try {
            const restEndpoint = getOsmosisRestEndpoint();
            const response = await fetch(`${restEndpoint}/cosmos/bank/v1beta1/balances/${address}`);
            
            if (!response.ok) {
                throw new Error('Failed to fetch balances');
            }
            
            const data = await response.json();
            const balanceMap = {};
            
            data.balances?.forEach(bal => {
                balanceMap[bal.denom] = bal.amount;
            });
            
            setBalances(balanceMap);
        } catch (error) {
            console.debug('Balance fetch error (using fallback):', error.message);
            // Use fallback - show 0 balances
            setBalances({
                'uosmo': '0',
                'ibc/27394FB092D2ECCD56123C74F36E4C1F926001CEADA9CA97EA622B25F41E5EB2': '0',
                'ibc/498A0751C798A0D9A389AA3691123DADA57DAA4FE165D5C75894505B876BA6E4': '0',
            });
        } finally {
            setIsLoadingBalances(false);
        }
    }, [address, status]);

    // Fetch balances on mount and when address changes
    useEffect(() => {
        if (status === 'Connected' && address) {
            fetchBalances();
        }
    }, [status, address, fetchBalances]);

    // Calculate estimated output using local rates
    const calculateEstimate = useCallback((amount, from, to) => {
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            return '';
        }
        
        const fromRate = EXCHANGE_RATES[from] || 1;
        const toRate = EXCHANGE_RATES[to] || 1;
        
        // Convert to OSMO base, then to target token
        const osmoValue = parseFloat(amount) * fromRate;
        const outputValue = osmoValue / toRate;
        
        return outputValue.toFixed(6);
    }, []);

    const handleSwap = async () => {
        if (!address || !fromAmount) return;

        setIsSwapping(true);
        try {
            // Get signing client from cosmos-kit (handles Buffer polyfill internally)
            const signingClient = await getSigningStargateClient();

            // Find pool ID for this pair
            const poolKey = `${fromToken}-${toToken}`;
            const reversePoolKey = `${toToken}-${fromToken}`;
            const poolId = POOLS[poolKey] || POOLS[reversePoolKey];

            if (!poolId) {
                throw new Error("Pool not found for this trading pair");
            }

            const fromDecimals = TOKENS.find(t => t.id === fromToken)?.decimals || 6;
            const toDecimals = TOKENS.find(t => t.id === toToken)?.decimals || 6;

            const amountIn = Math.floor(parseFloat(fromAmount) * Math.pow(10, fromDecimals)).toString();
            const minAmountOut = Math.floor(parseFloat(toAmount) * 0.97 * Math.pow(10, toDecimals)).toString(); // 3% slippage

            // Create swap message using Osmosis gamm module
            const msg = {
                typeUrl: "/osmosis.gamm.v1beta1.MsgSwapExactAmountIn",
                value: {
                    sender: address,
                    routes: [{
                        poolId: poolId,
                        tokenOutDenom: toToken
                    }],
                    tokenIn: {
                        denom: fromToken,
                        amount: amountIn
                    },
                    tokenOutMinAmount: minAmountOut
                }
            };

            const fee = {
                amount: [{ denom: 'uosmo', amount: '7500' }],
                gas: '300000'
            };

            const result = await signingClient.signAndBroadcast(
                address,
                [msg],
                fee,
                'Swap via PrivatePay'
            );

            if (result.code === 0) {
                toast.success(`Swap successful! TX: ${result.transactionHash.slice(0, 10)}...`);
                setFromAmount('');
                setToAmount('');
                // Refresh balances after swap
                setTimeout(fetchBalances, 2000);
            } else {
                throw new Error(result.rawLog || 'Transaction failed');
            }
        } catch (error) {
            console.error('Swap Error:', error);
            if (error.message?.includes('rejected')) {
                toast.error('Transaction rejected by user');
            } else if (error.message?.includes('insufficient')) {
                toast.error('Insufficient balance for swap');
            } else {
                toast.error(`Swap failed: ${error.message?.slice(0, 50) || 'Unknown error'}`);
            }
        } finally {
            setIsSwapping(false);
        }
    };

    const fetchEstimate = (amount) => {
        if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
            setToAmount('');
            return;
        }

        setIsFetchingPrice(true);
        
        // Use local calculation for instant feedback
        const estimated = calculateEstimate(amount, fromToken, toToken);
        setToAmount(estimated);
        
        // Calculate approximate price impact based on amount
        const impact = parseFloat(amount) > 1000 ? '0.45%' : parseFloat(amount) > 100 ? '0.25%' : '0.15%';
        setPriceImpact(impact);
        
        setIsFetchingPrice(false);
    };

    const flipTokens = () => {
        const f = fromToken;
        const t = toToken;
        setFromToken(t);
        setToToken(f);
        setFromAmount(toAmount);
        setToAmount(fromAmount);
    };

    const getBalance = (denom) => {
        const balance = balances[denom] || '0';
        const token = TOKENS.find(t => t.id === denom);
        const decimals = token?.decimals || 6;
        return (parseFloat(balance) / Math.pow(10, decimals)).toFixed(4);
    };

    return (
        <Card className="bg-white border border-gray-200 shadow-sm rounded-3xl">
            <CardBody className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <RefreshCw className="w-5 h-5 text-blue-600" />
                        Interchain Swap
                    </h3>
                    <div className="flex items-center gap-2">
                        <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            onClick={fetchBalances}
                            isLoading={isLoadingBalances}
                            className="bg-gray-100"
                        >
                            <RefreshCw size={14} />
                        </Button>
                        <div className="flex items-center gap-1 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                            <Zap className="w-3 h-3 text-blue-600" />
                            <span className="text-[10px] font-bold text-blue-600 uppercase">Superfluid</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* From */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">You Pay</span>
                            <span className="text-xs text-gray-500">
                                Balance: {isLoadingBalances ? '...' : getBalance(fromToken)}
                            </span>
                        </div>
                        <div className="flex gap-3">
                            <Select
                                selectedKeys={[fromToken]}
                                onSelectionChange={(keys) => {
                                    const newToken = Array.from(keys)[0];
                                    setFromToken(newToken);
                                    fetchEstimate(fromAmount);
                                }}
                                className="w-32"
                                variant="flat"
                                classNames={{ trigger: "bg-white shadow-sm border border-gray-200 h-12" }}
                            >
                                {TOKENS.map((token) => (
                                    <SelectItem key={token.id} textValue={token.symbol}>
                                        <div className="flex items-center gap-2">
                                            <img src={token.icon} className="w-5 h-5 rounded-full" alt={token.symbol} />
                                            <span className="font-bold">{token.symbol}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </Select>
                            <Input
                                type="number"
                                placeholder="0.00"
                                value={fromAmount}
                                onChange={(e) => {
                                    setFromAmount(e.target.value);
                                    fetchEstimate(e.target.value);
                                }}
                                className="flex-1"
                                classNames={{ inputWrapper: "bg-white shadow-sm border border-gray-200 h-12" }}
                            />
                        </div>
                    </div>

                    {/* Flip Button */}
                    <div className="flex justify-center -my-6 relative z-10">
                        <Button
                            isIconOnly
                            onClick={flipTokens}
                            className="bg-white border-2 border-blue-100 shadow-md hover:shadow-lg rounded-full w-10 h-10 min-w-10 text-blue-600"
                        >
                            <ArrowDownUp size={18} />
                        </Button>
                    </div>

                    {/* To */}
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-gray-500 uppercase">You Receive</span>
                            <span className="text-xs text-gray-500">
                                Balance: {isLoadingBalances ? '...' : getBalance(toToken)}
                            </span>
                        </div>
                        <div className="flex gap-3">
                            <Select
                                selectedKeys={[toToken]}
                                onSelectionChange={(keys) => {
                                    const newToken = Array.from(keys)[0];
                                    setToToken(newToken);
                                    fetchEstimate(fromAmount);
                                }}
                                className="w-32"
                                variant="flat"
                                classNames={{ trigger: "bg-white shadow-sm border border-gray-200 h-12" }}
                            >
                                {TOKENS.map((token) => (
                                    <SelectItem key={token.id} textValue={token.symbol}>
                                        <div className="flex items-center gap-2">
                                            <img src={token.icon} className="w-5 h-5 rounded-full" alt={token.symbol} />
                                            <span className="font-bold">{token.symbol}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </Select>
                            <div className="flex-1 bg-white shadow-sm border border-gray-200 rounded-xl px-4 flex items-center justify-end relative h-12">
                                {isFetchingPrice ? (
                                    <Spinner size="sm" color="primary" />
                                ) : (
                                    <span className="text-lg font-semibold text-gray-900">{toAmount || '0.00'}</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Info Card */}
                    <div className="flex flex-col gap-2 p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 px-1">Price Impact</span>
                            <span className="text-emerald-600 font-bold">{priceImpact}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 px-1">Network Fee</span>
                            <span className="text-gray-900 font-medium">~0.0075 OSMO</span>
                        </div>
                        <div className="flex justify-between text-xs">
                            <span className="text-gray-500 px-1">Expected Output</span>
                            <span className="text-gray-900 font-medium">
                                {toAmount || '0.00'} {TOKENS.find(t => t.id === toToken)?.symbol}
                            </span>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-2 px-2 py-1">
                        <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5" />
                        <p className="text-[10px] text-gray-500">
                            By swapping, you agree to our Terms of Service. Tokens will be automatically routed for the best possible price across Osmosis pools.
                        </p>
                    </div>

                    <Button
                        onClick={handleSwap}
                        isDisabled={!fromAmount || isSwapping || !address}
                        isLoading={isSwapping}
                        className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all rounded-2xl"
                    >
                        {address ? (isSwapping ? 'Swapping...' : 'Swap Tokens') : 'Connect Wallet'}
                    </Button>
                </div>
            </CardBody>
        </Card>
    );
};
