// AleoAMMPage
// Main page for shielded AMM and liquidity provision

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowDownUp, Droplets, Zap } from 'lucide-react';
import { Card, CardBody, Chip, Tabs, Tab } from '@nextui-org/react';
import SwapInterface from '../components/aleo/SwapInterface';
import { PrivacyNotice } from '../components/aleo/PrivacyComponents';

export default function AleoAMMPage() {
    const [activeTab, setActiveTab] = React.useState('swap');

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
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg flex items-center justify-center">
                            <ArrowDownUp className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                                Shielded AMM
                            </h1>
                            <div className="flex items-center gap-2 mt-2">
                                <Chip size="sm" variant="flat" color="secondary" className="font-bold text-[10px]">
                                    PRIVATE SWAPS
                                </Chip>
                                <Chip size="sm" variant="flat" color="primary" className="font-bold text-[10px]">
                                    LIQUIDITY
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
                    title="Private Token Exchange"
                    message="Swap tokens with complete privacy using zero-knowledge proofs. Your trading activity, balances, and positions remain confidential while ensuring correct execution."
                    className="mb-6"
                />
            </motion.div>

            {/* Main Content */}
            <div className="w-full max-w-6xl">
                <Tabs
                    selectedKey={activeTab}
                    onSelectionChange={setActiveTab}
                    color="primary"
                    size="lg"
                    classNames={{
                        tabList: "bg-white rounded-2xl p-2 border border-gray-200",
                        tab: "rounded-xl",
                        cursor: "rounded-xl",
                    }}
                >
                    <Tab
                        key="swap"
                        title={
                            <div className="flex items-center gap-2">
                                <ArrowDownUp className="w-4 h-4" />
                                <span>Swap</span>
                            </div>
                        }
                    >
                        <div className="mt-6">
                            <SwapInterface />
                        </div>
                    </Tab>

                    <Tab
                        key="liquidity"
                        title={
                            <div className="flex items-center gap-2">
                                <Droplets className="w-4 h-4" />
                                <span>Liquidity</span>
                            </div>
                        }
                    >
                        <div className="mt-6">
                            <Card className="bg-white border border-gray-200 shadow-lg rounded-2xl">
                                <CardBody className="p-12 text-center">
                                    <Droplets className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                                        Liquidity Provision Coming Soon
                                    </h3>
                                    <p className="text-sm text-gray-600 max-w-md mx-auto">
                                        Add liquidity to earn fees while maintaining complete privacy.
                                        Your LP positions will be encrypted using zero-knowledge proofs.
                                    </p>
                                </CardBody>
                            </Card>
                        </div>
                    </Tab>
                </Tabs>
            </div>

            {/* Features Grid */}
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <ArrowDownUp className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Private Swaps</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Trade tokens without revealing your balances or trading activity.
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                                <Droplets className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Encrypted Liquidity</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Provide liquidity with privacy. Your LP positions remain confidential.
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                                <Zap className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Low Slippage</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Efficient pricing with customizable slippage tolerance settings.
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
