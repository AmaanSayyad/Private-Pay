// User Guidance Components
// Multi-step process guidance and help systems for Aleo DeFi

import React, { useState } from 'react';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, Progress, Card, CardBody } from '@nextui-org/react';
import { CheckCircle2, Circle, AlertCircle, Info, Shield, ArrowRight, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * MultiStepGuide Component
 * Guides users through complex multi-step operations
 */
export function MultiStepGuide({ steps, currentStep, onStepComplete, onCancel, isOpen, onClose }) {
    const progress = ((currentStep + 1) / steps.length) * 100;
    const step = steps[currentStep];

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" isDismissable={false}>
            <ModalContent>
                <ModalHeader className="flex flex-col gap-2">
                    <h3 className="text-xl font-bold">{step?.title}</h3>
                    <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                            Step {currentStep + 1} of {steps.length}
                        </span>
                        <Progress value={progress} color="secondary" className="flex-1 h-1.5" />
                    </div>
                </ModalHeader>

                <ModalBody>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            {/* Step Description */}
                            <p className="text-sm text-gray-600">{step?.description}</p>

                            {/* Step Content */}
                            {step?.content}

                            {/* Privacy Notice */}
                            {step?.privacyNotice && (
                                <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-start gap-3">
                                    <Shield className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-xs font-bold text-purple-900 mb-1">Privacy Notice</h4>
                                        <p className="text-xs text-purple-700 leading-relaxed">
                                            {step.privacyNotice}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Warning */}
                            {step?.warning && (
                                <div className="p-3 bg-orange-50 rounded-xl border border-orange-100 flex items-start gap-3">
                                    <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <h4 className="text-xs font-bold text-orange-900 mb-1">Warning</h4>
                                        <p className="text-xs text-orange-700 leading-relaxed">
                                            {step.warning}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </ModalBody>

                <ModalFooter>
                    {currentStep > 0 && (
                        <Button
                            variant="flat"
                            onClick={() => onStepComplete(currentStep - 1)}
                            startContent={<ArrowLeft size={16} />}
                        >
                            Back
                        </Button>
                    )}
                    <Button
                        color="secondary"
                        onClick={() => {
                            if (currentStep < steps.length - 1) {
                                onStepComplete(currentStep + 1);
                            } else {
                                onClose();
                            }
                        }}
                        endContent={currentStep < steps.length - 1 ? <ArrowRight size={16} /> : null}
                    >
                        {currentStep < steps.length - 1 ? 'Continue' : 'Finish'}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

/**
 * TransactionConfirmation Component
 * Shows detailed transaction confirmation before execution
 */
export function TransactionConfirmation({
    isOpen,
    onClose,
    onConfirm,
    transaction,
    isLoading = false
}) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} size="lg">
            <ModalContent>
                <ModalHeader>
                    <h3 className="text-xl font-bold">Confirm Transaction</h3>
                </ModalHeader>

                <ModalBody className="space-y-4">
                    {/* Transaction Type */}
                    <div>
                        <p className="text-xs text-gray-500 mb-1">Transaction Type</p>
                        <p className="text-sm font-bold text-gray-900">{transaction?.type}</p>
                    </div>

                    {/* Transaction Details */}
                    <Card className="bg-gray-50 border border-gray-200">
                        <CardBody className="p-4 space-y-3">
                            {transaction?.details?.map((detail, index) => (
                                <div key={index} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">{detail.label}</span>
                                    <span className="text-sm font-medium text-gray-900">{detail.value}</span>
                                </div>
                            ))}
                        </CardBody>
                    </Card>

                    {/* Privacy Mode */}
                    {transaction?.privacyMode && (
                        <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-3">
                            <Shield className="w-5 h-5 text-purple-600" />
                            <div>
                                <p className="text-xs font-bold text-purple-900">Privacy Mode Enabled</p>
                                <p className="text-xs text-purple-700">
                                    This transaction will use zero-knowledge proofs
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Estimated Fee */}
                    <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-900">Estimated Fee</span>
                            <span className="text-sm font-bold text-blue-900">{transaction?.estimatedFee}</span>
                        </div>
                    </div>

                    {/* Warning */}
                    {transaction?.warning && (
                        <div className="p-3 bg-orange-50 rounded-xl border border-orange-100 flex items-start gap-3">
                            <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-orange-700 leading-relaxed">
                                {transaction.warning}
                            </p>
                        </div>
                    )}
                </ModalBody>

                <ModalFooter>
                    <Button variant="flat" onClick={onClose} isDisabled={isLoading}>
                        Cancel
                    </Button>
                    <Button
                        color="secondary"
                        onClick={onConfirm}
                        isLoading={isLoading}
                    >
                        Confirm & Sign
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

/**
 * PrivacyExplainer Component
 * Explains privacy implications of operations
 */
export function PrivacyExplainer({ feature, isOpen, onClose }) {
    const explanations = {
        darkpool: {
            title: 'Dark Pool Privacy',
            description: 'Your dark pool orders are completely private using zero-knowledge proofs.',
            details: [
                'Order details are encrypted on-chain',
                'Only matched orders are revealed',
                'Your trading activity remains confidential',
                'Price and size are hidden until execution',
            ],
            level: 'high',
        },
        swap: {
            title: 'Shielded Swap Privacy',
            description: 'Token swaps with complete privacy protection.',
            details: [
                'Swap amounts are encrypted',
                'Your balances remain private',
                'Trading pairs are hidden',
                'Slippage protection included',
            ],
            level: 'high',
        },
        lending: {
            title: 'Private Lending',
            description: 'Lend and borrow with privacy preservation.',
            details: [
                'Position sizes are encrypted',
                'Interest rates are private',
                'Collateral amounts are hidden',
                'Only you can see your positions',
            ],
            level: 'medium',
        },
        credit: {
            title: 'ZK Credit Score',
            description: 'Build credit while maintaining privacy.',
            details: [
                'Your exact score is private',
                'Prove creditworthiness without revealing details',
                'Payment history is encrypted',
                'Selective disclosure for lenders',
            ],
            level: 'high',
        },
    };

    const info = explanations[feature] || explanations.darkpool;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="md">
            <ModalContent>
                <ModalHeader>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-purple-600" />
                        </div>
                        <h3 className="text-xl font-bold">{info.title}</h3>
                    </div>
                </ModalHeader>

                <ModalBody className="space-y-4">
                    <p className="text-sm text-gray-600">{info.description}</p>

                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-gray-900">Privacy Features:</h4>
                        {info.details.map((detail, index) => (
                            <div key={index} className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{detail}</span>
                            </div>
                        ))}
                    </div>

                    {/* Privacy Level */}
                    <div className={`p-4 rounded-xl border-2 ${info.level === 'high'
                            ? 'bg-green-50 border-green-200'
                            : 'bg-blue-50 border-blue-200'
                        }`}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex gap-1">
                                {[1, 2, 3].map((bar) => (
                                    <div
                                        key={bar}
                                        className={`w-1.5 h-6 rounded-full ${bar <= (info.level === 'high' ? 3 : 2)
                                                ? info.level === 'high' ? 'bg-green-600' : 'bg-blue-600'
                                                : 'bg-gray-200'
                                            }`}
                                    />
                                ))}
                            </div>
                            <div>
                                <p className={`text-sm font-bold ${info.level === 'high' ? 'text-green-600' : 'text-blue-600'
                                    }`}>
                                    {info.level === 'high' ? 'High Privacy' : 'Medium Privacy'}
                                </p>
                                <p className="text-xs text-gray-600">
                                    {info.level === 'high'
                                        ? 'Full ZK proof protection'
                                        : 'Partial encryption enabled'}
                                </p>
                            </div>
                        </div>
                    </div>
                </ModalBody>

                <ModalFooter>
                    <Button color="secondary" onClick={onClose}>
                        Got it
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

/**
 * HelpTooltip Component
 * Inline help tooltips for features
 */
export function HelpTooltip({ title, content, children }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative inline-block">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
            >
                <Info className="w-3 h-3 text-gray-600" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64"
                    >
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                            <div className="flex items-start gap-2 mb-2">
                                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <h4 className="text-sm font-bold text-gray-900">{title}</h4>
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">{content}</p>
                            {children}
                        </div>
                        <div className="w-3 h-3 bg-white border-r border-b border-gray-200 transform rotate-45 absolute -bottom-1.5 left-1/2 -translate-x-1/2" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/**
 * ProcessSteps Component
 * Visual representation of multi-step process
 */
export function ProcessSteps({ steps, currentStep }) {
    return (
        <div className="flex items-center justify-between w-full">
            {steps.map((step, index) => (
                <React.Fragment key={index}>
                    <div className="flex flex-col items-center gap-2">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${index < currentStep
                                ? 'bg-green-100 border-green-600'
                                : index === currentStep
                                    ? 'bg-purple-100 border-purple-600'
                                    : 'bg-gray-100 border-gray-300'
                            }`}>
                            {index < currentStep ? (
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                            ) : index === currentStep ? (
                                <Circle className="w-5 h-5 text-purple-600 fill-current" />
                            ) : (
                                <Circle className="w-5 h-5 text-gray-400" />
                            )}
                        </div>
                        <span className={`text-xs font-medium ${index <= currentStep ? 'text-gray-900' : 'text-gray-400'
                            }`}>
                            {step}
                        </span>
                    </div>
                    {index < steps.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-2 ${index < currentStep ? 'bg-green-600' : 'bg-gray-300'
                            }`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}

/**
 * FeatureGuide Component
 * Comprehensive guide for a specific feature
 */
export function FeatureGuide({ feature, isOpen, onClose }) {
    const guides = {
        darkpool: {
            title: 'Dark Pool Trading Guide',
            sections: [
                {
                    title: 'What is Dark Pool Trading?',
                    content: 'Dark pools allow you to trade large amounts without revealing your intentions to the market. Your orders are encrypted and only matched orders are revealed.',
                },
                {
                    title: 'How to Place an Order',
                    steps: [
                        'Select order type (Market, Limit, TWAP, or Stop-Loss)',
                        'Enter the amount you want to trade',
                        'Set your price (for limit orders)',
                        'Enable privacy mode for encrypted orders',
                        'Review and confirm your order',
                    ],
                },
                {
                    title: 'Privacy Features',
                    content: 'All dark pool orders use zero-knowledge proofs to keep your trading activity private. Only you and your matched counterparty can see the order details.',
                },
            ],
        },
        // Add more feature guides as needed
    };

    const guide = guides[feature] || guides.darkpool;

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
            <ModalContent>
                <ModalHeader>
                    <h3 className="text-xl font-bold">{guide.title}</h3>
                </ModalHeader>

                <ModalBody className="space-y-6">
                    {guide.sections.map((section, index) => (
                        <div key={index}>
                            <h4 className="text-lg font-bold text-gray-900 mb-3">{section.title}</h4>
                            {section.content && (
                                <p className="text-sm text-gray-600 leading-relaxed">{section.content}</p>
                            )}
                            {section.steps && (
                                <ol className="space-y-2 mt-3">
                                    {section.steps.map((step, stepIndex) => (
                                        <li key={stepIndex} className="flex items-start gap-3">
                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-600 text-xs font-bold flex items-center justify-center">
                                                {stepIndex + 1}
                                            </span>
                                            <span className="text-sm text-gray-700">{step}</span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </div>
                    ))}
                </ModalBody>

                <ModalFooter>
                    <Button color="secondary" onClick={onClose}>
                        Close Guide
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
