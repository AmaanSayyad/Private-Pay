// AleoLendingPage
// Main page for private lending and borrowing

import React from 'react';
import { motion } from 'framer-motion';
import { Coins, Shield, Percent, Lock } from 'lucide-react';
import { Card, CardBody, Chip } from '@nextui-org/react';
import LendingInterface from '../components/aleo/LendingInterface';
import { PrivacyNotice } from '../components/aleo/PrivacyComponents';

export default function AleoLendingPage() {
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
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500 to-green-700 shadow-lg flex items-center justify-center">
                            <Coins className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                                Private Lending
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
                    title="Privacy-Preserving DeFi Lending"
                    message="Supply assets to earn yield or borrow with collateral while maintaining complete privacy. Your positions, balances, and transactions are encrypted using zero-knowledge proofs."
                    className="mb-6"
                />
            </motion.div>

            {/* Main Content */}
            <div className="w-full max-w-6xl">
                <LendingInterface />
            </div>

            {/* Features Grid */}
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                <Coins className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Supply & Earn</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Earn competitive APY on your supplied assets
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                <Percent className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Borrow Assets</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Borrow with collateral at competitive rates
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Private Positions</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Your lending positions remain confidential
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                                <Lock className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Secure Collateral</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Collateral managed with ZK proof security
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Lending Pools Info */}
            <div className="w-full max-w-6xl mt-6">
                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">How Private Lending Works</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Supply Side */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                        <Coins className="w-5 h-5 text-green-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">Supply Assets</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs font-bold text-green-600">1</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Deposit Assets</p>
                                            <p className="text-xs text-gray-600">Supply tokens to lending pools</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs font-bold text-green-600">2</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Earn Interest</p>
                                            <p className="text-xs text-gray-600">Automatically earn APY on deposits</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs font-bold text-green-600">3</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Withdraw Anytime</p>
                                            <p className="text-xs text-gray-600">Access your funds plus earnings</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Borrow Side */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <Percent className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">Borrow Assets</h3>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs font-bold text-blue-600">1</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Provide Collateral</p>
                                            <p className="text-xs text-gray-600">Deposit collateral (150% minimum)</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs font-bold text-blue-600">2</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Borrow Tokens</p>
                                            <p className="text-xs text-gray-600">Borrow up to your collateral limit</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <span className="text-xs font-bold text-blue-600">3</span>
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">Repay & Reclaim</p>
                                            <p className="text-xs text-gray-600">Repay loan to unlock collateral</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
