// YieldStrategies Component
// Strategy selection and deposit interface for cross-chain vaults

import React, { useState } from 'react';
import { Card, CardBody, CardHeader, Button, Input, Chip, Progress, Tooltip } from '@nextui-org/react';
import { TrendingUp, Shield, Zap, Info, AlertTriangle, CheckCircle2, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAleoWallet } from '../../hooks/useAleoWallet';
import toast from 'react-hot-toast';

const STRATEGIES = [
    {
        id: 'stable_yield',
        name: 'Stable Yield',
        description: 'Conservative strategy focusing on stablecoins and low-risk lending',
        apy: 8.5,
        tvl: 2500000,
        risk: 'Low',
        chains: ['Aleo', 'Ethereum'],
        protocols: ['Aave', 'Compound'],
        minDeposit: 100,
        features: ['Auto-compound', 'Cross-chain', 'Insured'],
        color: 'success',
        gradient: 'from-green-500 to-green-700',
    },
    {
        id: 'balanced_growth',
        name: 'Balanced Growth',
        description: 'Diversified strategy across DeFi protocols for balanced returns',
        apy: 15.2,
        tvl: 1800000,
        risk: 'Medium',
        chains: ['Aleo', 'Solana', 'Ethereum'],
        protocols: ['Uniswap', 'Raydium', 'Curve'],
        minDeposit: 250,
        features: ['Auto-compound', 'Cross-chain', 'Rebalancing'],
        color: 'primary',
        gradient: 'from-blue-500 to-blue-700',
    },
    {
        id: 'high_yield',
        name: 'High Yield',
        description: 'Aggressive strategy maximizing returns through leveraged positions',
        apy: 28.7,
        tvl: 950000,
        risk: 'High',
        chains: ['Aleo', 'Solana', 'Osmosis'],
        protocols: ['GMX', 'Drift', 'Osmosis'],
        minDeposit: 500,
        features: ['Auto-compound', 'Cross-chain', 'Leverage'],
        color: 'warning',
        gradient: 'from-orange-500 to-orange-700',
    },
    {
        id: 'privacy_first',
        name: 'Privacy First',
        description: 'Maximum privacy with ZK proofs across all operations',
        apy: 12.3,
        tvl: 1200000,
        risk: 'Medium',
        chains: ['Aleo', 'Zcash'],
        protocols: ['Aleo DeFi', 'Zcash Shielded'],
        minDeposit: 200,
        features: ['Auto-compound', 'Full Privacy', 'ZK Proofs'],
        color: 'secondary',
        gradient: 'from-purple-500 to-purple-700',
    },
];

