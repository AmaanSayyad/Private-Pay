// Aleo Error Handling
// Comprehensive error handling with user-friendly messages and recovery

import toast from 'react-hot-toast';

/**
 * Error Types
 */
export const AleoErrorType = {
    WALLET_NOT_CONNECTED: 'WALLET_NOT_CONNECTED',
    WALLET_CONNECTION_FAILED: 'WALLET_CONNECTION_FAILED',
    TRANSACTION_REJECTED: 'TRANSACTION_REJECTED',
    TRANSACTION_FAILED: 'TRANSACTION_FAILED',
    PROOF_GENERATION_FAILED: 'PROOF_GENERATION_FAILED',
    INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
    NETWORK_ERROR: 'NETWORK_ERROR',
    BRIDGE_ERROR: 'BRIDGE_ERROR',
    PRIVACY_VIOLATION: 'PRIVACY_VIOLATION',
    SMART_CONTRACT_ERROR: 'SMART_CONTRACT_ERROR',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    TIMEOUT_ERROR: 'TIMEOUT_ERROR',
    UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

/**
 * AleoError Class
 * Custom error class for Aleo-specific errors
 */
export class AleoError extends Error {
    constructor(type, message, details = {}) {
        super(message);
        this.name = 'AleoError';
        this.type = type;
        this.details = details;
        this.timestamp = Date.now();
    }

    toJSON() {
        return {
            name: this.name,
            type: this.type,
            message: this.message,
            details: this.details,
            timestamp: this.timestamp,
        };
    }
}

/**
 * Error Messages
 * User-friendly error messages for each error type
 */
const ERROR_MESSAGES = {
    [AleoErrorType.WALLET_NOT_CONNECTED]: {
        title: 'Wallet Not Connected',
        message: 'Please connect your Leo Wallet to continue.',
        action: 'Connect Wallet',
    },
    [AleoErrorType.WALLET_CONNECTION_FAILED]: {
        title: 'Connection Failed',
        message: 'Failed to connect to Leo Wallet. Please make sure the extension is installed and unlocked.',
        action: 'Retry Connection',
    },
    [AleoErrorType.TRANSACTION_REJECTED]: {
        title: 'Transaction Rejected',
        message: 'You rejected the transaction in your wallet.',
        action: null,
    },
    [AleoErrorType.TRANSACTION_FAILED]: {
        title: 'Transaction Failed',
        message: 'The transaction failed to execute. Please try again.',
        action: 'Retry Transaction',
    },
    [AleoErrorType.PROOF_GENERATION_FAILED]: {
        title: 'Proof Generation Failed',
        message: 'Failed to generate zero-knowledge proof. This may be due to insufficient resources.',
        action: 'Retry',
    },
    [AleoErrorType.INSUFFICIENT_BALANCE]: {
        title: 'Insufficient Balance',
        message: 'You don\'t have enough balance to complete this transaction.',
        action: 'View Balance',
    },
    [AleoErrorType.NETWORK_ERROR]: {
        title: 'Network Error',
        message: 'Failed to connect to Aleo network. Please check your internet connection.',
        action: 'Retry',
    },
    [AleoErrorType.BRIDGE_ERROR]: {
        title: 'Bridge Error',
        message: 'Cross-chain bridge operation failed. Please try again later.',
        action: 'Retry',
    },
    [AleoErrorType.PRIVACY_VIOLATION]: {
        title: 'Privacy Violation Detected',
        message: 'This operation would compromise your privacy. Please review and try again.',
        action: 'Review',
    },
    [AleoErrorType.SMART_CONTRACT_ERROR]: {
        title: 'Smart Contract Error',
        message: 'The smart contract execution failed. Please check your inputs and try again.',
        action: 'Review Inputs',
    },
    [AleoErrorType.VALIDATION_ERROR]: {
        title: 'Validation Error',
        message: 'Please check your inputs and try again.',
        action: null,
    },
    [AleoErrorType.TIMEOUT_ERROR]: {
        title: 'Request Timeout',
        message: 'The request took too long to complete. Please try again.',
        action: 'Retry',
    },
    [AleoErrorType.UNKNOWN_ERROR]: {
        title: 'Unknown Error',
        message: 'An unexpected error occurred. Please try again.',
        action: 'Retry',
    },
};

/**
 * Parse error and determine type
 */
export function parseAleoError(error) {
    if (error instanceof AleoError) {
        return error;
    }

    const errorMessage = error?.message?.toLowerCase() || '';

    // Wallet errors
    if (errorMessage.includes('wallet') && errorMessage.includes('not connected')) {
        return new AleoError(AleoErrorType.WALLET_NOT_CONNECTED, error.message);
    }
    if (errorMessage.includes('user rejected') || errorMessage.includes('user denied')) {
        return new AleoError(AleoErrorType.TRANSACTION_REJECTED, error.message);
    }

    // Proof errors
    if (errorMessage.includes('proof') || errorMessage.includes('zk')) {
        return new AleoError(AleoErrorType.PROOF_GENERATION_FAILED, error.message);
    }

    // Balance errors
    if (errorMessage.includes('insufficient') || errorMessage.includes('balance')) {
        return new AleoError(AleoErrorType.INSUFFICIENT_BALANCE, error.message);
    }

    // Network errors
    if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        return new AleoError(AleoErrorType.NETWORK_ERROR, error.message);
    }

    // Bridge errors
    if (errorMessage.includes('bridge')) {
        return new AleoError(AleoErrorType.BRIDGE_ERROR, error.message);
    }

    // Timeout errors
    if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        return new AleoError(AleoErrorType.TIMEOUT_ERROR, error.message);
    }

    // Smart contract errors
    if (errorMessage.includes('contract') || errorMessage.includes('execution')) {
        return new AleoError(AleoErrorType.SMART_CONTRACT_ERROR, error.message);
    }

    // Default to unknown error
    return new AleoError(AleoErrorType.UNKNOWN_ERROR, error.message);
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error) {
    const aleoError = parseAleoError(error);
    return ERROR_MESSAGES[aleoError.type] || ERROR_MESSAGES[AleoErrorType.UNKNOWN_ERROR];
}

