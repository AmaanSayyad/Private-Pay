// Shared Privacy Components
// Reusable privacy-focused UI components for Aleo integration

import React, { useState } from 'react';
import { Button, Switch, Chip, Progress, Tooltip, Popover, PopoverTrigger, PopoverContent } from '@nextui-org/react';
import { Shield, Eye, EyeOff, Lock, Info, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * PrivacyToggle Component
 * Toggle between public and private modes with visual feedback
 */
export function PrivacyToggle({ isPrivate, onToggle, size = 'md', showLabel = true, className = '' }) {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {showLabel && (
                <span className={`font-medium text-gray-700 ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
                    Privacy Mode
                </span>
            )}
            <Switch
                isSelected={isPrivate}
                onValueChange={onToggle}
                size={size}
                color="secondary"
                startContent={<Lock className="w-3 h-3" />}
                endContent={<Eye className="w-3 h-3" />}
            />
            <Chip
                size="sm"
                color={isPrivate ? 'success' : 'default'}
                variant="flat"
                startContent={isPrivate ? <Shield className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                className="font-bold"
            >
                {isPrivate ? 'PRIVATE' : 'PUBLIC'}
            </Chip>
        </div>
    );
}

/**
 * PrivacyModeCard Component
 * Card-style privacy mode selector with description
 */
export function PrivacyModeCard({ isPrivate, onToggle, className = '' }) {
    return (
        <div className={`p-4 rounded-xl border-2 transition-all ${isPrivate
                ? 'bg-purple-50 border-purple-200'
                : 'bg-gray-50 border-gray-200'
            } ${className}`}>
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPrivate ? 'bg-purple-100' : 'bg-gray-200'
                        }`}>
                        {isPrivate ? (
                            <Shield className="w-5 h-5 text-purple-600" />
                        ) : (
                            <Eye className="w-5 h-5 text-gray-600" />
                        )}
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-900">
                            {isPrivate ? 'Private Mode' : 'Public Mode'}
                        </h4>
                        <p className="text-xs text-gray-500">
                            {isPrivate
                                ? 'Zero-knowledge proofs enabled'
                                : 'Transparent on-chain transactions'}
                        </p>
                    </div>
                </div>
                <Switch
                    isSelected={isPrivate}
                    onValueChange={onToggle}
                    color="secondary"
                />
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">
                {isPrivate
                    ? 'Your transaction details are encrypted and only visible to you. ZK proofs ensure correctness without revealing data.'
                    : 'Your transaction will be publicly visible on the blockchain. Anyone can see the details.'}
            </p>
        </div>
    );
}

/**
 * ViewKeyManager Component
 * Interface for managing view keys and selective disclosure
 */
export function ViewKeyManager({ viewKeys = [], onGenerateKey, onRevokeKey, className = '' }) {
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            await onGenerateKey?.();
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-bold text-gray-900">View Keys</h4>
                    <p className="text-xs text-gray-500">Grant selective access to your data</p>
                </div>
                <Button
                    size="sm"
                    color="secondary"
                    variant="flat"
                    onClick={handleGenerate}
                    isLoading={isGenerating}
                    className="rounded-xl font-semibold"
                    startContent={!isGenerating && <Lock size={14} />}
                >
                    Generate Key
                </Button>
            </div>

            {viewKeys.length === 0 ? (
                <div className="p-6 bg-gray-50 rounded-xl text-center">
                    <Lock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">No view keys generated</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {viewKeys.map((key, index) => (
                        <motion.div
                            key={key.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between"
                        >
                            <div className="flex-1">
                                <p className="text-xs font-mono text-gray-900 mb-1">
                                    {key.id.substring(0, 20)}...
                                </p>
                                <div className="flex items-center gap-2">
                                    <Chip size="sm" variant="flat" className="text-xs">
                                        {key.permissions?.length || 0} permissions
                                    </Chip>
                                    <span className="text-xs text-gray-500">
                                        Expires: {new Date(key.expiresAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                color="danger"
                                variant="light"
                                onClick={() => onRevokeKey?.(key.id)}
                                className="rounded-lg"
                            >
                                Revoke
                            </Button>
                        </motion.div>
                    ))}
                </div>
            )}

            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                    View keys allow auditors or partners to verify specific data without accessing your entire transaction history.
                </p>
            </div>
        </div>
    );
}

/**
 * ProofProgressIndicator Component
 * Visual indicator for ZK proof generation progress
 */
export function ProofProgressIndicator({ progress, status, message, className = '' }) {
    const getStatusColor = () => {
        switch (status) {
            case 'generating': return 'secondary';
            case 'complete': return 'success';
            case 'error': return 'danger';
            default: return 'default';
        }
    };

    const getStatusIcon = () => {
        switch (status) {
            case 'generating': return <Shield className="w-4 h-4 animate-pulse" />;
            case 'complete': return <CheckCircle2 className="w-4 h-4" />;
            case 'error': return <AlertCircle className="w-4 h-4" />;
            default: return <Shield className="w-4 h-4" />;
        }
    };

    if (status === 'idle') return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl border ${status === 'generating' ? 'bg-purple-50 border-purple-100' :
                    status === 'complete' ? 'bg-green-50 border-green-100' :
                        status === 'error' ? 'bg-red-50 border-red-100' :
                            'bg-gray-50 border-gray-100'
                } ${className}`}
        >
            <div className="flex items-center gap-3 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${status === 'generating' ? 'bg-purple-100 text-purple-600' :
                        status === 'complete' ? 'bg-green-100 text-green-600' :
                            status === 'error' ? 'bg-red-100 text-red-600' :
                                'bg-gray-100 text-gray-600'
                    }`}>
                    {getStatusIcon()}
                </div>
                <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900">
                        {status === 'generating' ? 'Generating ZK Proof' :
                            status === 'complete' ? 'Proof Generated' :
                                status === 'error' ? 'Proof Generation Failed' :
                                    'Preparing...'}
                    </p>
                    {message && (
                        <p className="text-xs text-gray-500">{message}</p>
                    )}
                </div>
                {status === 'generating' && (
                    <span className="text-sm font-bold text-purple-600">{progress}%</span>
                )}
            </div>
            {status === 'generating' && (
                <Progress
                    value={progress}
                    color={getStatusColor()}
                    className="h-2"
                />
            )}
        </motion.div>
    );
}

