// SwapInterface Component
// Shielded AMM swap interface for private token exchanges

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Input, Chip, Progress } from '@nextui-org/react';
import { ArrowDownUp, Settings, Info, Zap, Shield, CheckCircle2, ExternalLink, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { executeAleoOperation, OPERATION_TYPES } from '../../lib/aleo/aleoTransactionHelper';
import toast from 'react-hot-toast';

const TOKENS = [
    { symbol: 'ALEO', name: 'Aleo Credits', icon: '🔷' },
    { symbol: 'USDC', name: 'USD Coin', icon: '💵' },
    { symbol: 'WETH', name: 'Wrapped Ether', icon: '⟠' },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', icon: '₿' },
];

export default function SwapInterface() {
    const { connected, publicKey, requestTransaction, transactionStatus } = useWallet();
    const [fromToken, setFromToken] = useState('ALEO');
    const [toToken, setToToken] = useState('USDC');
    const [fromAmount, setFromAmount] = useState('');
    const [toAmount, setToAmount] = useState('');
    const [slippage, setSlippage] = useState('0.5');
    const [isPrivate, setIsPrivate] = useState(true);
    const [isSwapping, setIsSwapping] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [lastTx, setLastTx] = useState(null);

    // Calculate output amount
    useEffect(() => {
        if (fromAmount && parseFloat(fromAmount) > 0) {
            const mockRate = 0.52;
            const calculatedAmount = parseFloat(fromAmount) * mockRate;
            setToAmount(calculatedAmount.toFixed(6));
        } else {
            setToAmount('');
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
            toast.loading('Submitting swap...', { id: 'swap-loading' });

            const result = await executeAleoOperation(
                requestTransaction,
                publicKey,
                OPERATION_TYPES.SWAP,
                {
                    fromToken,
                    toToken,
                    fromAmount,
                    toAmount,
                    slippage,
                    isPrivate
                },
                transactionStatus
            );

            toast.dismiss('swap-loading');
            setLastTx(result);
            
            if (result.isRealTxId) {
                toast.success(
                    <div>
                        <p className="font-bold">Swap confirmed!</p>
                        <p className="text-xs text-gray-600">TX: {result.txHash.substring(0, 20)}...</p>
                        <a 
                            href={result.explorerLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-blue-500 underline flex items-center gap-1"
                        >
                            View on Explorer <ExternalLink size={12} />
                        </a>
                    </div>
                );
            } else {
                toast.success(
                    <div>
                        <p className="font-bold">Swap submitted!</p>
                        <p className="text-xs text-gray-600">Waiting for confirmation...</p>
                    </div>
                );
            }

            setFromAmount('');
            setToAmount('');
        } catch (error) {
            toast.dismiss('swap-loading');
            console.error('[Swap] Error:', error);
            if (error.message?.includes('rejected') || error.message?.includes('cancelled')) {
                toast.error('Transaction cancelled');
            } else {
                toast.error(error.message || 'Swap failed');
            }
        } finally {
            setIsSwapping(false);
        }
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
                            <Chip size="sm" color="success" variant="flat" startContent={<Shield size={12} />} className="font-bold">
                                PRIVATE
                            </Chip>
                        )}
                        <Button isIconOnly size="sm" variant="flat" onClick={() => setShowSettings(!showSettings)} className="rounded-xl">
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
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">Slippage Tolerance (%)</label>
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
                                <span className="text-gray-500">Slippage Tolerance</span>
                                <span className="text-gray-900 font-medium">{slippage}%</span>
                            </div>
                        </motion.div>
                    )}

                    {/* Last Transaction */}
                    {lastTx && (
                        <div className={`p-4 rounded-xl border ${lastTx.isRealTxId ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className={`w-5 h-5 ${lastTx.isRealTxId ? 'text-green-600' : 'text-yellow-600'}`} />
                                    <span className={`text-sm font-bold ${lastTx.isRealTxId ? 'text-green-900' : 'text-yellow-900'}`}>
                                        {lastTx.isRealTxId ? 'Swap Confirmed' : 'Swap Submitted'}
                                    </span>
                                </div>
                                <a
                                    href={lastTx.explorerLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={`text-xs underline flex items-center gap-1 ${lastTx.isRealTxId ? 'text-green-700' : 'text-yellow-700'}`}
                                >
                                    {lastTx.isRealTxId ? `${lastTx.txHash?.substring(0, 15)}...` : 'View Address'} <ExternalLink size={12} />
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Swap Button */}
                    {!connected ? (
                        <div className="space-y-3">
                            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
                                <Wallet className="w-5 h-5 text-blue-600" />
                                <p className="text-sm text-blue-700">Connect your wallet to swap tokens</p>
                            </div>
                            <WalletMultiButton className="!w-full !bg-blue-600 hover:!bg-blue-700 !text-white !font-bold !h-12 !rounded-xl" />
                        </div>
                    ) : (
                        <Button
                            onClick={handleSwap}
                            isLoading={isSwapping}
                            isDisabled={isSwapping || !fromAmount || parseFloat(fromAmount) <= 0}
                            color="primary"
                            className="w-full h-12 rounded-xl font-bold text-base"
                            startContent={!isSwapping && <Zap size={20} />}
                        >
                            {isSwapping ? 'Swapping...' : 'Swap'}
                        </Button>
                    )}

                    {/* Privacy Notice */}
                    {isPrivate && (
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2">
                            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-blue-700 leading-relaxed">
                                Private swap uses zero-knowledge proofs to hide your trading activity.
                            </p>
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
