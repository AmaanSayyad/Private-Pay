// AleoCreditPage
// Main page for ZK credit score and loan management

import React from 'react';
import { motion } from 'framer-motion';
import { Award, Shield, TrendingUp } from 'lucide-react';
import { Card, CardBody, Chip } from '@nextui-org/react';
import CreditScoreDisplay from '../components/aleo/CreditScoreDisplay';
import { PrivacyNotice } from '../components/aleo/PrivacyComponents';

export default function AleoCreditPage() {
    return (
        <div className="flex flex-col items-center justify-start w-full gap-6 p-4 md:p-6 pb-24 bg-gray-50">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-6xl"
            >
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-700 shadow-lg flex items-center justify-center">
                            <Award className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                                ZK Credit Score
                            </h1>
                            <div className="flex items-center gap-2 mt-2">
                                <Chip size="sm" variant="flat" color="secondary" className="font-bold text-[10px]">
                                    ZERO-KNOWLEDGE
                                </Chip>
                                <Chip size="sm" variant="flat" color="success" className="font-bold text-[10px]">
                                    PRIVATE
                                </Chip>
                                <Chip size="sm" variant="flat" color="warning" className="font-bold text-[10px]">
                                    TESTNET
                                </Chip>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Banner */}
                <PrivacyNotice
                    type="info"
                    title="Privacy-Preserving Credit"
                    message="Build your credit score on-chain while maintaining complete privacy. Prove your creditworthiness without revealing your exact score or financial history using zero-knowledge proofs."
                    className="mb-6"
                />
            </motion.div>

            {/* Main Content */}
            <div className="w-full max-w-6xl">
                <CreditScoreDisplay />
            </div>

            {/* Features Grid */}
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                                <Shield className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Private Score</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Your credit score is calculated on-chain but remains private using ZK proofs.
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <Award className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Prove Creditworthiness</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Generate ZK proofs to prove you meet credit requirements without revealing details.
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Build Credit History</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    On-time payments and responsible borrowing improve your score over time.
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* How It Works */}
            <div className="w-full max-w-6xl mt-6">
                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">How ZK Credit Works</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                                    <span className="text-xl font-bold text-purple-600">1</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-2">Build History</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Make on-time payments and maintain healthy credit utilization
                                </p>
                            </div>
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                                    <span className="text-xl font-bold text-blue-600">2</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-2">Score Calculation</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Your score is calculated on-chain using encrypted payment data
                                </p>
                            </div>
                            <div className="flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                                    <span className="text-xl font-bold text-green-600">3</span>
                                </div>
                                <h3 className="text-sm font-bold text-gray-900 mb-2">Generate Proofs</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Create ZK proofs to verify creditworthiness without revealing details
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
