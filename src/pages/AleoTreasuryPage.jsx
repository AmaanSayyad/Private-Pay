// AleoTreasuryPage
// Main page for institutional treasury management

import React from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Users, Shield, FileText } from 'lucide-react';
import { Card, CardBody, Chip } from '@nextui-org/react';
import TreasuryDashboard from '../components/aleo/TreasuryDashboard';
import { PrivacyNotice } from '../components/aleo/PrivacyComponents';

export default function AleoTreasuryPage() {
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
                            <Briefcase className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tight">
                                Treasury Management
                            </h1>
                            <div className="flex items-center gap-2 mt-2">
                                <Chip size="sm" variant="flat" color="secondary" className="font-bold text-[10px]">
                                    INSTITUTIONAL
                                </Chip>
                                <Chip size="sm" variant="flat" color="primary" className="font-bold text-[10px]">
                                    MULTI-SIG
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
                    title="Privacy-Preserving Institutional Finance"
                    message="Manage institutional funds with multi-signature security and complete privacy. All treasury operations use zero-knowledge proofs while maintaining compliance through selective disclosure."
                    className="mb-6"
                />
            </motion.div>

            {/* Main Content */}
            <div className="w-full max-w-6xl">
                <TreasuryDashboard />
            </div>

            {/* Features Grid */}
            <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Multi-Signature</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Require multiple approvals for transactions
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
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Private Operations</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    All treasury operations use ZK proofs
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Compliance Ready</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Selective disclosure for regulatory reporting
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>

                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-6">
                        <div className="flex flex-col items-center text-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                                <Briefcase className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-1">Asset Management</h3>
                                <p className="text-xs text-gray-600 leading-relaxed">
                                    Comprehensive fund allocation and tracking
                                </p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>

            {/* Use Cases */}
            <div className="w-full max-w-6xl mt-6">
                <Card className="bg-white border border-gray-200 rounded-2xl">
                    <CardBody className="p-8">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Treasury Use Cases</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* DAO Treasury */}
                            <div className="p-6 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                                        <Users className="w-5 h-5 text-purple-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">DAO Treasury</h3>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">
                                    Manage DAO funds with multi-signature security and transparent governance while maintaining privacy.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                        <span className="text-xs text-gray-700">Multi-sig voting</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                        <span className="text-xs text-gray-700">Proposal execution</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-purple-600" />
                                        <span className="text-xs text-gray-700">Fund allocation</span>
                                    </div>
                                </div>
                            </div>

                            {/* Corporate Treasury */}
                            <div className="p-6 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                                        <Briefcase className="w-5 h-5 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">Corporate Treasury</h3>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">
                                    Enterprise fund management with compliance features and selective disclosure for auditors.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                        <span className="text-xs text-gray-700">Payroll processing</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                        <span className="text-xs text-gray-700">Investment tracking</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                                        <span className="text-xs text-gray-700">Compliance reporting</span>
                                    </div>
                                </div>
                            </div>

                            {/* Investment Fund */}
                            <div className="p-6 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                                        <Shield className="w-5 h-5 text-green-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">Investment Fund</h3>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">
                                    Private fund management with confidential positions and selective investor reporting.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                                        <span className="text-xs text-gray-700">Portfolio management</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                                        <span className="text-xs text-gray-700">Investor reporting</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
                                        <span className="text-xs text-gray-700">Performance tracking</span>
                                    </div>
                                </div>
                            </div>

                            {/* Protocol Treasury */}
                            <div className="p-6 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                                        <FileText className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900">Protocol Treasury</h3>
                                </div>
                                <p className="text-sm text-gray-600 mb-4">
                                    DeFi protocol treasury with automated strategies and transparent governance.
                                </p>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                                        <span className="text-xs text-gray-700">Revenue management</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                                        <span className="text-xs text-gray-700">Liquidity provision</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-600" />
                                        <span className="text-xs text-gray-700">Token buybacks</span>
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
