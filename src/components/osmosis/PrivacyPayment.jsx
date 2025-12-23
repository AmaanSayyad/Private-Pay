import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardBody, Input, Button, Chip } from '@nextui-org/react';
import { Shield, Copy, Check, Zap, QrCode, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { privacyService } from '../../lib/osmosis/privacyService.js';

export const PrivacyPayment = () => {
    const [recipient, setRecipient] = useState('');
    const [amount, setAmount] = useState('');
    const [message, setMessage] = useState('');
    const [link, setLink] = useState('');
    const [paymentId, setPaymentId] = useState('');
    const [stealthAddress, setStealthAddress] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);
    const [showQR, setShowQR] = useState(false);
    const [qrCode, setQrCode] = useState('');
    const [privacyAccount, setPrivacyAccount] = useState(null);

    useEffect(() => {
        // Load or create privacy account
        const account = privacyService.getStoredPrivacyAccount();
        if (account) {
            setPrivacyAccount(account);
        } else {
            // Create new privacy account
            const newAccount = privacyService.createPrivacyAccount();
            setPrivacyAccount(newAccount);
        }
    }, []);

    const generateStealthLink = async () => {
        if (!privacyAccount) {
            toast.error('Privacy account not initialized');
            return;
        }

        setIsGenerating(true);
        try {
            const paymentData = await privacyService.generatePaymentLink(
                privacyAccount.metaAddress,
                amount || null,
                message || null
            );

            setPaymentId(paymentData.paymentId);
            setLink(paymentData.paymentLink);
            setStealthAddress(paymentData.stealthAddress);
            setQrCode(paymentData.qrCode);

            toast.success('Stealth payment link generated!');
        } catch (error) {
            console.error('Error generating stealth link:', error);
            toast.error('Failed to generate stealth link');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyLink = () => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        toast.success('Stealth link copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const copyStealthAddress = () => {
        navigator.clipboard.writeText(stealthAddress);
        toast.success('Stealth address copied!');
    };

    const resetForm = () => {
        setLink('');
        setPaymentId('');
        setStealthAddress('');
        setAmount('');
        setMessage('');
        setRecipient('');
        setShowQR(false);
        setQrCode('');
    };

    return (
        <Card className="bg-white border border-gray-200 shadow-sm rounded-2xl">
            <CardBody className="p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        Privacy Payments
                    </h3>
                    {privacyAccount && (
                        <Chip size="sm" color="success" variant="flat" className="font-bold text-[10px]">
                            STEALTH READY
                        </Chip>
                    )}
                </div>

                <p className="text-gray-600 text-sm mb-6">
                    Generate untraceable payment links using stealth addresses. Each payment is completely unlinkable.
                </p>

                {!privacyAccount ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-gray-600">Initializing privacy account...</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Privacy Account Info */}
                        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-bold text-blue-700 uppercase">Your Meta Address</span>
                                <Button
                                    size="sm"
                                    variant="light"
                                    onClick={() => navigator.clipboard.writeText(privacyAccount.metaAddress)}
                                    className="text-blue-600 hover:bg-blue-100 min-w-8 h-6"
                                >
                                    <Copy size={12} />
                                </Button>
                            </div>
                            <code className="text-xs text-blue-800 font-mono break-all">
                                {privacyAccount.metaAddress}
                            </code>
                        </div>

                        {/* Payment Form */}
                        <Input
                            label="Amount (Optional)"
                            placeholder="0.00"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            variant="bordered"
                            type="number"
                            classNames={{
                                inputWrapper: "h-12 focus-within:border-blue-400",
                                label: "text-gray-700 font-semibold"
                            }}
                            endContent={
                                <span className="text-gray-500 text-sm font-medium">OSMO</span>
                            }
                            description="Leave empty for flexible amount"
                        />

                        <Input
                            label="Message (Optional)"
                            placeholder="Payment for..."
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            variant="bordered"
                            classNames={{
                                inputWrapper: "h-12 focus-within:border-blue-400",
                                label: "text-gray-700 font-semibold"
                            }}
                            description="Private message for the payment"
                        />

                        <Input
                            label="Recipient (Optional)"
                            placeholder="@username or email"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            variant="bordered"
                            classNames={{
                                inputWrapper: "h-12 focus-within:border-blue-400",
                                label: "text-gray-700 font-semibold"
                            }}
                            description="For notification purposes only"
                        />

                        <AnimatePresence>
                            {link ? (
                                <motion.div 
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    className="space-y-4"
                                >
                                    {/* Generated Link */}
                                    <Card className="bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-500 shadow-lg">
                                        <CardBody className="p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Zap className="w-4 h-4 text-white" />
                                                <p className="text-xs text-white font-bold uppercase">Stealth Payment Link</p>
                                                <Chip size="sm" className="bg-white/20 text-white font-bold text-[10px]">
                                                    ID: {paymentId.slice(0, 8)}...
                                                </Chip>
                                            </div>
                                            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm p-3 rounded-lg border border-white/30 mb-3">
                                                <code className="text-xs text-white flex-1 truncate font-mono">{link}</code>
                                                <Button
                                                    isIconOnly
                                                    variant="light"
                                                    onClick={copyLink}
                                                    className="text-white hover:bg-white/30 min-w-8"
                                                    size="sm"
                                                >
                                                    {copied ? <Check className="w-4 h-4 text-green-200" /> : <Copy className="w-4 h-4" />}
                                                </Button>
                                            </div>

                                            {/* Stealth Address */}
                                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/20">
                                                <div className="flex-1">
                                                    <p className="text-xs text-white/80 font-medium mb-1">Stealth Address:</p>
                                                    <code className="text-xs text-white font-mono break-all">{stealthAddress}</code>
                                                </div>
                                                <Button
                                                    isIconOnly
                                                    variant="light"
                                                    onClick={copyStealthAddress}
                                                    className="text-white hover:bg-white/30 min-w-8"
                                                    size="sm"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            <p className="text-xs text-white/90 mt-3">
                                                Share this link securely. Each payment uses a unique stealth address that cannot be linked to you.
                                            </p>
                                        </CardBody>
                                    </Card>

                                    {/* QR Code */}
                                    <div className="flex gap-2">
                                        <Button
                                            variant="bordered"
                                            onClick={() => setShowQR(!showQR)}
                                            className="flex-1 border-blue-200 text-blue-700 hover:bg-blue-50"
                                            startContent={showQR ? <EyeOff size={16} /> : <QrCode size={16} />}
                                        >
                                            {showQR ? 'Hide QR Code' : 'Show QR Code'}
                                        </Button>
                                        <Button
                                            variant="bordered"
                                            onClick={resetForm}
                                            className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50"
                                        >
                                            Generate New Link
                                        </Button>
                                    </div>

                                    {showQR && qrCode && (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="flex justify-center p-4 bg-white border border-gray-200 rounded-xl"
                                        >
                                            <img src={qrCode} alt="Payment QR Code" className="w-48 h-48" />
                                        </motion.div>
                                    )}
                                </motion.div>
                            ) : (
                                <Button
                                    onClick={generateStealthLink}
                                    isLoading={isGenerating}
                                    className="w-full h-12 font-bold bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:from-blue-500 hover:to-indigo-500 transition-all"
                                    startContent={!isGenerating && <Zap className="w-5 h-5" />}
                                >
                                    {isGenerating ? 'Generating Stealth Link...' : 'Generate Stealth Payment Link'}
                                </Button>
                            )}
                        </AnimatePresence>

                        {/* Privacy Features */}
                        <div className="grid grid-cols-2 gap-3 mt-6">
                            <div className="p-3 bg-green-50 rounded-xl border border-green-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <Shield className="w-4 h-4 text-green-600" />
                                    <span className="text-xs font-bold text-green-700 uppercase">Unlinkable</span>
                                </div>
                                <p className="text-xs text-green-600">Payments cannot be traced back to you</p>
                            </div>
                            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                                <div className="flex items-center gap-2 mb-1">
                                    <Eye className="w-4 h-4 text-purple-600" />
                                    <span className="text-xs font-bold text-purple-700 uppercase">Anonymous</span>
                                </div>
                                <p className="text-xs text-purple-600">Recipient identity is protected</p>
                            </div>
                        </div>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};