/**
 * Handle error with toast notification
 */
export function handleAleoError(error, context = '') {
    const aleoError = parseAleoError(error);
    const errorInfo = getErrorMessage(aleoError);

    console.error(`[AleoError${context ? ` - ${context}` : ''}]`, aleoError.toJSON());

    toast.error(
        (t) => (
            <div className="flex flex-col gap-2">
                <div className="font-bold">{errorInfo.title}</div>
                <div className="text-sm">{errorInfo.message}</div>
                {errorInfo.action && (
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            // Handle action
                        }}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 text-left"
                    >
                        {errorInfo.action} →
                    </button>
                )}
            </div>
        ),
        {
            duration: 5000,
            icon: '⚠️',
        }
    );

    return aleoError;
}

/**
 * Retry wrapper with error handling
 */
export async function withRetry(
    operation,
    maxAttempts = 3,
    onError = null
) {
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            console.error(`[Retry] Attempt ${attempt}/${maxAttempts} failed:`, error);

            if (onError) {
                const shouldContinue = await onError(error, attempt, maxAttempts);
                if (!shouldContinue) break;
            }

            if (attempt < maxAttempts) {
                // Exponential backoff
                const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    throw lastError;
}

/**
 * ZK Proof Generation Error Handler
 */
export class ProofErrorHandler {
    static async handleProofError(error, context) {
        const aleoError = parseAleoError(error);

        // Log detailed error
        console.error('[ProofError]', {
            context,
            error: aleoError.toJSON(),
            timestamp: Date.now(),
        });

        // Check if it's a resource issue
        if (error.message?.includes('memory') || error.message?.includes('resource')) {
            toast.error(
                'Proof generation requires more resources. Try closing other tabs or using a more powerful device.',
                { duration: 7000 }
            );
            return;
        }

        // Check if it's an input issue
        if (error.message?.includes('input') || error.message?.includes('invalid')) {
            toast.error(
                'Invalid inputs for proof generation. Please check your transaction details.',
                { duration: 5000 }
            );
            return;
        }

        // Generic proof error
        handleAleoError(error, 'Proof Generation');
    }

    static async retryProofGeneration(proofFn, maxAttempts = 3) {
        return withRetry(
            proofFn,
            maxAttempts,
            async (error, attempt, max) => {
                if (attempt < max) {
                    toast.loading(`Retrying proof generation (${attempt}/${max})...`, {
                        id: 'proof-retry',
                    });
                    return true;
                }
                toast.dismiss('proof-retry');
                return false;
            }
        );
    }
}

/**
 * Bridge Error Handler
 */
export class BridgeErrorHandler {
    static async handleBridgeError(error, sourceChain, targetChain) {
        const aleoError = parseAleoError(error);

        console.error('[BridgeError]', {
            sourceChain,
            targetChain,
            error: aleoError.toJSON(),
        });

        // Check for specific bridge errors
        if (error.message?.includes('reserve')) {
            toast.error(
                `Insufficient reserves on ${targetChain} bridge. Please try again later.`,
                { duration: 7000 }
            );
            return;
        }

        if (error.message?.includes('proof')) {
            toast.error(
                'Bridge proof verification failed. Please ensure your transaction is valid.',
                { duration: 6000 }
            );
            return;
        }

        handleAleoError(error, `Bridge ${sourceChain} → ${targetChain}`);
    }

    static trackBridgeStatus(txId, onUpdate) {
        // This would track actual bridge transaction status
        console.debug('[BridgeTracker] Tracking bridge transaction:', txId);

        // Simulated status updates
        const statuses = ['pending', 'confirming', 'bridging', 'complete'];
        let currentStatus = 0;

        const interval = setInterval(() => {
            if (currentStatus < statuses.length) {
                onUpdate(statuses[currentStatus]);
                currentStatus++;
            } else {
                clearInterval(interval);
            }
        }, 5000);

        return () => clearInterval(interval);
    }
}

/**
 * Privacy Violation Handler
 */
export class PrivacyViolationHandler {
    static detectPrivacyViolation(operation, context) {
        // Check for potential privacy violations
        const violations = [];

        // Example checks
        if (context.publicMode && context.sensitiveData) {
            violations.push({
                type: 'PUBLIC_SENSITIVE_DATA',
                message: 'Sensitive data would be exposed in public mode',
            });
        }

        if (context.viewKeyShared && !context.authorized) {
            violations.push({
                type: 'UNAUTHORIZED_VIEW_KEY',
                message: 'View key sharing with unauthorized party',
            });
        }

        return violations;
    }

    static handleViolation(violations) {
        if (violations.length === 0) return true;

        const violationMessages = violations.map(v => v.message).join(', ');

        toast.error(
            (t) => (
                <div className="flex flex-col gap-2">
                    <div className="font-bold">Privacy Violation Detected</div>
                    <div className="text-sm">{violationMessages}</div>
                    <div className="text-xs text-gray-600">
                        Enable privacy mode to protect your data.
                    </div>
                </div>
            ),
            { duration: 7000, icon: '🔒' }
        );

        return false;
    }
}

/**
 * Smart Contract Error Handler
 */
export class SmartContractErrorHandler {
    static parseContractError(error) {
        const errorMessage = error?.message || '';

        // Common contract errors
        if (errorMessage.includes('revert')) {
            const reason = errorMessage.match(/reason: (.+)/)?.[1];
            return {
                type: 'REVERT',
                reason: reason || 'Transaction reverted',
            };
        }

        if (errorMessage.includes('out of gas')) {
            return {
                type: 'OUT_OF_GAS',
                reason: 'Transaction ran out of gas',
            };
        }

        if (errorMessage.includes('nonce')) {
            return {
                type: 'NONCE_ERROR',
                reason: 'Transaction nonce mismatch',
            };
        }

        return {
            type: 'UNKNOWN',
            reason: errorMessage,
        };
    }

    static handleContractError(error, contractName) {
        const parsed = this.parseContractError(error);

        console.error('[ContractError]', {
            contract: contractName,
            ...parsed,
        });

        let userMessage = parsed.reason;

        // Provide user-friendly messages
        if (parsed.type === 'REVERT') {
            userMessage = `Transaction failed: ${parsed.reason}`;
        } else if (parsed.type === 'OUT_OF_GAS') {
            userMessage = 'Transaction requires more gas. Please increase gas limit.';
        } else if (parsed.type === 'NONCE_ERROR') {
            userMessage = 'Transaction nonce error. Please try again.';
        }

        toast.error(userMessage, { duration: 6000 });
    }
}

/**
 * Global error boundary handler
 */
export function setupGlobalErrorHandler() {
    window.addEventListener('unhandledrejection', (event) => {
        console.error('[UnhandledRejection]', event.reason);

        if (event.reason?.name === 'AleoError') {
            handleAleoError(event.reason, 'Unhandled');
            event.preventDefault();
        }
    });

    window.addEventListener('error', (event) => {
        console.error('[GlobalError]', event.error);
    });
}