/**
 * PrivacyTooltip Component
 * Informative tooltip explaining privacy features
 */
export function PrivacyTooltip({ title, description, children, placement = 'top' }) {
    return (
        <Popover placement={placement}>
            <PopoverTrigger>
                <Button
                    isIconOnly
                    size="sm"
                    variant="light"
                    className="min-w-0 w-5 h-5 rounded-full"
                >
                    <HelpCircle className="w-4 h-4 text-gray-400" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="max-w-xs">
                <div className="p-4">
                    <div className="flex items-start gap-3 mb-2">
                        <Shield className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                        <h4 className="text-sm font-bold text-gray-900">{title}</h4>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
                    {children}
                </div>
            </PopoverContent>
        </Popover>
    );
}

/**
 * PrivacyBadge Component
 * Badge showing privacy status
 */
export function PrivacyBadge({ isPrivate, size = 'md', showIcon = true, className = '' }) {
    return (
        <Chip
            size={size}
            color={isPrivate ? 'success' : 'default'}
            variant="flat"
            startContent={showIcon && (isPrivate ? <Shield className="w-3 h-3" /> : <Eye className="w-3 h-3" />)}
            className={`font-bold ${className}`}
        >
            {isPrivate ? 'PRIVATE' : 'PUBLIC'}
        </Chip>
    );
}

/**
 * PrivacyNotice Component
 * Informational notice about privacy features
 */
export function PrivacyNotice({ type = 'info', title, message, className = '' }) {
    const getColors = () => {
        switch (type) {
            case 'success': return 'bg-green-50 border-green-100 text-green-900';
            case 'warning': return 'bg-orange-50 border-orange-100 text-orange-900';
            case 'error': return 'bg-red-50 border-red-100 text-red-900';
            default: return 'bg-purple-50 border-purple-100 text-purple-900';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
            case 'warning': return <AlertCircle className="w-5 h-5 text-orange-600" />;
            case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />;
            default: return <Shield className="w-5 h-5 text-purple-600" />;
        }
    };

    return (
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${getColors()} ${className}`}>
            <div className="mt-0.5 flex-shrink-0">
                {getIcon()}
            </div>
            <div>
                {title && <h4 className="text-sm font-bold mb-1">{title}</h4>}
                <p className="text-xs leading-relaxed opacity-90">{message}</p>
            </div>
        </div>
    );
}

/**
 * PrivacyLevel Component
 * Visual indicator of privacy level
 */
export function PrivacyLevel({ level = 'high', showDescription = true, className = '' }) {
    const levels = {
        low: {
            color: 'text-orange-600',
            bg: 'bg-orange-50',
            border: 'border-orange-200',
            label: 'Low Privacy',
            description: 'Some data visible on-chain',
            bars: 1,
        },
        medium: {
            color: 'text-blue-600',
            bg: 'bg-blue-50',
            border: 'border-blue-200',
            label: 'Medium Privacy',
            description: 'Partial encryption enabled',
            bars: 2,
        },
        high: {
            color: 'text-green-600',
            bg: 'bg-green-50',
            border: 'border-green-200',
            label: 'High Privacy',
            description: 'Full ZK proof protection',
            bars: 3,
        },
    };

    const config = levels[level] || levels.medium;

    return (
        <div className={`p-4 rounded-xl border-2 ${config.bg} ${config.border} ${className}`}>
            <div className="flex items-center gap-3 mb-2">
                <div className="flex gap-1">
                    {[1, 2, 3].map((bar) => (
                        <div
                            key={bar}
                            className={`w-1.5 h-6 rounded-full ${bar <= config.bars ? config.color.replace('text-', 'bg-') : 'bg-gray-200'
                                }`}
                        />
                    ))}
                </div>
                <div>
                    <p className={`text-sm font-bold ${config.color}`}>{config.label}</p>
                    {showDescription && (
                        <p className="text-xs text-gray-600">{config.description}</p>
                    )}
                </div>
            </div>
        </div>
    );
}