export default function YieldStrategies() {
    const { connected, executeTransition, onProofProgress } = useAleoWallet();
    const [selectedStrategy, setSelectedStrategy] = useState(null);
    const [depositAmount, setDepositAmount] = useState('');
    const [isDepositing, setIsDepositing] = useState(false);
    const [proofProgress, setProofProgress] = useState(null);

    React.useEffect(() => {
        if (!connected) return;
        const unsubscribe = onProofProgress((progress) => {
            setProofProgress(progress);
        });
        return unsubscribe;
    }, [connected, onProofProgress]);

    const handleDeposit = async () => {
        if (!connected) {
            toast.error('Please connect your wallet');
            return;
        }

        if (!selectedStrategy) {
            toast.error('Please select a strategy');
            return;
        }

        if (!depositAmount || parseFloat(depositAmount) < selectedStrategy.minDeposit) {
            toast.error(`Minimum deposit is $${selectedStrategy.minDeposit}`);
            return;
        }

        try {
            setIsDepositing(true);

            const inputs = [
                selectedStrategy.id,
                `${parseFloat(depositAmount)}u64`,
                'true', // auto-compound enabled
            ];

            await executeTransition(
                'cross_chain_vault.aleo',
                'deposit_bridged',
                inputs,
                { waitForConfirmation: true }
            );

            toast.success('Deposit successful! Your yield is now compounding.');
            setDepositAmount('');
            setSelectedStrategy(null);
        } catch (error) {
            console.error('[YieldStrategies] Deposit error:', error);
            toast.error(error.message || 'Deposit failed');
        } finally {
            setIsDepositing(false);
        }
    };

    const getRiskColor = (risk) => {
        switch (risk) {
            case 'Low': return 'success';
            case 'Medium': return 'primary';
            case 'High': return 'warning';
            default: return 'default';
        }
    };

    const getRiskIcon = (risk) => {
        switch (risk) {
            case 'Low': return <Shield className="w-4 h-4" />;
            case 'Medium': return <TrendingUp className="w-4 h-4" />;
            case 'High': return <Zap className="w-4 h-4" />;
            default: return null;
        }
    };

    return (
        <div className="w-full space-y-6">
            {/* Strategy Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {STRATEGIES.map((strategy, index) => (
                    <motion.div
                        key={strategy.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <Card
                            isPressable
                            onPress={() => setSelectedStrategy(strategy)}
                            className={`border-2 transition-all ${selectedStrategy?.id === strategy.id
                                    ? 'border-purple-500 shadow-lg scale-[1.02]'
                                    : 'border-gray-200 hover:border-gray-300'
                                } rounded-2xl`}
                        >
                            <CardHeader className={`bg-gradient-to-r ${strategy.gradient} p-6`}>
                                <div className="w-full">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xl font-bold text-white">{strategy.name}</h3>
                                        {selectedStrategy?.id === strategy.id && (
                                            <CheckCircle2 className="w-6 h-6 text-white" />
                                        )}
                                    </div>
                                    <p className="text-sm text-white/90 mb-4">{strategy.description}</p>
                                    <div className="flex items-center gap-2">
                                        <Chip
                                            size="sm"
                                            variant="flat"
                                            className="bg-white/20 text-white font-bold"
                                            startContent={getRiskIcon(strategy.risk)}
                                        >
                                            {strategy.risk} Risk
                                        </Chip>
                                        <Chip size="sm" variant="flat" className="bg-white/20 text-white font-bold">
                                            {strategy.apy}% APY
                                        </Chip>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardBody className="p-6 space-y-4">
                                {/* TVL and Min Deposit */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Total Value Locked</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            ${(strategy.tvl / 1000000).toFixed(2)}M
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1">Min. Deposit</p>
                                        <p className="text-lg font-bold text-gray-900">${strategy.minDeposit}</p>
                                    </div>
                                </div>

                                {/* Chains */}
                                <div>
                                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                        <Globe className="w-3 h-3" />
                                        Supported Chains
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {strategy.chains.map((chain) => (
                                            <Chip key={chain} size="sm" variant="bordered" className="text-xs">
                                                {chain}
                                            </Chip>
                                        ))}
                                    </div>
                                </div>

                                {/* Protocols */}
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">Protocols Used</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {strategy.protocols.map((protocol) => (
                                            <Chip key={protocol} size="sm" variant="flat" className="text-xs">
                                                {protocol}
                                            </Chip>
                                        ))}
                                    </div>
                                </div>

                                {/* Features */}
                                <div>
                                    <p className="text-xs text-gray-500 mb-2">Features</p>
                                    <div className="space-y-1">
                                        {strategy.features.map((feature) => (
                                            <div key={feature} className="flex items-center gap-2">
                                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                                                <span className="text-xs text-gray-700">{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Performance Indicator */}
                                <div className="pt-2">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                        <span className="text-gray-500">Capacity</span>
                                        <span className="text-gray-700 font-medium">
                                            {((strategy.tvl / (strategy.tvl * 1.5)) * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                    <Progress
                                        value={(strategy.tvl / (strategy.tvl * 1.5)) * 100}
                                        color={strategy.color}
                                        className="h-1.5"
                                    />
                                </div>
                            </CardBody>
                        </Card>
                    </motion.div>
                ))}
            </div>

            {/* Deposit Form */}
            {selectedStrategy && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                        <CardHeader className="p-6 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${selectedStrategy.gradient} flex items-center justify-center`}>
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">
                                        Deposit to {selectedStrategy.name}
                                    </h3>
                                    <p className="text-xs text-gray-500">Start earning {selectedStrategy.apy}% APY</p>
                                </div>
                            </div>
                        </CardHeader>

                        <CardBody className="p-6 space-y-6">
                            {/* Amount Input */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Deposit Amount
                                </label>
                                <Input
                                    type="number"
                                    value={depositAmount}
                                    onChange={(e) => setDepositAmount(e.target.value)}
                                    placeholder={`Min. $${selectedStrategy.minDeposit}`}
                                    size="lg"
                                    startContent={<span className="text-gray-500">$</span>}
                                    classNames={{
                                        input: "text-xl font-bold",
                                        inputWrapper: "rounded-xl border-gray-200",
                                    }}
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    Available balance: $10,000.00
                                </p>
                            </div>

                            {/* Estimated Returns */}
                            {depositAmount && parseFloat(depositAmount) >= selectedStrategy.minDeposit && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className={`p-4 bg-gradient-to-r ${selectedStrategy.gradient} rounded-xl`}
                                >
                                    <h4 className="text-sm font-bold text-white mb-3">Estimated Returns</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div>
                                            <p className="text-xs text-white/80 mb-1">Daily</p>
                                            <p className="text-lg font-bold text-white">
                                                ${((parseFloat(depositAmount) * selectedStrategy.apy) / 100 / 365).toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-white/80 mb-1">Monthly</p>
                                            <p className="text-lg font-bold text-white">
                                                ${((parseFloat(depositAmount) * selectedStrategy.apy) / 100 / 12).toFixed(2)}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-white/80 mb-1">Yearly</p>
                                            <p className="text-lg font-bold text-white">
                                                ${((parseFloat(depositAmount) * selectedStrategy.apy) / 100).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Risk Warning */}
                            {selectedStrategy.risk === 'High' && (
                                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 flex items-start gap-3">
                                    <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-sm font-bold text-orange-900 mb-1">High Risk Strategy</h4>
                                        <p className="text-xs text-orange-700 leading-relaxed">
                                            This strategy uses leverage and may result in losses. Only deposit what you can afford to lose.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Privacy Notice */}
                            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-start gap-3">
                                <Shield className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm font-bold text-purple-900 mb-1">Privacy Protected</h4>
                                    <p className="text-xs text-purple-700 leading-relaxed">
                                        Your deposit and earnings are encrypted using zero-knowledge proofs. Cross-chain operations are secured by cryptographic bridges.
                                    </p>
                                </div>
                            </div>

                            {/* Proof Progress */}
                            {proofProgress && proofProgress.status === 'generating' && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
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

                            {/* Deposit Button */}
                            <Button
                                onClick={handleDeposit}
                                isLoading={isDepositing}
                                isDisabled={
                                    !connected ||
                                    isDepositing ||
                                    !depositAmount ||
                                    parseFloat(depositAmount) < selectedStrategy.minDeposit
                                }
                                color={selectedStrategy.color}
                                className="w-full h-12 rounded-xl font-bold text-base"
                                startContent={!isDepositing && <Zap size={20} />}
                            >
                                {isDepositing ? 'Depositing...' : 'Deposit & Start Earning'}
                            </Button>

                            <p className="text-xs text-gray-500 text-center">
                                Auto-compound enabled • Withdraw anytime • Cross-chain supported
                            </p>
                        </CardBody>
                    </Card>
                </motion.div>
            )}

            {/* Info Card */}
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                    <h4 className="text-sm font-bold text-blue-900 mb-1">How Yield Strategies Work</h4>
                    <p className="text-xs text-blue-700 leading-relaxed">
                        Your deposits are automatically allocated across multiple DeFi protocols to maximize returns.
                        Earnings are auto-compounded for optimal growth. You can withdraw at any time to any supported chain.
                    </p>
                </div>
            </div>
        </div>
    );
}
