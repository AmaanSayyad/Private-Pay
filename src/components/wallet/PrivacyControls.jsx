/**
 * Privacy Controls Component
 * 
 * Global privacy toggles inspired by Unstoppable Wallet
 * Provides UI for balance hiding, auto-hide, and privacy mode
 */

import { Eye, EyeOff, Shield, Lock } from 'lucide-react';
import { usePrivacy } from '@/providers/PrivacyProvider';

export function PrivacyControls({ className = '' }) {
    const {
        balanceHidden,
        autoHideEnabled,
        privacyMode,
        toggleBalanceVisibility,
        toggleAutoHide,
        togglePrivacyMode,
    } = usePrivacy();
    
    return (
        <div className={`flex flex-col gap-3 ${className}`}>
            {/* Balance Visibility Toggle */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                    {balanceHidden ? (
                        <EyeOff className="w-4 h-4 text-gray-400" />
                    ) : (
                        <Eye className="w-4 h-4 text-blue-400" />
                    )}
                    <div>
                        <div className="text-sm font-medium">
                            {balanceHidden ? 'Balances Hidden' : 'Balances Visible'}
                        </div>
                        <div className="text-xs text-gray-400">
                            Click to {balanceHidden ? 'reveal' : 'hide'} all balances
                        </div>
                    </div>
                </div>
                <button
                    onClick={toggleBalanceVisibility}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        balanceHidden ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            balanceHidden ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>
            
            {/* Auto-Hide Toggle */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <div>
                        <div className="text-sm font-medium">Auto-Hide</div>
                        <div className="text-xs text-gray-400">
                            Hide balances when app goes to background
                        </div>
                    </div>
                </div>
                <button
                    onClick={toggleAutoHide}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        autoHideEnabled ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            autoHideEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>
            
            {/* Privacy Mode Toggle */}
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-gray-400" />
                    <div>
                        <div className="text-sm font-medium">Privacy Mode</div>
                        <div className="text-xs text-gray-400">
                            Mask addresses and enable enhanced privacy
                        </div>
                    </div>
                </div>
                <button
                    onClick={togglePrivacyMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        privacyMode ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            privacyMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                </button>
            </div>
        </div>
    );
}

/**
 * Compact Privacy Toggle (for headers/navbars)
 */
export function CompactPrivacyToggle({ className = '' }) {
    const { balanceHidden, toggleBalanceVisibility } = usePrivacy();
    
    return (
        <button
            onClick={toggleBalanceVisibility}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                balanceHidden
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
            } ${className}`}
            title={balanceHidden ? 'Show balances' : 'Hide balances'}
        >
            {balanceHidden ? (
                <EyeOff className="w-5 h-5" />
            ) : (
                <Eye className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">
                {balanceHidden ? 'Privacy ON' : 'Privacy OFF'}
            </span>
        </button>
    );
}

