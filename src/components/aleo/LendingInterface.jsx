// LendingInterface Component
// Private lending and borrowing interface

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Input, Tabs, Tab, Chip, Progress, Tooltip } from '@nextui-org/react';
import { Coins, TrendingUp, Shield, Info, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAleoWallet } from '../../hooks/useAleoWallet';
import toast from 'react-hot-toast';

const LENDING_POOLS = [
    {
        id: 'pool_1',
        name: 'ALEO Lending Pool',
        asset: 'ALEO',
        totalSupply: 1000000,
        totalBorrow: 450000,
        supplyAPY: 5.2,
        borrowAPY: 8.5,
        utilizationRate: 45,
    },
    {
        id: 'pool_2',
        name: 'USDC Lending Pool',
        asset: 'USDC',
        totalSupply: 500000,
        totalBorrow: 200000,
        supplyAPY: 3.8,
        borrowAPY: 6.2,
        utilizationRate: 40,
    },
];

export default function LendingInterface() {
    const { connected, executeTransition, onProofProgress } = useAleoWallet();
    const [activeTab, setActiveTab] = useState('supply');
    const [selectedPool, setSelectedPool] = useState(LENDING_POOLS[0]);
    const [amount, setAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [proofProgress, setProofProgress] = useState(null);
    const [userPositions, setUserPositions] = useState({
        supplied: [],
        borrowed: [],
    });
    const [collateralRatio, setCollateralRatio] = useState(0);

    // Subscribe to proof progress
    useEffect(() => {
        if (!connected) return;
        const unsubscribe = onProofProgress((progress) => {
            setProofProgress(progress);
        });
        return unsubscribe;
    }, [connected, onProofProgress]);

    // Load user positions
    useEffect(() => {
        if (connected) {
            loadUserPositions();
        }
    }, [connected]);

    const loadUserPositions = async () => {
        try {
            // Mock user positions
            const mockPositions = {
                supplied: [
                    {
                        pool: 'ALEO',
                        amount: 1000,
                        apy: 5.2,
                        earned: 52,
                    },
                ],
                borrowed: [
                    {
                        pool: 'USDC',
                        amount: 500,
                        apy: 6.2,
                        collateral: 1200,
                        healthFactor: 2.4,
                    },
                ],
            };

            setUserPositions(mockPositions);

            // Calculate collateral ratio
            const totalCollateral = mockPositions.borrowed.reduce((sum, pos) => sum + pos.collateral, 0);
            const totalBorrowed = mockPositions.borrowed.reduce((sum, pos) => sum + pos.amount, 0);
            setCollateralRatio(totalBorrowed > 0 ? (totalCollateral / totalBorrowed) * 100 : 0);
        } catch (error) {
            console.error('[Lending] Load positions error:', error);
        }
    };

    const handleSupply = async () => {
        if (!connected) {
            toast.error('Please connect your wallet');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        try {
            setIsProcessing(true);

            const inputs = [
                selectedPool.id,
                `${parseFloat(amount)}u64`,
            ];

            await executeTransition(
                'private_lending.aleo',
                'deposit',
                inputs,
                { waitForConfirmation: true }
            );

            toast.success('Supply successful!');
            setAmount('');
            await loadUserPositions();
        } catch (error) {
            console.error('[Lending] Supply error:', error);
            toast.error(error.message || 'Supply failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBorrow = async () => {
        if (!connected) {
            toast.error('Please connect your wallet');
            return;
        }

        if (!amount || parseFloat(amount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        try {
            setIsProcessing(true);

            const inputs = [
                selectedPool.id,
                `${parseFloat(amount)}u64`,
                `${parseFloat(amount) * 1.5}u64`, // 150% collateral
            ];

            await executeTransition(
                'private_lending.aleo',
                'borrow',
                inputs,
                { waitForConfirmation: true }
            );

            toast.success('Borrow successful!');
            setAmount('');
            await loadUserPositions();
        } catch (error) {
            console.error('[Lending] Borrow error:', error);
            toast.error(error.message || 'Borrow failed');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleRepay = async (position) => {
        try {
            const inputs = [
                position.pool,
                `${position.amount}u64`,
            ];

            await executeTransition(
                'private_lending.aleo',
                'repay',
                inputs,
                { waitForConfirmation: true }
            );

            toast.success('Repayment successful!');
            await loadUserPositions();
        } catch (error) {
            console.error('[Lending] Repay error:', error);
            toast.error('Repayment failed');
        }
    };

    const getHealthFactorColor = (healthFactor) => {
        if (healthFactor >= 2) return 'success';
        if (healthFactor >= 1.5) return 'warning';
        return 'danger';
    };

    return (
        <div className="w-full space-y-6">
            {/* Lending Pools */}
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                <CardHeader className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                            <Coins className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Private Lending</h3>
                            <p className="text-xs text-gray-500">Supply and borrow with privacy</p>
                        </div>
                    </div>
                </CardHeader>

                <CardBody className="p-6 space-y-6">
                    {/* Pool Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {LENDING_POOLS.map((pool) => (
                            <motion.div
                                key={pool.id}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setSelectedPool(pool)}
                                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedPool.id === pool.id
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-lg font-bold text-gray-900">{pool.asset}</h4>
                                    {selectedPool.id === pool.id && (
                                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Supply APY</span>
                                        <span className="text-green-600 font-bold">{pool.supplyAPY}%</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Borrow APY</span>
                                        <span className="text-orange-600 font-bold">{pool.borrowAPY}%</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>Utilization</span>
                                            <span>{pool.utilizationRate}%</span>
                                        </div>
                                        <Progress
                                            value={pool.utilizationRate}
                                            color="primary"
                                            className="h-1.5"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Supply/Borrow Tabs */}
                    <Tabs
                        selectedKey={activeTab}
                        onSelectionChange={setActiveTab}
                        color="success"
                        variant="bordered"
                        classNames={{
                            tabList: "rounded-xl",
                            tab: "rounded-lg",
                        }}
                    >
                        <Tab key="supply" title="Supply">
                            <div className="pt-6 space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Amount to Supply
                                    </label>
                                    <Input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.0"
                                        endContent={<span className="text-sm text-gray-500">{selectedPool.asset}</span>}
                                        classNames={{
                                            inputWrapper: "rounded-xl border-gray-200",
                                        }}
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        Balance: 1,234.56 {selectedPool.asset}
                                    </p>
                                </div>

                                <div className="p-4 bg-green-50 rounded-xl space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Supply APY</span>
                                        <span className="text-green-600 font-bold">{selectedPool.supplyAPY}%</span>
                                    </div>
                                    {amount && parseFloat(amount) > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-600">Estimated Yearly Earnings</span>
                                            <span className="text-green-600 font-bold">
                                                {(parseFloat(amount) * selectedPool.supplyAPY / 100).toFixed(2)} {selectedPool.asset}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <Button
                                    onClick={handleSupply}
                                    isLoading={isProcessing}
                                    isDisabled={!connected || isProcessing || !amount}
                                    color="success"
                                    className="w-full h-12 rounded-xl font-bold"
                                    startContent={!isProcessing && <TrendingUp size={20} />}
                                >
                                    {isProcessing ? 'Supplying...' : 'Supply'}
                                </Button>
                            </div>
                        </Tab>

                        <Tab key="borrow" title="Borrow">
                            <div className="pt-6 space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Amount to Borrow
                                    </label>
                                    <Input
                                        type="number"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        placeholder="0.0"
                                        endContent={<span className="text-sm text-gray-500">{selectedPool.asset}</span>}
                                        classNames={{
                                            inputWrapper: "rounded-xl border-gray-200",
                                        }}
                                    />
                                    <p className="text-xs text-gray-500 mt-2">
                                        Available to borrow: 500.00 {selectedPool.asset}
                                    </p>
                                </div>

                                <div className="p-4 bg-orange-50 rounded-xl space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Borrow APY</span>
                                        <span className="text-orange-600 font-bold">{selectedPool.borrowAPY}%</span>
                                    </div>
                                    {amount && parseFloat(amount) > 0 && (
                                        <>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Required Collateral (150%)</span>
                                                <span className="text-gray-900 font-bold">
                                                    {(parseFloat(amount) * 1.5).toFixed(2)} ALEO
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Yearly Interest</span>
                                                <span className="text-orange-600 font-bold">
                                                    {(parseFloat(amount) * selectedPool.borrowAPY / 100).toFixed(2)} {selectedPool.asset}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2">
                                    <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-blue-700 leading-relaxed">
                                        Maintain a health factor above 1.5 to avoid liquidation. Your position is private and secured by zero-knowledge proofs.
                                    </p>
                                </div>

                                <Button
                                    onClick={handleBorrow}
                                    isLoading={isProcessing}
                                    isDisabled={!connected || isProcessing || !amount}
                                    color="warning"
                                    className="w-full h-12 rounded-xl font-bold"
                                    startContent={!isProcessing && <DollarSign size={20} />}
                                >
                                    {isProcessing ? 'Borrowing...' : 'Borrow'}
                                </Button>
                            </div>
                        </Tab>
                    </Tabs>

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
                                    <span className="text-green-600 font-bold">{proofProgress.progress}%</span>
                                </div>
                                <Progress
                                    value={proofProgress.progress}
                                    color="success"
                                    className="h-2"
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </CardBody>
            </Card>

            {/* User Positions */}
            {connected && (userPositions.supplied.length > 0 || userPositions.borrowed.length > 0) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Supplied Positions */}
                    {userPositions.supplied.length > 0 && (
                        <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                            <CardHeader className="p-6 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900">Your Supplies</h3>
                            </CardHeader>
                            <CardBody className="p-6 space-y-3">
                                {userPositions.supplied.map((position, index) => (
                                    <div key={index} className="p-4 bg-green-50 rounded-xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="text-sm font-bold text-gray-900">{position.pool}</h4>
                                            <Chip size="sm" color="success" variant="flat">
                                                {position.apy}% APY
                                            </Chip>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Supplied</span>
                                                <span className="text-gray-900 font-medium">{position.amount} {position.pool}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Earned</span>
                                                <span className="text-green-600 font-medium">+{position.earned} {position.pool}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </CardBody>
                        </Card>
                    )}

                    {/* Borrowed Positions */}
                    {userPositions.borrowed.length > 0 && (
                        <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                            <CardHeader className="p-6 border-b border-gray-100">
                                <h3 className="text-lg font-bold text-gray-900">Your Borrows</h3>
                            </CardHeader>
                            <CardBody className="p-6 space-y-3">
                                {userPositions.borrowed.map((position, index) => (
                                    <div key={index} className="p-4 bg-orange-50 rounded-xl space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-gray-900">{position.pool}</h4>
                                            <Chip
                                                size="sm"
                                                color={getHealthFactorColor(position.healthFactor)}
                                                variant="flat"
                                            >
                                                HF: {position.healthFactor.toFixed(2)}
                                            </Chip>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Borrowed</span>
                                                <span className="text-gray-900 font-medium">{position.amount} {position.pool}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">Collateral</span>
                                                <span className="text-gray-900 font-medium">{position.collateral} ALEO</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">APY</span>
                                                <span className="text-orange-600 font-medium">{position.apy}%</span>
                                            </div>
                                        </div>
                                        <Button
                                            size="sm"
                                            color="warning"
                                            variant="flat"
                                            onClick={() => handleRepay(position)}
                                            className="w-full rounded-lg font-semibold"
                                        >
                                            Repay
                                        </Button>
                                    </div>
                                ))}
                            </CardBody>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
