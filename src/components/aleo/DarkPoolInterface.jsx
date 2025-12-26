// DarkPoolInterface Component
// Private order management interface for dark pool trading

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Input, Select, SelectItem, Chip, Tooltip, Progress } from '@nextui-org/react';
import { TrendingUp, TrendingDown, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAleoWallet } from '../../hooks/useAleoWallet';
import { DarkPoolService } from '../../lib/aleo/darkpool';
import toast from 'react-hot-toast';

const ORDER_TYPES = [
    { value: 'market', label: 'Market Order' },
    { value: 'limit', label: 'Limit Order' },
    { value: 'twap', label: 'TWAP Order' },
    { value: 'stop_loss', label: 'Stop Loss' },
];

const ORDER_SIDES = [
    { value: 'buy', label: 'Buy', color: 'success' },
    { value: 'sell', label: 'Sell', color: 'danger' },
];

export default function DarkPoolInterface() {
    const { connected, executeTransition, onProofProgress } = useAleoWallet();
    const [orderType, setOrderType] = useState('market');
    const [orderSide, setOrderSide] = useState('buy');
    const [tokenPair, setTokenPair] = useState('ALEO/USDC');
    const [amount, setAmount] = useState('');
    const [price, setPrice] = useState('');
    const [isPrivate, setIsPrivate] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [proofProgress, setProofProgress] = useState(null);
    const [myOrders, setMyOrders] = useState([]);

    // Subscribe to proof progress
    useEffect(() => {
        if (!connected) return;

        const unsubscribe = onProofProgress((progress) => {
            setProofProgress(progress);
        });

        return unsubscribe;
    }, [connected, onProofProgress]);

    // Load user's orders
    useEffect(() => {
        if (connected) {
            loadMyOrders();
        }
    }, [connected]);

    const loadMyOrders = async () => {
        try {
            // This would fetch actual orders from the blockchain
            // For now, we'll use mock data
            const mockOrders = [
                {
                    id: '1',
                    type: 'limit',
                    side: 'buy',
                    pair: 'ALEO/USDC',
                    amount: '100',
                    price: '0.50',
                    status: 'open',
                    timestamp: Date.now() - 3600000,
                },
                {
                    id: '2',
                    type: 'market',
                    side: 'sell',
                    pair: 'ALEO/USDC',
                    amount: '50',
                    price: '0.52',
                    status: 'filled',
                    timestamp: Date.now() - 7200000,
                },
            ];
            setMyOrders(mockOrders);
        } catch (error) {
            console.error('[DarkPool] Load orders error:', error);
        }
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

            // Prepare order inputs
            const inputs = [
                tokenPair,
                orderSide,
                `${parseFloat(amount)}u64`,
                orderType === 'limit' ? `${parseFloat(price)}u64` : '0u64',
                isPrivate ? 'true' : 'false',
            ];

            // Execute place_order transition
            const result = await executeTransition(
                'dark_pool.aleo',
                'place_order',
                inputs,
                { waitForConfirmation: true }
            );

            toast.success('Order placed successfully!');

            // Reload orders
            await loadMyOrders();

            // Reset form
            setAmount('');
            setPrice('');
        } catch (error) {
            console.error('[DarkPool] Submit order error:', error);
            toast.error(error.message || 'Failed to place order');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelOrder = async (orderId) => {
        try {
            const inputs = [orderId];
            await executeTransition('dark_pool.aleo', 'cancel_order', inputs);
            toast.success('Order cancelled');
            await loadMyOrders();
        } catch (error) {
            console.error('[DarkPool] Cancel order error:', error);
            toast.error('Failed to cancel order');
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
                                classNames={{
                                    trigger: "rounded-xl border-gray-200",
                                }}
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
                                {ORDER_SIDES.map((side) => (
                                    <Button
                                        key={side.value}
                                        onClick={() => setOrderSide(side.value)}
                                        color={orderSide === side.value ? side.color : 'default'}
                                        variant={orderSide === side.value ? 'solid' : 'flat'}
                                        className="flex-1 rounded-xl font-semibold"
                                        startContent={side.value === 'buy' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    >
                                        {side.label}
                                    </Button>
                                ))}
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
                                classNames={{
                                    inputWrapper: "rounded-xl border-gray-200",
                                }}
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
                                    classNames={{
                                        inputWrapper: "rounded-xl border-gray-200",
                                    }}
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
                                    Your order details will be encrypted using zero-knowledge proofs. Only matched orders will be revealed.
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
                                    <span className="text-purple-600 font-bold">{proofProgress.progress}%</span>
                                </div>
                                <Progress
                                    value={proofProgress.progress}
                                    color="secondary"
                                    className="h-2"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Submit Button */}
                    <Button
                        onClick={handleSubmitOrder}
                        isLoading={isSubmitting}
                        isDisabled={!connected || isSubmitting}
                        color={orderSide === 'buy' ? 'success' : 'danger'}
                        className="w-full h-12 rounded-xl font-bold text-base"
                        startContent={!isSubmitting && (orderSide === 'buy' ? <TrendingUp size={20} /> : <TrendingDown size={20} />)}
                    >
                        {isSubmitting ? 'Placing Order...' : `Place ${orderSide === 'buy' ? 'Buy' : 'Sell'} Order`}
                    </Button>
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
                                                startContent={order.status === 'filled' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                            >
                                                {order.status}
                                            </Chip>
                                            {order.status === 'open' && (
                                                <Button
                                                    size="sm"
                                                    variant="flat"
                                                    color="danger"
                                                    onClick={() => handleCancelOrder(order.id)}
                                                    className="rounded-lg"
                                                >
                                                    Cancel
                                                </Button>
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
