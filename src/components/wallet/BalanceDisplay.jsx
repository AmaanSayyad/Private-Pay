/**
 * Balance Display Component
 * 
 * Displays balance with privacy controls
 * Shows "* * *" when hidden (inspired by Unstoppable Wallet)
 */

import { Eye, EyeOff, TrendingUp, TrendingDown } from 'lucide-react';
import { usePrivacy } from '@/providers/PrivacyProvider';

export function BalanceDisplay({
    amount,
    currency = 'USD',
    label = 'Balance',
    decimals = 4,
    change = null,
    loading = false,
    className = '',
    onClickReveal = null,
}) {
    const { balanceHidden, toggleBalanceVisibility, formatBalance } = usePrivacy();
    
    const handleClick = () => {
        if (onClickReveal) {
            onClickReveal();
        } else {
            toggleBalanceVisibility();
        }
    };
    
    const displayValue = balanceHidden ? '* * *' : formatBalance(amount, decimals);
    
    return (
        <div className={`${className}`}>
            <div className="text-sm text-gray-400 mb-1">{label}</div>
            <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={handleClick}
                title={balanceHidden ? 'Click to reveal' : 'Click to hide'}
            >
                <div className="text-2xl font-bold">
                    {loading ? (
                        <div className="animate-pulse bg-gray-600 h-8 w-32 rounded" />
                    ) : (
                        <>
                            {!balanceHidden && currency && (
                                <span className="text-gray-400 text-lg mr-1">
                                    {currency === 'USD' ? '$' : currency}
                                </span>
                            )}
                            <span className={balanceHidden ? 'text-gray-500' : ''}>
                                {displayValue}
                            </span>
                        </>
                    )}
                </div>
                <button className="text-gray-400 hover:text-white transition-colors opacity-70 group-hover:opacity-100">
                    {balanceHidden ? (
                        <EyeOff className="w-5 h-5" />
                    ) : (
                        <Eye className="w-5 h-5" />
                    )}
                </button>
            </div>
            
            {/* Price change indicator */}
            {!balanceHidden && change !== null && !loading && (
                <div className={`flex items-center gap-1 mt-1 text-sm ${
                    change >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                    {change >= 0 ? (
                        <TrendingUp className="w-4 h-4" />
                    ) : (
                        <TrendingDown className="w-4 h-4" />
                    )}
                    <span>{Math.abs(change).toFixed(2)}%</span>
                </div>
            )}
        </div>
    );
}

/**
 * Compact Balance Display (for cards/lists)
 */
export function CompactBalanceDisplay({
    amount,
    currency = 'USD',
    decimals = 2,
    showCurrency = true,
    loading = false,
    className = '',
}) {
    const { balanceHidden, formatBalance } = usePrivacy();
    
    if (loading) {
        return (
            <div className={`animate-pulse bg-gray-600 h-5 w-20 rounded ${className}`} />
        );
    }
    
    const displayValue = formatBalance(amount, decimals);
    
    return (
        <div className={`text-sm font-medium ${className}`}>
            {!balanceHidden && showCurrency && currency && (
                <span className="text-gray-400 mr-0.5">
                    {currency === 'USD' ? '$' : currency + ' '}
                </span>
            )}
            <span className={balanceHidden ? 'text-gray-500' : ''}>
                {displayValue}
            </span>
        </div>
    );
}

