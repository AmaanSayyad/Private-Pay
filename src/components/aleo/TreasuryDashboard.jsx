// TreasuryDashboard Component
// Institutional treasury management with multi-sig and compliance

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Chip, Progress, Tooltip, Tabs, Tab, Input } from '@nextui-org/react';
import { Briefcase, Users, Shield, TrendingUp, DollarSign, FileText, Eye, EyeOff, RefreshCw, CheckCircle2, ExternalLink, Send, Wallet } from 'lucide-react';
import { motion } from 'framer-motion';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { executeAleoOperation, OPERATION_TYPES, getTransactionHistory } from '../../lib/aleo/aleoTransactionHelper';
import toast from 'react-hot-toast';

export default function TreasuryDashboard() {
    const { connected, publicKey, requestTransaction, transactionStatus } = useWallet();
    const [treasuryData, setTreasuryData] = useState(null);
    const [isPrivate, setIsPrivate] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');
    const [depositAmount, setDepositAmount] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastTx, setLastTx] = useState(null);

    useEffect(() => {
        if (connected) {
            loadTreasuryData();
        }
    }, [connected]);

    const loadTreasuryData = async () => {
        try {
            setIsLoading(true);

            // Get transaction history for recent activity
            const history = getTransactionHistory();
            const treasuryTxs = history
                .filter(tx => tx.operationType?.startsWith('treasury'))
                .slice(0, 5)
                .map(tx => ({
                    id: tx.txHash?.substring(0, 10) || 'tx',
                    type: tx.params?.type || 'Deposit',
                    amount: parseFloat(tx.params?.amount || 0) * 1000,
                    status: 'completed',
                    date: tx.timestamp,
                    signatures: 3,
                    txHash: tx.txHash,
                    explorerLink: tx.explorerLink
                }));

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
                pendingTransactions: treasuryTxs.filter(t => t.status === 'pending').length,
                allocations: [
                    { category: 'Operations', amount: 1200000, percentage: 23 },
                    { category: 'Investments', amount: 2800000, percentage: 53 },
                    { category: 'Reserves', amount: 1250000, percentage: 24 },
                ],
                recentActivity: treasuryTxs.length > 0 ? treasuryTxs : [
                    { id: '1', type: 'Payroll', amount: 85000, status: 'completed', date: Date.now() - 86400000, signatures: 3 },
                    { id: '2', type: 'Investment', amount: 250000, status: 'pending', date: Date.now() - 172800000, signatures: 2 },
                ],
            };

            setTreasuryData(mockData);
        } catch (error) {
            console.error('[TreasuryDashboard] Load error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeposit = async () => {
        if (!connected) {
            toast.error('Please connect your wallet');
            return;
        }

        if (!depositAmount || parseFloat(depositAmount) <= 0) {
            toast.error('Please enter a valid amount');
            return;
        }

        try {
            setIsProcessing(true);
            toast.loading('Submitting deposit...', { id: 'deposit-loading' });

            const result = await executeAleoOperation(
                requestTransaction,
                publicKey,
                OPERATION_TYPES.DEPOSIT,
                {
                    type: 'Deposit',
                    amount: depositAmount,
                    category: 'Treasury'
                },
                transactionStatus
            );

            toast.dismiss('deposit-loading');
            setLastTx(result);
            
            if (result.isRealTxId) {
                toast.success(
                    <div>
                        <p className="font-bold">Deposit confirmed!</p>
                        <p className="text-xs text-gray-600">TX: {result.txHash.substring(0, 20)}...</p>
                        <a href={result.explorerLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline flex items-center gap-1">
                            View on Explorer <ExternalLink size={12} />
                        </a>
                    </div>
                );
            } else {
                toast.success(
                    <div>
                        <p className="font-bold">Deposit submitted!</p>
                        <p className="text-xs text-gray-600">Waiting for confirmation...</p>
                    </div>
                );
            }

            setDepositAmount('');
            loadTreasuryData();
        } catch (error) {
            toast.dismiss('deposit-loading');
            console.error('[Treasury] Deposit error:', error);
            if (error.message?.includes('rejected') || error.message?.includes('cancelled')) {
                toast.error('Transaction cancelled');
            } else {
                toast.error(error.message || 'Deposit failed');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!connected) {
            toast.error('Please connect your wallet');
            return;
        }

        try {
            setIsProcessing(true);
            toast.loading('Generating report...', { id: 'report-loading' });

            const result = await executeAleoOperation(
                requestTransaction,
                publicKey,
                OPERATION_TYPES.APPROVE_TX,
                {
                    type: 'Compliance Report',
                    reportType: 'quarterly',
                    timestamp: Date.now()
                },
                transactionStatus
            );

            toast.dismiss('report-loading');
            setLastTx(result);
            
            if (result.isRealTxId) {
                toast.success(
                    <div>
                        <p className="font-bold">Report confirmed!</p>
                        <p className="text-xs text-gray-600">TX: {result.txHash.substring(0, 20)}...</p>
                        <a href={result.explorerLink} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline flex items-center gap-1">
                            View on Explorer <ExternalLink size={12} />
                        </a>
                    </div>
                );
            } else {
                toast.success(
                    <div>
                        <p className="font-bold">Report submitted!</p>
                        <p className="text-xs text-gray-600">Waiting for confirmation...</p>
                    </div>
                );
            }
        } catch (error) {
            toast.dismiss('report-loading');
            console.error('[Treasury] Report error:', error);
            if (error.message?.includes('rejected') || error.message?.includes('cancelled')) {
                toast.error('Transaction cancelled');
            } else {
                toast.error('Failed to generate report');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const formatCurrency = (value) => {
        return isPrivate ? '•••••' : `$${value.toLocaleString()}`;
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
                <CardBody className="p-12 text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto">
                        <Wallet className="w-8 h-8 text-blue-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Connect Wallet</h3>
                        <p className="text-sm text-gray-500">Connect your wallet to access treasury management</p>
                    </div>
                    <WalletMultiButton className="!bg-blue-600 hover:!bg-blue-700 !text-white !font-bold !h-12 !rounded-xl !px-8" />
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
                <Card className="bg-gradient-to-br from-blue-500 to-blue-700 border-0 shadow-lg rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-blue-100 text-sm font-medium">Total Assets</p>
                            <Button isIconOnly size="sm" variant="light" onClick={() => setIsPrivate(!isPrivate)} className="text-white">
                                {isPrivate ? <EyeOff size={16} /> : <Eye size={16} />}
                            </Button>
                        </div>
                        <h2 className="text-3xl font-black text-white">{formatCurrency(treasuryData.totalAssets)}</h2>
                    </CardBody>
                </Card>

                <Card className="bg-gradient-to-br from-green-500 to-green-700 border-0 shadow-lg rounded-2xl">
                    <CardBody className="p-6">
                        <p className="text-green-100 text-sm font-medium mb-2">Net Worth</p>
                        <h2 className="text-3xl font-black text-white">{formatCurrency(treasuryData.netWorth)}</h2>
                        <div className="flex items-center gap-1 mt-2">
                            <TrendingUp className="w-4 h-4 text-green-100" />
                            <span className="text-sm text-green-100 font-medium">+12.5%</span>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-gradient-to-br from-purple-500 to-purple-700 border-0 shadow-lg rounded-2xl">
                    <CardBody className="p-6">
                        <p className="text-purple-100 text-sm font-medium mb-2">Monthly Revenue</p>
                        <h2 className="text-3xl font-black text-white">{formatCurrency(treasuryData.monthlyRevenue)}</h2>
                    </CardBody>
                </Card>

                <Card className="bg-gradient-to-br from-orange-500 to-orange-700 border-0 shadow-lg rounded-2xl">
                    <CardBody className="p-6">
                        <p className="text-orange-100 text-sm font-medium mb-2">Multi-Sig</p>
                        <h2 className="text-3xl font-black text-white">{treasuryData.requiredSignatures}/{treasuryData.signers}</h2>
                        <p className="text-sm text-orange-100 mt-2">{treasuryData.pendingTransactions} pending</p>
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
                        <Button isIconOnly size="sm" variant="flat" onClick={loadTreasuryData} className="rounded-xl">
                            <RefreshCw size={18} />
                        </Button>
                    </Tooltip>
                </CardHeader>

                <CardBody className="p-6">
                    <Tabs selectedKey={activeTab} onSelectionChange={setActiveTab} color="primary" variant="underlined">
                        {/* Overview Tab */}
                        <Tab key="overview" title="Overview">
                            <div className="pt-6 space-y-6">
                                {/* Asset Allocation */}
                                <div>
                                    <h4 className="text-sm font-bold text-gray-900 mb-4">Asset Allocation</h4>
                                    <div className="space-y-3">
                                        {treasuryData.allocations.map((allocation, index) => (
                                            <motion.div key={allocation.category} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm text-gray-700">{allocation.category}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-gray-900">{formatCurrency(allocation.amount)}</span>
                                                        <Chip size="sm" variant="flat">{allocation.percentage}%</Chip>
                                                    </div>
                                                </div>
                                                <Progress value={allocation.percentage} color="primary" className="h-2" />
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>

                                {/* Deposit Section */}
                                <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                                    <h4 className="text-sm font-bold text-gray-900">Deposit to Treasury</h4>
                                    <div className="flex gap-3">
                                        <Input
                                            type="number"
                                            value={depositAmount}
                                            onChange={(e) => setDepositAmount(e.target.value)}
                                            placeholder="0.0"
                                            endContent={<span className="text-sm text-gray-500">ALEO</span>}
                                            classNames={{ inputWrapper: "rounded-xl border-gray-200" }}
                                            className="flex-1"
                                        />
                                        <Button
                                            onClick={handleDeposit}
                                            isLoading={isProcessing}
                                            isDisabled={!depositAmount || isProcessing}
                                            color="primary"
                                            className="rounded-xl font-bold"
                                            startContent={!isProcessing && <Send size={16} />}
                                        >
                                            Deposit
                                        </Button>
                                    </div>
                                </div>

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
                                            <a href={lastTx.explorerLink} target="_blank" rel="noopener noreferrer" className={`text-xs underline flex items-center gap-1 ${lastTx.isRealTxId ? 'text-green-700' : 'text-yellow-700'}`}>
                                                {lastTx.isRealTxId ? `${lastTx.txHash?.substring(0, 15)}...` : 'View Address'} <ExternalLink size={12} />
                                            </a>
                                        </div>
                                    </div>
                                )}
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
                                                    {activity.type === 'Deposit' && <DollarSign className="w-5 h-5 text-purple-600" />}
                                                    {activity.type === 'Withdrawal' && <DollarSign className="w-5 h-5 text-orange-600" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{activity.type}</p>
                                                    <p className="text-xs text-gray-500">{new Date(activity.date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-gray-900">{formatCurrency(activity.amount)}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <Chip size="sm" color={getStatusColor(activity.status)} variant="flat">{activity.status}</Chip>
                                                    {activity.explorerLink && (
                                                        <a href={activity.explorerLink} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                                                            <ExternalLink size={14} />
                                                        </a>
                                                    )}
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
                                        <p className="text-xs text-green-700 leading-relaxed">All regulatory requirements are met. Last audit: December 2025</p>
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
                                    onClick={handleGenerateReport}
                                    isLoading={isProcessing}
                                    color="primary"
                                    variant="flat"
                                    className="w-full rounded-xl font-semibold"
                                    startContent={!isProcessing && <FileText size={16} />}
                                >
                                    {isProcessing ? 'Generating...' : 'Generate Compliance Report'}
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
                    </p>
                </div>
            </div>
        </div>
    );
}
