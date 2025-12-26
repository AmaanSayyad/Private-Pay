// SwapInterface Component
// Shielded AMM swap interface for private token exchanges

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Input, Chip, Tooltip, Progress } from '@nextui-org/react';
import { ArrowDownUp, Settings, Info, Zap, Shield, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAleoWallet } from '../../hooks/useAleoWallet';
import { calculateSlippage, calculatePriceImpact } from '../../lib/aleo/utils';
import toast from 'react-hot-toast';

const TOKENS = [
    { symbol: 'ALEO', name: 'Aleo Credits', icon: '🔷' },
    { symbol: 'USDC', name: 'USD Coin', icon: '💵' },
    { symbol: 'WETH', name: 'Wrapped Ether', icon: '⟠' },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', icon: '₿' },
];

export default function SwapInterface() {
    const { connected, executeTransition, onProofProgress } = useAleoWallet();
    const [fromToken, setFromToken] = useState('ALEO');
    const [toToken, setToToken] = useState('USDC');
    const [fromAmount, setFromAmount] = useState('');
    const [toAmount, setToAmount] = useState('');
    const [slippage, setSlippage] = useState('0.5');
    const [isPrivate, setIsPrivate] = useState(true);
    const [isSwapping, setIsSwapping] = useState(false);
    const [proofProgress, setProofProgress] = useState(null);
    const [showSettings, setShowSettings] = useState(false);
    const [priceImpact, setPriceImpact] = useState(0);

    // Subscribe to proof progress
    useEffect(() => {
        if (!connected) return;
        const unsubscribe = onProofProgress((progress) => {
            setProofProgress(progress);
        });
        return unsubscribe;
    }, [connected, onProofProgress]);

    // Calculate output amount and price impact
    useEffect(() => {
        if (fromAmount && parseFloat(fromAmount) > 0) {
            // Simulate AMM calculation (constant product formula)
            // In reality, this would query the actual pool reserves
            const mockRate = 0.52; // 1 ALEO = 0.52 USDC
            const calculatedAmount = parseFloat(fromAmount) * mockRate;
            setToAmount(calculatedAmount.toFixed(6));

            // Calculate price impact (mock)
            const mockReserveFrom = 100000;
            const mockReserveTo = 52000;
            const impact = calculatePriceImpact(parseFloat(fromAmount), mockReserveFrom, mockReserveTo);
            setPriceImpact(impact);
        } else {
            setToAmount('');
            setPriceImpact(0);
        }
    }, [fromAmount, fromToken, toToken]);

    const handleSwapTokens = () => {
        setFromToken(toToken);
        setToToken(fromToken);
        setFromAmount(toAmount);
        setToAmount(fromAmount);
    };

    const handleSwap = async () => {
        if (!connected) {
            toast.error('Please connect your wallet');
            return;
        }

        if (!fromAmount || parseFloat(fromAmount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        try {
            setIsSwapping(true);

            // Prepare swap inputs
            const inputs = [
                fromToken,
                toToken,
                `${parseFloat(fromAmount)}u64`,
                `${parseFloat(toAmount)}u64`,
                `${parseFloat(slippage)}u64`,
                isPrivate ? 'true' : 'false',
            ];

            // Execute swap transition
            const result = await executeTransition(
                'shielded_amm.aleo',
                'swap',
                inputs,
                { waitForConfirmation: true }
            );

            toast.success('Swap completed successfully!');

            // Reset form
            setFromAmount('');
            setToAmount('');
        } catch (error) {
            console.error('[Swap] Error:', error);
            toast.error(error.message || 'Swap failed');
        } finally {
            setIsSwapping(false);
        }
    };

    const getPriceImpactColor = () => {
        if (priceImpact < 1) return 'text-green-600';
        if (priceImpact < 3) return 'text-yellow-600';
        return 'text-red-600';
    };

    return (
        <div className="w-full max-w-lg mx-auto">
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                <CardHeader className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <ArrowDownUp className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Shielded Swap</h3>
                            <p className="text-xs text-gray-500">Private token exchange</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {isPrivate && (
                            <Tooltip content="Private swap enabled">
                                <Chip
                                    size="sm"
                                    color="success"
                                    variant="flat"
                                    startContent={<Shield size={12} />}
                                    className="font-bold"
                                >
                                    PRIVATE
                                </Chip>
                            </Tooltip>
                        )}
                        <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            onClick={() => setShowSettings(!showSettings)}
                            className="rounded-xl"
                        >
                            <Settings size={18} />
                        </Button>
                    </div>
                </CardHeader>

                <CardBody className="p-6 space-y-4">
                    {/* Settings Panel */}
                    <AnimatePresence>
                        {showSettings && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="p-4 bg-gray-50 rounded-xl space-y-4"
                            >
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Slippage Tolerance (%)
                                    </label>
                                    <div className="flex gap-2">
                                        {['0.1', '0.5', '1.0'].map((value) => (
                                            <Button
                                                key={value}
                                                size="sm"
                                                variant={slippage === value ? 'solid' : 'flat'}
                                                color={slippage === value ? 'primary' : 'default'}
                                                onClick={() => setSlippage(value)}
                                                className="flex-1 rounded-lg"
                                            >
                                                {value}%
                                            </Button>
                                        ))}
                                        <Input
                                            type="number"
                                            value={slippage}
                                            onChange={(e) => setSlippage(e.target.value)}
                                            className="w-24"
                                            classNames={{
                                                inputWrapper: "rounded-lg h-8",
                                            }}
                                            endContent={<span className="text-xs text-gray-500">%</span>}
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700">Privacy Mode</span>
                                    <Button
                                        size="sm"
                                        color={isPrivate ? 'success' : 'default'}
                                        variant="flat"
                                        onClick={() => setIsPrivate(!isPrivate)}
                                        className="rounded-lg"
                                    >
                                        {isPrivate ? 'ON' : 'OFF'}
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* From Token */}
                    <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">From</span>
                            <span className="text-xs text-gray-400">Balance: 1,234.56</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Input
                                type="number"
                                value={fromAmount}
                                onChange={(e) => setFromAmount(e.target.value)}
                                placeholder="0.0"
                                size="lg"
                                classNames={{
                                    input: "text-2xl font-bold",
                                    inputWrapper: "bg-white rounded-xl border-gray-200",
                                }}
                            />
                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 min-w-[120px]">
                                <span className="text-2xl">{TOKENS.find(t => t.symbol === fromToken)?.icon}</span>
                                <span className="text-sm font-bold text-gray-900">{fromToken}</span>
                            </div>
                        </div>
                    </div>

                    {/* Swap Button */}
                    <div className="flex justify-center -my-2 relative z-10">
                        <Button
                            isIconOnly
                            onClick={handleSwapTokens}
                            className="rounded-xl bg-white border-4 border-gray-50 shadow-md hover:shadow-lg transition-all"
                            size="lg"
                        >
                            <ArrowDownUp className="w-5 h-5 text-gray-600" />
                        </Button>
                    </div>

                    {/* To Token */}
                    <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500">To</span>
                            <span className="text-xs text-gray-400">Balance: 987.65</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Input
                                type="number"
                                value={toAmount}
                                readOnly
                                placeholder="0.0"
                                size="lg"
                                classNames={{
                                    input: "text-2xl font-bold",
                                    inputWrapper: "bg-white rounded-xl border-gray-200",
                                }}
                            />
                            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-gray-200 min-w-[120px]">
                                <span className="text-2xl">{TOKENS.find(t => t.symbol === toToken)?.icon}</span>
                                <span className="text-sm font-bold text-gray-900">{toToken}</span>
                            </div>
                        </div>
                    </div>

                    {/* Swap Details */}
                    {fromAmount && parseFloat(fromAmount) > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="p-4 bg-gray-50 rounded-xl space-y-2"
                        >
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Rate</span>
                                <span className="text-gray-900 font-medium">
                                    1 {fromToken} = {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(4)} {toToken}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Price Impact</span>
                                <span className={`font-medium ${getPriceImpactColor()}`}>
                                    {priceImpact.toFixed(2)}%
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Slippage Tolerance</span>
                                <span className="text-gray-900 font-medium">{slippage}%</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Minimum Received</span>
                                <span className="text-gray-900 font-medium">
                                    {(parseFloat(toAmount) * (1 - parseFloat(slippage) / 100)).toFixed(6)} {toToken}
                                </span>
                            </div>
                        </motion.div>
                    )}

                    {/* Price Impact Warning */}
                    {priceImpact > 3 && (
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-red-900">High Price Impact</h4>
                                <p className="text-xs text-red-700 mt-1 leading-relaxed">
                                    This trade will significantly impact the pool price. Consider splitting into smaller trades.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Proof Progress */}
                    <AnimatePresence>
                        {proofProgress && proofProgress.status === 'generating' && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="space-y-2"
                            >
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-700 font-medium">{proofProgress.message}</span>
                                    <span className="text-blue-600 font-bold">{proofProgress.progress}%</span>
                                </div>
                                <Progress
                                    value={proofProgress.progress}
                                    color="primary"
                                    className="h-2"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Swap Button */}
                    <Button
                        onClick={handleSwap}
                        isLoading={isSwapping}
                        isDisabled={!connected || isSwapping || !fromAmount || parseFloat(fromAmount) <= 0}
                        color="primary"
                        className="w-full h-12 rounded-xl font-bold text-base"
                        startContent={!isSwapping && <Zap size={20} />}
                    >
                        {isSwapping ? 'Swapping...' : 'Swap'}
                    </Button>

                    {/* Privacy Notice */}
                    {isPrivate && (
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2">
                            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-700 leading-relaxed">
                                Private swap uses zero-knowledge proofs to hide your trading activity while ensuring correct execution.
                            </p>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
