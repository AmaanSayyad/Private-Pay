// AleoDarkPoolPage
// Main page for private dark pool trading

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, TrendingUp, Info } from 'lucide-react';
import { Card, CardBody, Chip } from '@nextui-org/react';
import DarkPoolInterface from '../components/aleo/DarkPoolInterface';
import { PrivacyNotice } from '../components/aleo/PrivacyComponents';

export default function AleoDarkPoolPage() {
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
                            <Shield className="w-8 h-8 text-white" fill="currentColor" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                                Dark Pool Trading
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
                    title="Private Order Execution"
                    message="Trade with complete privacy using zero-knowledge proofs. Your order details are encrypted and only revealed when matched. Supports market, limit, TWAP, and stop-loss orders."
                    className="mb-6"
                />
            </motion.div>

            {/* Main Content */}
            <div className="w-full max-w-6xl">
                <DarkPoolInterface />
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
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Complete Privacy</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Order details encrypted with ZK proofs. Only matched orders are revealed.
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <TrendingUp className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Advanced Orders</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Support for market, limit, TWAP, and stop-loss order types.
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                                <Info className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Fair Execution</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Cryptographically guaranteed fair order matching and execution.
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
