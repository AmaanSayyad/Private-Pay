// VaultDashboard Component
// Cross-chain vault position overview and management

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Chip, Progress, Tooltip, Tabs, Tab } from '@nextui-org/react';
import { Vault, TrendingUp, Eye, EyeOff, RefreshCw, ArrowUpRight, ArrowDownLeft, Zap, Shield, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAleoWallet } from '../../hooks/useAleoWallet';
import toast from 'react-hot-toast';

const VAULT_STRATEGIES = [
    {
        id: 'strategy_1',
        name: 'Stable Yield',
        description: 'Low risk, stable returns',
        apy: 8.5,
        tvl: 2500000,
        risk: 'Low',
        chains: ['Aleo', 'Ethereum'],
        color: 'success',
    },
    {
        id: 'strategy_2',
        name: 'Balanced Growth',
        description: 'Medium risk, balanced returns',
        apy: 15.2,
        tvl: 1800000,
        risk: 'Medium',
        chains: ['Aleo', 'Solana', 'Ethereum'],
        color: 'primary',
    },
    {
        id: 'strategy_3',
        name: 'High Yield',
        description: 'Higher risk, maximum returns',
        apy: 28.7,
        tvl: 950000,
        risk: 'High',
        chains: ['Aleo', 'Solana', 'Osmosis'],
        color: 'warning',
    },
];

