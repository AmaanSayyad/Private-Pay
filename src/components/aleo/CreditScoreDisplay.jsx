// CreditScoreDisplay Component
// Display and manage ZK credit score with privacy controls

import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, Button, Chip, Progress, Tooltip, Switch } from '@nextui-org/react';
import { Shield, Eye, EyeOff, TrendingUp, Award, Lock, Info, RefreshCw, CheckCircle2, ExternalLink, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletMultiButton } from '@demox-labs/aleo-wallet-adapter-reactui';
import { executeAleoOperation, OPERATION_TYPES } from '../../lib/aleo/aleoTransactionHelper';
import toast from 'react-hot-toast';

const CREDIT_TIERS = [
    { min: 0, max: 300, label: 'Poor', color: 'danger', gradient: 'from-red-500 to-red-600' },
    { min: 301, max: 500, label: 'Fair', color: 'warning', gradient: 'from-orange-500 to-orange-600' },
    { min: 501, max: 700, label: 'Good', color: 'primary', gradient: 'from-blue-500 to-blue-600' },
    { min: 701, max: 850, label: 'Excellent', color: 'success', gradient: 'from-green-500 to-green-600' },
];

export default function CreditScoreDisplay() {
    const { connected, publicKey, requestTransaction, transactionStatus } = useWallet();
    const [creditScore, setCreditScore] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingProof, setIsGeneratingProof] = useState(false);
    const [zkProofEnabled, setZkProofEnabled] = useState(true);
    const [lastTx, setLastTx] = useState(null);

    useEffect(() => {
        if (connected) {
            loadCreditScore();
        }
    }, [connected]);

    const loadCreditScore = async () => {
        try {
            setIsLoading(true);
            // Mock credit score
            const mockScore = {
                score: 720,
                lastUpdated: Date.now(),
                totalLoans: 5,
                onTimePayments: 5,
                utilizationRate: 35,
                accountAge: 180,
            };
            setCreditScore(mockScore);
        } catch (error) {
            console.error('[CreditScore] Load error:', error);
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
            setIsGeneratingProof(true);
            toast.loading('Generating ZK proof...', { id: 'proof-loading' });

            const result = await executeAleoOperation(
                requestTransaction,
                publicKey,
                OPERATION_TYPES.GENERATE_PROOF,
                {
                    score: creditScore.score,
                    threshold: 650,
                    proofType: 'creditworthiness'
                },
                transactionStatus
            );

            toast.dismiss('proof-loading');
            setLastTx(result);
            
            if (result.isRealTxId) {
                toast.success(
                    <div>
                        <p className="font-bold">ZK Proof confirmed!</p>
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
                        <p className="font-bold">Proof submitted!</p>
                        <p className="text-xs text-gray-600">Waiting for confirmation...</p>
                    </div>
                );
            }
        } catch (error) {
            toast.dismiss('proof-loading');
            console.error('[CreditScore] Generate proof error:', error);
            if (error.message?.includes('rejected') || error.message?.includes('cancelled')) {
                toast.error('Transaction cancelled');
            } else {
                toast.error('Failed to generate proof');
            }
        } finally {
            setIsGeneratingProof(false);
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
                <CardBody className="p-12 text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center mx-auto">
                        <Wallet className="w-8 h-8 text-purple-600" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Connect Wallet</h3>
                        <p className="text-sm text-gray-500">Connect your wallet to view your ZK credit score</p>
                    </div>
                    <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700 !text-white !font-bold !h-12 !rounded-xl !px-8" />
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

    if (!creditScore) return null;

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
                            <Button isIconOnly size="sm" variant="flat" onClick={() => setIsVisible(!isVisible)} className="rounded-xl">
                                {isVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                            </Button>
                        </Tooltip>
                        <Tooltip content="Refresh score">
                            <Button isIconOnly size="sm" variant="flat" onClick={handleRefresh} className="rounded-xl">
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
                                        <Chip color={tier.color} variant="flat" className="font-bold" startContent={<TrendingUp size={14} />}>
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

                        {isVisible && (
                            <div className="space-y-2">
                                <Progress
                                    value={getScorePercentage(creditScore.score)}
                                    color={tier.color}
                                    className="h-3"
                                    classNames={{ indicator: `bg-gradient-to-r ${tier.gradient}` }}
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

                    {/* Last Transaction */}
                    {lastTx && (
                        <div className={`p-4 rounded-xl border ${lastTx.isRealTxId ? 'bg-green-50 border-green-100' : 'bg-yellow-50 border-yellow-100'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className={`w-5 h-5 ${lastTx.isRealTxId ? 'text-green-600' : 'text-yellow-600'}`} />
                                    <span className={`text-sm font-bold ${lastTx.isRealTxId ? 'text-green-900' : 'text-yellow-900'}`}>
                                        {lastTx.isRealTxId ? 'Proof Confirmed' : 'Proof Submitted'}
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
                            <Switch size="sm" isSelected={zkProofEnabled} onValueChange={setZkProofEnabled} color="secondary" />
                        </div>

                        {zkProofEnabled && (
                            <Button
                                onClick={handleGenerateProof}
                                isLoading={isGeneratingProof}
                                color="secondary"
                                variant="flat"
                                className="w-full rounded-xl font-semibold"
                                startContent={!isGeneratingProof && <Lock size={16} />}
                            >
                                {isGeneratingProof ? 'Generating...' : 'Generate ZK Proof'}
                            </Button>
                        )}
                    </div>

                    {/* Info Notice */}
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700 leading-relaxed">
                            Your credit score is calculated using on-chain payment history and stored privately using zero-knowledge proofs.
                        </p>
                    </div>
                </CardBody>
            </Card>
        </div>
    );
}
