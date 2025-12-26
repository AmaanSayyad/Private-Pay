// AleoVaultsPage
// Main page for cross-chain yield farming vaults

import React from 'react';
import { motion } from 'framer-motion';
import { Vault, Globe, Zap, Shield } from 'lucide-react';
import { Card, CardBody, Chip, Tabs, Tab } from '@nextui-org/react';
import VaultDashboard from '../components/aleo/VaultDashboard';
import YieldStrategies from '../components/aleo/YieldStrategies';
import { PrivacyNotice } from '../components/aleo/PrivacyComponents';

export default function AleoVaultsPage() {
    const [activeTab, setActiveTab] = React.useState('dashboard');

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
                            <Vault className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                                Cross-Chain Vaults
                            </h1>
                            <div className="flex items-center gap-2 mt-2">
                                <Chip size="sm" variant="flat" color="secondary" className="font-bold text-[10px]">
                                    YIELD FARMING
                                </Chip>
                                <Chip size="sm" variant="flat" color="primary" className="font-bold text-[10px]">
                                    MULTI-CHAIN
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
                    title="Private Cross-Chain Yield Farming"
                    message="Maximize your returns across multiple chains while maintaining complete privacy. Your vault positions and earnings are encrypted using zero-knowledge proofs with automated compounding."
                    className="mb-6"
                />
            </motion.div>

            {/* Main Content */}
            <div className="w-full max-w-6xl">
                <Tabs
                    selectedKey={activeTab}
                    onSelectionChange={setActiveTab}
                    color="secondary"
                    size="lg"
                    classNames={{
                        tabList: "bg-white rounded-2xl p-2 border border-gray-200",
                        tab: "rounded-xl",
                        cursor: "rounded-xl",
                    }}
                >
                    <Tab
                        key="dashboard"
                        title={
                            <div className="flex items-center gap-2">
                                <Vault className="w-4 h-4" />
                                <span>My Vaults</span>
                            </div>
                        }
                    >
                        <div className="mt-6">
                            <VaultDashboard />
                        </div>
                    </Tab>

                    <Tab
                        key="strategies"
                        title={
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                <span>Strategies</span>
                            </div>
                        }
                    >
                        <div className="mt-6">
                            <YieldStrategies />
                        </div>
                    </Tab>
                </Tabs>
            </div>

            {/* Features Grid */}
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                                <Vault className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Auto-Compound</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Automated yield compounding for maximum returns
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                <Globe className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Multi-Chain</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Deploy across Aleo, Ethereum, Solana, and more
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                <Zap className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">High APY</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Earn up to 28.7% APY with optimized strategies
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                                <Shield className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Private Positions</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Your vault balances remain confidential
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Strategy Comparison */}
            <div className="w-full max-w-6xl mt-6">
                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Available Strategies</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="text-left py-3 px-4 text-sm font-bold text-gray-900">Strategy</th>
                                        <th className="text-left py-3 px-4 text-sm font-bold text-gray-900">APY</th>
                                        <th className="text-left py-3 px-4 text-sm font-bold text-gray-900">Risk</th>
                                        <th className="text-left py-3 px-4 text-sm font-bold text-gray-900">Chains</th>
                                        <th className="text-left py-3 px-4 text-sm font-bold text-gray-900">TVL</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-4 px-4">
                                            <p className="text-sm font-medium text-gray-900">Stable Yield</p>
                                            <p className="text-xs text-gray-500">Conservative stablecoin strategy</p>
                                        </td>
                                        <td className="py-4 px-4">
                                            <Chip size="sm" color="success" variant="flat" className="font-bold">8.5%</Chip>
                                        </td>
                                        <td className="py-4 px-4">
                                            <Chip size="sm" color="success" variant="flat">Low</Chip>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600">Aleo, Ethereum</td>
                                        <td className="py-4 px-4 text-sm font-medium text-gray-900">$2.5M</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-4 px-4">
                                            <p className="text-sm font-medium text-gray-900">Balanced Growth</p>
                                            <p className="text-xs text-gray-500">Diversified DeFi protocols</p>
                                        </td>
                                        <td className="py-4 px-4">
                                            <Chip size="sm" color="primary" variant="flat" className="font-bold">15.2%</Chip>
                                        </td>
                                        <td className="py-4 px-4">
                                            <Chip size="sm" color="primary" variant="flat">Medium</Chip>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600">Aleo, Solana, ETH</td>
                                        <td className="py-4 px-4 text-sm font-medium text-gray-900">$1.8M</td>
                                    </tr>
                                    <tr className="border-b border-gray-100">
                                        <td className="py-4 px-4">
                                            <p className="text-sm font-medium text-gray-900">High Yield</p>
                                            <p className="text-xs text-gray-500">Leveraged positions</p>
                                        </td>
                                        <td className="py-4 px-4">
                                            <Chip size="sm" color="warning" variant="flat" className="font-bold">28.7%</Chip>
                                        </td>
                                        <td className="py-4 px-4">
                                            <Chip size="sm" color="warning" variant="flat">High</Chip>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600">Aleo, Sol, Osmosis</td>
                                        <td className="py-4 px-4 text-sm font-medium text-gray-900">$950K</td>
                                    </tr>
                                    <tr>
                                        <td className="py-4 px-4">
                                            <p className="text-sm font-medium text-gray-900">Privacy First</p>
                                            <p className="text-xs text-gray-500">Maximum privacy focus</p>
                                        </td>
                                        <td className="py-4 px-4">
                                            <Chip size="sm" color="secondary" variant="flat" className="font-bold">12.3%</Chip>
                                        </td>
                                        <td className="py-4 px-4">
                                            <Chip size="sm" color="primary" variant="flat">Medium</Chip>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600">Aleo, Zcash</td>
                                        <td className="py-4 px-4 text-sm font-medium text-gray-900">$1.2M</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </div>
    );
}