export default function VaultDashboard() {
    const { connected, executeTransition } = useAleoWallet();
    const [positions, setPositions] = useState([]);
    const [totalValue, setTotalValue] = useState(0);
    const [totalEarnings, setTotalEarnings] = useState(0);
    const [isPrivate, setIsPrivate] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStrategy, setSelectedStrategy] = useState(null);

    useEffect(() => {
        if (connected) {
            loadPositions();
        }
    }, [connected]);

    const loadPositions = async () => {
        try {
            setIsLoading(true);

            // Mock vault positions
            const mockPositions = [
                {
                    id: 'pos_1',
                    strategy: VAULT_STRATEGIES[0],
                    deposited: 5000,
                    currentValue: 5425,
                    earnings: 425,
                    apy: 8.5,
                    depositedAt: Date.now() - 86400000 * 90,
                    autoCompound: true,
                },
                {
                    id: 'pos_2',
                    strategy: VAULT_STRATEGIES[1],
                    deposited: 3000,
                    currentValue: 3380,
                    earnings: 380,
                    apy: 15.2,
                    depositedAt: Date.now() - 86400000 * 60,
                    autoCompound: true,
                },
            ];

            setPositions(mockPositions);

            const total = mockPositions.reduce((sum, pos) => sum + pos.currentValue, 0);
            const earnings = mockPositions.reduce((sum, pos) => sum + pos.earnings, 0);

            setTotalValue(total);
            setTotalEarnings(earnings);
        } catch (error) {
            console.error('[VaultDashboard] Load positions error:', error);
            toast.error('Failed to load positions');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        await loadPositions();
        toast.success('Positions refreshed');
    };

    const handleCompound = async (positionId) => {
        try {
            const inputs = [positionId];
            await executeTransition(
                'cross_chain_vault.aleo',
                'compound_yield',
                inputs,
                { waitForConfirmation: true }
            );
            toast.success('Yield compounded successfully!');
            await loadPositions();
        } catch (error) {
            console.error('[VaultDashboard] Compound error:', error);
            toast.error('Failed to compound yield');
        }
    };

    const handleWithdraw = async (positionId) => {
        try {
            const inputs = [positionId, 'ethereum']; // Target chain
            await executeTransition(
                'cross_chain_vault.aleo',
                'withdraw_to_chain',
                inputs,
                { waitForConfirmation: true }
            );
            toast.success('Withdrawal initiated!');
            await loadPositions();
        } catch (error) {
            console.error('[VaultDashboard] Withdraw error:', error);
            toast.error('Failed to withdraw');
        }
    };

    const getRiskColor = (risk) => {
        switch (risk) {
            case 'Low': return 'text-green-600';
            case 'Medium': return 'text-blue-600';
            case 'High': return 'text-orange-600';
            default: return 'text-gray-600';
        }
    };

    const formatCurrency = (value) => {
        return isPrivate ? '•••••' : `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatPercentage = (value) => {
        return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
    };

    return (
        <div className="w-full space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Total Value */}
                <Card className="bg-gradient-to-br from-purple-500 to-purple-700 border-0 shadow-lg rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-purple-100 text-sm font-medium">Total Value</p>
                            <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                onClick={() => setIsPrivate(!isPrivate)}
                                className="text-white"
                            >
                                {isPrivate ? <EyeOff size={16} /> : <Eye size={16} />}
                            </Button>
                        </div>
                        <AnimatePresence mode="wait">
                            <motion.h2
                                key={isPrivate ? 'hidden' : 'visible'}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-3xl font-black text-white"
                            >
                                {formatCurrency(totalValue)}
                            </motion.h2>
                        </AnimatePresence>
                        <div className="flex items-center gap-2 mt-2">
                            <Chip size="sm" variant="flat" className="bg-white/20 text-white font-bold">
                                {positions.length} Position{positions.length !== 1 ? 's' : ''}
                            </Chip>
                        </div>
                    </CardBody>
                </Card>

                {/* Total Earnings */}
                <Card className="bg-gradient-to-br from-green-500 to-green-700 border-0 shadow-lg rounded-2xl">
                    <CardBody className="p-6">
                        <p className="text-green-100 text-sm font-medium mb-2">Total Earnings</p>
                        <AnimatePresence mode="wait">
                            <motion.h2
                                key={isPrivate ? 'hidden' : 'visible'}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-3xl font-black text-white"
                            >
                                {formatCurrency(totalEarnings)}
                            </motion.h2>
                        </AnimatePresence>
                        <div className="flex items-center gap-1 mt-2">
                            <TrendingUp className="w-4 h-4 text-green-100" />
                            <span className="text-sm text-green-100 font-medium">
                                {((totalEarnings / (totalValue - totalEarnings)) * 100).toFixed(2)}% ROI
                            </span>
                        </div>
                    </CardBody>
                </Card>

                {/* Average APY */}
                <Card className="bg-gradient-to-br from-blue-500 to-blue-700 border-0 shadow-lg rounded-2xl">
                    <CardBody className="p-6">
                        <p className="text-blue-100 text-sm font-medium mb-2">Average APY</p>
                        <h2 className="text-3xl font-black text-white">
                            {positions.length > 0
                                ? (positions.reduce((sum, pos) => sum + pos.apy, 0) / positions.length).toFixed(1)
                                : '0.0'}%
                        </h2>
                        <div className="flex items-center gap-1 mt-2">
                            <Zap className="w-4 h-4 text-blue-100" />
                            <span className="text-sm text-blue-100 font-medium">Auto-compound enabled</span>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Active Positions */}
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                <CardHeader className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Vault className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Active Positions</h3>
                            <p className="text-xs text-gray-500">Your vault positions across chains</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tooltip content={isPrivate ? 'Show balances' : 'Hide balances'}>
                            <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                onClick={() => setIsPrivate(!isPrivate)}
                                className="rounded-xl"
                            >
                                {isPrivate ? <EyeOff size={18} /> : <Eye size={18} />}
                            </Button>
                        </Tooltip>
                        <Tooltip content="Refresh positions">
                            <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                onClick={handleRefresh}
                                isLoading={isLoading}
                                className="rounded-xl"
                            >
                                <RefreshCw size={18} />
                            </Button>
                        </Tooltip>
                    </div>
                </CardHeader>

                <CardBody className="p-6">
                    {positions.length === 0 ? (
                        <div className="text-center py-12">
                            <Vault className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                            <h4 className="text-lg font-bold text-gray-900 mb-2">No Active Positions</h4>
                            <p className="text-sm text-gray-500 mb-6">
                                Start earning yield by depositing into a vault strategy
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {positions.map((position, index) => (
                                <motion.div
                                    key={position.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-gray-200 transition-all"
                                >
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h4 className="text-lg font-bold text-gray-900">
                                                    {position.strategy.name}
                                                </h4>
                                                <Chip
                                                    size="sm"
                                                    color={position.strategy.color}
                                                    variant="flat"
                                                    className="font-bold"
                                                >
                                                    {position.apy}% APY
                                                </Chip>
                                                {position.autoCompound && (
                                                    <Chip size="sm" variant="flat" startContent={<Zap size={12} />}>
                                                        Auto
                                                    </Chip>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-500 mb-3">
                                                {position.strategy.description}
                                            </p>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {position.strategy.chains.map((chain) => (
                                                    <Chip key={chain} size="sm" variant="bordered" className="text-xs">
                                                        {chain}
                                                    </Chip>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="p-3 bg-white rounded-xl">
                                            <p className="text-xs text-gray-500 mb-1">Deposited</p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {formatCurrency(position.deposited)}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-white rounded-xl">
                                            <p className="text-xs text-gray-500 mb-1">Current Value</p>
                                            <p className="text-lg font-bold text-gray-900">
                                                {formatCurrency(position.currentValue)}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-white rounded-xl">
                                            <p className="text-xs text-gray-500 mb-1">Earnings</p>
                                            <p className="text-lg font-bold text-green-600">
                                                {formatCurrency(position.earnings)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            color="success"
                                            variant="flat"
                                            onClick={() => handleCompound(position.id)}
                                            className="rounded-xl font-semibold"
                                            startContent={<Zap size={16} />}
                                        >
                                            Compound
                                        </Button>
                                        <Button
                                            size="sm"
                                            color="primary"
                                            variant="flat"
                                            onClick={() => handleWithdraw(position.id)}
                                            className="rounded-xl font-semibold"
                                            startContent={<ArrowDownLeft size={16} />}
                                        >
                                            Withdraw
                                        </Button>
                                        <div className="flex-1" />
                                        <p className="text-xs text-gray-500">
                                            Since {new Date(position.depositedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Privacy Notice */}
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-start gap-3">
                <Shield className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                    <h4 className="text-sm font-bold text-purple-900 mb-1">Privacy-Preserving Vaults</h4>
                    <p className="text-xs text-purple-700 leading-relaxed">
                        Your vault positions are encrypted using zero-knowledge proofs. Only you can see your balances and earnings.
                        Cross-chain operations are secured by cryptographic bridges.
                    </p>
                </div>
            </div>
        </div>
    );
}
