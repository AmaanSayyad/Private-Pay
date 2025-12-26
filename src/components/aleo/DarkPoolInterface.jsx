// DarkPoolInterface Component
// Private order management interface for dark pool trading

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Input, Select, SelectItem, Chip } from '@nextui-org/react';
import { TrendingUp, TrendingDown, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ExternalLink, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { executeAleoOperation, OPERATION_TYPES, getTransactionHistory } from '../../lib/aleo/aleoTransactionHelper';
import toast from 'react-hot-toast';

const ORDER_TYPES = [
    { value: 'market', label: 'Market Order' },
    { value: 'limit', label: 'Limit Order' },
    { value: 'twap', label: 'TWAP Order' },
    { value: 'stop_loss', label: 'Stop Loss' },
];

export default function DarkPoolInterface() {
    const { connected, publicKey, requestTransaction, transactionStatus } = useWallet();
    const [orderType, setOrderType] = useState('market');
    const [orderSide, setOrderSide] = useState('buy');
    const [tokenPair, setTokenPair] = useState('ALEO/USDC');
    const [amount, setAmount] = useState('');
    const [price, setPrice] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [myOrders, setMyOrders] = useState([]);
    const [lastTx, setLastTx] = useState(null);

    // Load orders from history
    useEffect(() => {
        if (connected) {
            loadMyOrders();
        }
    }, [connected]);

    const loadMyOrders = () => {
        const history = getTransactionHistory();
        const darkPoolOrders = history
            .filter(tx => tx.operationType?.startsWith('dark_pool'))
            .slice(0, 10)
            .map((tx, i) => ({
                id: tx.txHash?.substring(0, 10) || `order_${i}`,
                type: tx.params?.orderType || 'market',
                side: tx.params?.side || 'buy',
                pair: tx.params?.pair || 'ALEO/USDC',
                amount: tx.params?.amount || '0',
                price: tx.params?.price || '0',
                status: 'filled',
                timestamp: tx.timestamp,
                txHash: tx.txHash,
                explorerLink: tx.explorerLink
            }));
        setMyOrders(darkPoolOrders);
    };

    const handleSubmitOrder = async () => {
        if (!connected) {
            toast.error('Please connect your wallet');
            return;
        }

        if (!amount || (orderType === 'limit' && !price)) {
            toast.error('Please fill all required fields');
            return;
        }

        try {
            setIsSubmitting(true);
            toast.loading('Submitting order...', { id: 'order-loading' });

            const result = await executeAleoOperation(
                requestTransaction,
                publicKey,
                OPERATION_TYPES.PLACE_ORDER,
                {
                    orderType,
                    side: orderSide,
                    pair: tokenPair,
                    amount,
                    price: price || 'market',
                    isPrivate
                },
                transactionStatus // Pass transactionStatus for polling
            );

            toast.dismiss('order-loading');
            setLastTx(result);
            
            if (result.isRealTxId) {
                toast.success(
                    <div>
                        <p className="font-bold">Order confirmed on-chain!</p>
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
                        <p className="font-bold">Order submitted!</p>
                        <p className="text-xs text-gray-600">Waiting for confirmation...</p>
                    </div>
                );
            }

            loadMyOrders();
            setAmount('');
            setPrice('');
        } catch (error) {
            toast.dismiss('order-loading');
            console.error('[DarkPool] Submit order error:', error);
            if (error.message?.includes('rejected') || error.message?.includes('cancelled')) {
                toast.error('Transaction cancelled');
            } else {
                toast.error(error.message || 'Failed to place order');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'open': return 'warning';
            case 'filled': return 'success';
            case 'cancelled': return 'default';
            default: return 'default';
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Order Form */}
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                <CardHeader className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Dark Pool Trading</h3>
                            <p className="text-xs text-gray-500">Private order execution</p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="flat"
                        color={isPrivate ? 'success' : 'default'}
                        startContent={isPrivate ? <Eye size={16} /> : <EyeOff size={16} />}
                        onClick={() => setIsPrivate(!isPrivate)}
                        className="rounded-xl"
                    >
                        {isPrivate ? 'Private' : 'Public'}
                    </Button>
                </CardHeader>

                <CardBody className="p-6 space-y-6">
                    {/* Order Type Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Order Type</label>
                            <Select
                                selectedKeys={[orderType]}
                                onChange={(e) => setOrderType(e.target.value)}
                                className="w-full"
                                classNames={{ trigger: "rounded-xl border-gray-200" }}
                            >
                                {ORDER_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </Select>
                        </div>

                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Side</label>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setOrderSide('buy')}
                                    color={orderSide === 'buy' ? 'success' : 'default'}
                                    variant={orderSide === 'buy' ? 'solid' : 'flat'}
                                    className="flex-1 rounded-xl font-semibold"
                                    startContent={<TrendingUp size={16} />}
                                >
                                    Buy
                                </Button>
                                <Button
                                    onClick={() => setOrderSide('sell')}
                                    color={orderSide === 'sell' ? 'danger' : 'default'}
                                    variant={orderSide === 'sell' ? 'solid' : 'flat'}
                                    className="flex-1 rounded-xl font-semibold"
                                    startContent={<TrendingDown size={16} />}
                                >
                                    Sell
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Token Pair */}
                    <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Token Pair</label>
                        <Input
                            value={tokenPair}
                            onChange={(e) => setTokenPair(e.target.value)}
                            placeholder="ALEO/USDC"
                            classNames={{
                                input: "font-mono",
                                inputWrapper: "rounded-xl border-gray-200",
                            }}
                        />
                    </div>

                    {/* Amount and Price */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-700 mb-2 block">Amount</label>
                            <Input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.0"
                                classNames={{ inputWrapper: "rounded-xl border-gray-200" }}
                            />
                        </div>

                        {orderType === 'limit' && (
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Price</label>
                                <Input
                                    type="number"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    placeholder="0.0"
                                    classNames={{ inputWrapper: "rounded-xl border-gray-200" }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Privacy Notice */}
                    {isPrivate && (
                        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-start gap-3">
                            <Lock className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div>
                                <h4 className="text-sm font-bold text-purple-900">Private Order</h4>
                                <p className="text-xs text-purple-700 mt-1 leading-relaxed">
                                    Your order details will be encrypted using zero-knowledge proofs.
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Last Transaction */}
                    {lastTx && (
                        <div className={`p-4 rounded-xl border ${lastTx.isRealTxId ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className={`w-5 h-5 ${lastTx.isRealTxId ? 'text-green-600' : 'text-yellow-600'}`} />
                                    <span className={`text-sm font-bold ${lastTx.isRealTxId ? 'text-green-900' : 'text-yellow-900'}`}>
                                        {lastTx.isRealTxId ? 'Transaction Confirmed' : 'Transaction Submitted'}
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

                    {/* Submit Button */}
                    {!connected ? (
                        <div className="space-y-3">
                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-3">
                                <Wallet className="w-5 h-5 text-purple-600" />
                                <p className="text-sm text-purple-700">Connect your wallet to place orders</p>
                            </div>
                            <WalletMultiButton className="!w-full !bg-purple-600 hover:!bg-purple-700 !text-white !font-bold !h-12 !rounded-xl" />
                        </div>
                    ) : (
                        <Button
                            onClick={handleSubmitOrder}
                            isLoading={isSubmitting}
                            isDisabled={isSubmitting || !amount}
                            color={orderSide === 'buy' ? 'success' : 'danger'}
                            className="w-full h-12 rounded-xl font-bold text-base"
                            startContent={!isSubmitting && (orderSide === 'buy' ? <TrendingUp size={20} /> : <TrendingDown size={20} />)}
                        >
                            {isSubmitting ? 'Placing Order...' : `Place ${orderSide === 'buy' ? 'Buy' : 'Sell'} Order`}
                        </Button>
                    )}
                </CardBody>
            </Card>

            {/* My Orders */}
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                <CardHeader className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">My Orders</h3>
                </CardHeader>
                <CardBody className="p-6">
                    {myOrders.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No orders yet</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {myOrders.map((order) => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-4 bg-gray-50 rounded-xl border border-gray-100"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <Chip
                                                size="sm"
                                                color={order.side === 'buy' ? 'success' : 'danger'}
                                                variant="flat"
                                                className="font-bold"
                                            >
                                                {order.side.toUpperCase()}
                                            </Chip>
                                            <div>
                                                <p className="text-sm font-bold text-gray-900">{order.pair}</p>
                                                <p className="text-xs text-gray-500">
                                                    {order.amount} @ {order.price}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Chip
                                                size="sm"
                                                color={getStatusColor(order.status)}
                                                variant="flat"
                                                startContent={<CheckCircle2 size={12} />}
                                            >
                                                {order.status}
                                            </Chip>
                                            {order.explorerLink && (
                                                <a
                                                    href={order.explorerLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-blue-500"
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>
        </div>
    );
}
