// TreasuryDashboard Component
// Institutional treasury management with multi-sig and compliance

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Chip, Progress, Tooltip, Tabs, Tab } from '@nextui-org/react';
import { Briefcase, Users, Shield, TrendingUp, DollarSign, FileText, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAleoWallet } from '../../hooks/useAleoWallet';
import toast from 'react-hot-toast';

export default function TreasuryDashboard() {
    const { connected } = useAleoWallet();
    const [treasuryData, setTreasuryData] = useState(null);
    const [isPrivate, setIsPrivate] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    useEffect(() => {
        if (connected) {
            loadTreasuryData();
        }
    }, [connected]);

    const loadTreasuryData = async () => {
        try {
            setIsLoading(true);

            // Mock treasury data
            const mockData = {
                totalAssets: 5250000,
                totalLiabilities: 1200000,
                netWorth: 4050000,
                monthlyRevenue: 450000,
                monthlyExpenses: 280000,
                cashReserves: 1500000,
                investments: 2800000,
                signers: 5,
                requiredSignatures: 3,
                pendingTransactions: 3,
                allocations: [
                    { category: 'Operations', amount: 1200000, percentage: 23 },
                    { category: 'Investments', amount: 2800000, percentage: 53 },
                    { category: 'Reserves', amount: 1250000, percentage: 24 },
                ],
                recentActivity: [
                    {
                        id: '1',
                        type: 'Payroll',
                        amount: 85000,
                        status: 'completed',
                        date: Date.now() - 86400000,
                        signatures: 3,
                    },
                    {
                        id: '2',
                        type: 'Investment',
                        amount: 250000,
                        status: 'pending',
                        date: Date.now() - 172800000,
                        signatures: 2,
                    },
                    {
                        id: '3',
                        type: 'Withdrawal',
                        amount: 50000,
                        status: 'pending',
                        date: Date.now() - 259200000,
                        signatures: 1,
                    },
                ],
            };

            setTreasuryData(mockData);
        } catch (error) {
            console.error('[TreasuryDashboard] Load error:', error);
            toast.error('Failed to load treasury data');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        await loadTreasuryData();
        toast.success('Treasury data refreshed');
    };

    const formatCurrency = (value) => {
        return isPrivate ? '•••••' : `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'success';
            case 'pending': return 'warning';
            case 'rejected': return 'danger';
            default: return 'default';
        }
    };

    if (!connected) {
        return (
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                <CardBody className="p-12 text-center">
                    <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Connect Wallet</h3>
                    <p className="text-sm text-gray-500">
                        Connect your wallet to access treasury management
                    </p>
                </CardBody>
            </Card>
        );
    }

    if (isLoading || !treasuryData) {
        return (
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                <CardBody className="p-12 text-center">
                    <RefreshCw className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-spin" />
                    <p className="text-sm text-gray-500">Loading treasury data...</p>
                </CardBody>
            </Card>
        );
    }

    return (
        <div className="w-full space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Total Assets */}
                <Card className="bg-gradient-to-br from-blue-500 to-blue-700 border-0 shadow-lg rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-blue-100 text-sm font-medium">Total Assets</p>
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
                                {formatCurrency(treasuryData.totalAssets)}
                            </motion.h2>
                        </AnimatePresence>
                    </CardBody>
                </Card>

                {/* Net Worth */}
                <Card className="bg-gradient-to-br from-green-500 to-green-700 border-0 shadow-lg rounded-2xl">
                    <CardBody className="p-6">
                        <p className="text-green-100 text-sm font-medium mb-2">Net Worth</p>
                        <AnimatePresence mode="wait">
                            <motion.h2
                                key={isPrivate ? 'hidden' : 'visible'}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-3xl font-black text-white"
                            >
                                {formatCurrency(treasuryData.netWorth)}
                            </motion.h2>
                        </AnimatePresence>
                        <div className="flex items-center gap-1 mt-2">
                            <TrendingUp className="w-4 h-4 text-green-100" />
                            <span className="text-sm text-green-100 font-medium">+12.5%</span>
                        </div>
                    </CardBody>
                </Card>

                {/* Monthly Revenue */}
                <Card className="bg-gradient-to-br from-purple-500 to-purple-700 border-0 shadow-lg rounded-2xl">
                    <CardBody className="p-6">
                        <p className="text-purple-100 text-sm font-medium mb-2">Monthly Revenue</p>
                        <AnimatePresence mode="wait">
                            <motion.h2
                                key={isPrivate ? 'hidden' : 'visible'}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-3xl font-black text-white"
                            >
                                {formatCurrency(treasuryData.monthlyRevenue)}
                            </motion.h2>
                        </AnimatePresence>
                    </CardBody>
                </Card>

                {/* Multi-Sig Status */}
                <Card className="bg-gradient-to-br from-orange-500 to-orange-700 border-0 shadow-lg rounded-2xl">
                    <CardBody className="p-6">
                        <p className="text-orange-100 text-sm font-medium mb-2">Multi-Sig</p>
                        <h2 className="text-3xl font-black text-white">
                            {treasuryData.requiredSignatures}/{treasuryData.signers}
                        </h2>
                        <p className="text-sm text-orange-100 mt-2">
                            {treasuryData.pendingTransactions} pending
                        </p>
                    </CardBody>
                </Card>
            </div>

            {/* Main Content */}
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                <CardHeader className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Treasury Management</h3>
                            <p className="text-xs text-gray-500">Institutional fund management</p>
                        </div>
                    </div>
                    <Tooltip content="Refresh data">
                        <Button
                            isIconOnly
                            size="sm"
                            variant="flat"
                            onClick={handleRefresh}
                            className="rounded-xl"
                        >
                            <RefreshCw size={18} />
                        </Button>
                    </Tooltip>
                </CardHeader>

                <CardBody className="p-6">
                    <Tabs
                        selectedKey={activeTab}
                        onSelectionChange={setActiveTab}
                        color="primary"
                        variant="underlined"
                    >
                        {/* Overview Tab */}
                        <Tab key="overview" title="Overview">
                            <div className="pt-6 space-y-6">
                                {/* Asset Allocation */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 mb-4">Asset Allocation</h4>
                                    <div className="space-y-3">
                                        {treasuryData.allocations.map((allocation, index) => (
                                            <motion.div
                                                key={allocation.category}
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm text-gray-700">{allocation.category}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-gray-900">
                                                            {formatCurrency(allocation.amount)}
                                                        </span>
                                                        <Chip size="sm" variant="flat">
                                                            {allocation.percentage}%
                                                        </Chip>
                                                    </div>
                                                </div>
                                                <Progress
                                                    value={allocation.percentage}
                                                    color="primary"
                                                    className="h-2"
                                                />
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Financial Metrics */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-xs text-gray-500 mb-1">Cash Reserves</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {formatCurrency(treasuryData.cashReserves)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-xs text-gray-500 mb-1">Investments</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {formatCurrency(treasuryData.investments)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-xs text-gray-500 mb-1">Monthly Expenses</p>
                                        <p className="text-2xl font-bold text-red-600">
                                            {formatCurrency(treasuryData.monthlyExpenses)}
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-xs text-gray-500 mb-1">Net Income</p>
                                        <p className="text-2xl font-bold text-green-600">
                                            {formatCurrency(treasuryData.monthlyRevenue - treasuryData.monthlyExpenses)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </Tab>

                        {/* Activity Tab */}
                        <Tab key="activity" title="Recent Activity">
                            <div className="pt-6 space-y-3">
                                {treasuryData.recentActivity.map((activity, index) => (
                                    <motion.div
                                        key={activity.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.1 }}
                                        className="p-4 bg-gray-50 rounded-xl border border-gray-100"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                                                    {activity.type === 'Payroll' && <Users className="w-5 h-5 text-blue-600" />}
                                                    {activity.type === 'Investment' && <TrendingUp className="w-5 h-5 text-green-600" />}
                                                    {activity.type === 'Withdrawal' && <DollarSign className="w-5 h-5 text-orange-600" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{activity.type}</p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(activity.date).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-gray-900">
                                                    {formatCurrency(activity.amount)}
                                                </p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Chip size="sm" color={getStatusColor(activity.status)} variant="flat">
                                                        {activity.status}
                                                    </Chip>
                                                    <Chip size="sm" variant="bordered" className="text-xs">
                                                        {activity.signatures}/{treasuryData.requiredSignatures} sigs
                                                    </Chip>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </Tab>

                        {/* Compliance Tab */}
                        <Tab key="compliance" title="Compliance">
                            <div className="pt-6 space-y-4">
                                <div className="p-4 bg-green-50 rounded-xl border border-green-100 flex items-start gap-3">
                                    <Shield className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-bold text-green-900 mb-1">Compliance Status: Active</h4>
                                        <p className="text-xs text-green-700 leading-relaxed">
                                            All regulatory requirements are met. Last audit: December 2025
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-xs text-gray-500 mb-2">KYC Verified</p>
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-green-600" />
                                            <span className="text-sm font-bold text-green-600">100%</span>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <p className="text-xs text-gray-500 mb-2">Reports Generated</p>
                                        <div className="flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm font-bold text-blue-600">24</span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    color="primary"
                                    variant="flat"
                                    className="w-full rounded-xl font-semibold"
                                    startContent={<FileText size={16} />}
                                >
                                    Generate Compliance Report
                                </Button>
                            </div>
                        </Tab>
                    </Tabs>
                </CardBody>
            </Card>

            {/* Privacy Notice */}
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-start gap-3">
                <Shield className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                    <h4 className="text-sm font-bold text-purple-900 mb-1">Privacy-Preserving Treasury</h4>
                    <p className="text-xs text-purple-700 leading-relaxed">
                        All treasury operations use zero-knowledge proofs for privacy. Multi-signature requirements ensure security.
                        Selective disclosure allows compliance while maintaining confidentiality.
                    </p>
                </div>
            </div>
        </div>
    );
}
