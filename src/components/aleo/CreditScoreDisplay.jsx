// CreditScoreDisplay Component
// Display and manage ZK credit score with privacy controls

import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Chip, Progress, Tooltip, Switch } from '@nextui-org/react';
import { Shield, Eye, EyeOff, TrendingUp, Award, Lock, Info, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAleoWallet } from '../../hooks/useAleoWallet';
import toast from 'react-hot-toast';

const CREDIT_TIERS = [
    { min: 0, max: 300, label: 'Poor', color: 'danger', gradient: 'from-red-500 to-red-600' },
    { min: 301, max: 500, label: 'Fair', color: 'warning', gradient: 'from-orange-500 to-orange-600' },
    { min: 501, max: 700, label: 'Good', color: 'primary', gradient: 'from-blue-500 to-blue-600' },
    { min: 701, max: 850, label: 'Excellent', color: 'success', gradient: 'from-green-500 to-green-600' },
];

export default function CreditScoreDisplay() {
    const { connected, executeTransition } = useAleoWallet();
    const [creditScore, setCreditScore] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [zkProofEnabled, setZkProofEnabled] = useState(true);
    const [creditHistory, setCreditHistory] = useState([]);

    useEffect(() => {
        if (connected) {
            loadCreditScore();
        }
    }, [connected]);

    const loadCreditScore = async () => {
        try {
            setIsLoading(true);

            // In production, this would query the actual credit score from the blockchain
            // For now, we'll simulate it
            const mockScore = {
                score: 720,
                lastUpdated: Date.now(),
                totalLoans: 5,
                onTimePayments: 5,
                utilizationRate: 35,
                accountAge: 180, // days
            };

            setCreditScore(mockScore);

            // Mock credit history
            const mockHistory = [
                { date: Date.now() - 86400000 * 30, score: 700, event: 'On-time payment' },
                { date: Date.now() - 86400000 * 60, score: 680, event: 'New loan opened' },
                { date: Date.now() - 86400000 * 90, score: 690, event: 'On-time payment' },
            ];

            setCreditHistory(mockHistory);
        } catch (error) {
            console.error('[CreditScore] Load error:', error);
            toast.error('Failed to load credit score');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefresh = async () => {
        await loadCreditScore();
        toast.success('Credit score refreshed');
    };

    const handleGenerateProof = async () => {
        if (!connected) {
            toast.error('Please connect your wallet');
            return;
        }

        try {
            // Generate ZK proof of creditworthiness without revealing exact score
            const inputs = [
                `${creditScore.score}u64`,
                '650u64', // Minimum threshold
            ];

            await executeTransition(
                'zk_credit.aleo',
                'verify_creditworthiness',
                inputs,
                { waitForConfirmation: true }
            );

            toast.success('ZK proof generated successfully!');
        } catch (error) {
            console.error('[CreditScore] Generate proof error:', error);
            toast.error('Failed to generate proof');
        }
    };

    const getCreditTier = (score) => {
        return CREDIT_TIERS.find(tier => score >= tier.min && score <= tier.max) || CREDIT_TIERS[0];
    };

    const getScorePercentage = (score) => {
        return (score / 850) * 100;
    };

    if (!connected) {
        return (
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                <CardBody className="p-12 text-center">
                    <Lock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Connect Wallet</h3>
                    <p className="text-sm text-gray-500">
                        Connect your wallet to view your ZK credit score
                    </p>
                </CardBody>
            </Card>
        );
    }

    if (isLoading) {
        return (
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                <CardBody className="p-12 text-center">
                    <RefreshCw className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-spin" />
                    <p className="text-sm text-gray-500">Loading credit score...</p>
                </CardBody>
            </Card>
        );
    }

    if (!creditScore) {
        return null;
    }

    const tier = getCreditTier(creditScore.score);

    return (
        <div className="space-y-6">
            {/* Main Credit Score Card */}
            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl overflow-hidden">
                <CardHeader className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Award className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">ZK Credit Score</h3>
                            <p className="text-xs text-gray-500">Privacy-preserving creditworthiness</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tooltip content={isVisible ? 'Hide score' : 'Show score'}>
                            <Button
                                isIconOnly
                                size="sm"
                                variant="flat"
                                onClick={() => setIsVisible(!isVisible)}
                                className="rounded-xl"
                            >
                                {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                            </Button>
                        </Tooltip>
                        <Tooltip content="Refresh score">
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
                    </div>
                </CardHeader>

                <CardBody className="p-6 space-y-6">
                    {/* Score Display */}
                    <div className="relative">
                        <div className="text-center py-8">
                            <AnimatePresence mode="wait">
                                {isVisible ? (
                                    <motion.div
                                        key="visible"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                    >
                                        <div className={`text-6xl font-black bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent mb-2`}>
                                            {creditScore.score}
                                        </div>
                                        <Chip
                                            color={tier.color}
                                            variant="flat"
                                            className="font-bold"
                                            startContent={<TrendingUp size={14} />}
                                        >
                                            {tier.label}
                                        </Chip>
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="hidden"
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                        className="py-4"
                                    >
                                        <Shield className="w-16 h-16 text-purple-600 mx-auto mb-3" />
                                        <p className="text-sm text-gray-500">Score hidden for privacy</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Score Progress Bar */}
                        {isVisible && (
                            <div className="space-y-2">
                                <Progress
                                    value={getScorePercentage(creditScore.score)}
                                    color={tier.color}
                                    className="h-3"
                                    classNames={{
                                        indicator: `bg-gradient-to-r ${tier.gradient}`,
                                    }}
                                />
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>300</span>
                                    <span>850</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Credit Metrics */}
                    {isVisible && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-500 mb-1">Total Loans</p>
                                <p className="text-2xl font-bold text-gray-900">{creditScore.totalLoans}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-500 mb-1">On-Time Payments</p>
                                <p className="text-2xl font-bold text-green-600">{creditScore.onTimePayments}</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-500 mb-1">Utilization Rate</p>
                                <p className="text-2xl font-bold text-gray-900">{creditScore.utilizationRate}%</p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-xl">
                                <p className="text-xs text-gray-500 mb-1">Account Age</p>
                                <p className="text-2xl font-bold text-gray-900">{creditScore.accountAge}d</p>
                            </div>
                        </div>
                    )}

                    {/* ZK Proof Section */}
                    <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-4">
                        <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <h4 className="text-sm font-bold text-purple-900 mb-1">Zero-Knowledge Proof</h4>
                                <p className="text-xs text-purple-700 leading-relaxed">
                                    Prove your creditworthiness without revealing your exact score
                                </p>
                            </div>
                            <Switch
                                size="sm"
                                isSelected={zkProofEnabled}
                                onValueChange={setZkProofEnabled}
                                color="secondary"
                            />
                        </div>

                        {zkProofEnabled && (
                            <Button
                                onClick={handleGenerateProof}
                                color="secondary"
                                variant="flat"
                                className="w-full rounded-xl font-semibold"
                                startContent={<Lock size={16} />}
                            >
                                Generate ZK Proof
                            </Button>
                        )}
                    </div>

                    {/* Info Notice */}
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                            Your credit score is calculated using on-chain payment history and is stored privately using zero-knowledge proofs.
                        </p>
                    </div>
                </CardBody>
            </Card>

            {/* Credit History */}
            {isVisible && creditHistory.length > 0 && (
                <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                    <CardHeader className="p-6 border-b border-gray-100">
                        <h3 className="text-lg font-bold text-gray-900">Credit History</h3>
                    </CardHeader>
                    <CardBody className="p-6">
                        <div className="space-y-3">
                            {creditHistory.map((item, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className="flex items-center justify-between p-4 bg-gray-50 rounded-xl"
                                >
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{item.event}</p>
                                        <p className="text-xs text-gray-500">
                                            {new Date(item.date).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-bold text-gray-900">{item.score}</p>
                                        <p className="text-xs text-gray-500">Score</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
}
