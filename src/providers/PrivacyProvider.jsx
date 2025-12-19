/**
 * Privacy Provider
 * 
 * Global privacy controls inspired by Unstoppable Wallet's BalanceHiddenManager
 * Manages balance visibility, auto-hide, and privacy settings across all wallets
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';

const PrivacyContext = createContext({});

export const usePrivacy = () => useContext(PrivacyContext);

export default function PrivacyProvider({ children }) {
    // Core privacy states (inspired by BalanceHiddenManager.kt)
    const [balanceHidden, setBalanceHidden] = useState(() => {
        return localStorage.getItem('balance_hidden') === 'true';
    });
    
    const [autoHideEnabled, setAutoHideEnabled] = useState(() => {
        return localStorage.getItem('auto_hide_enabled') === 'true';
    });
    
    const [privacyMode, setPrivacyMode] = useState(() => {
        return localStorage.getItem('privacy_mode') === 'true';
    });
    
    // Auto-hide on background/blur (for mobile/PWA)
    useEffect(() => {
        if (!autoHideEnabled) return;
        
        const handleVisibilityChange = () => {
            if (document.hidden) {
                setBalanceHidden(true);
                localStorage.setItem('balance_hidden', 'true');
            }
        };
        
        const handleBlur = () => {
            if (autoHideEnabled) {
                setBalanceHidden(true);
                localStorage.setItem('balance_hidden', 'true');
            }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, [autoHideEnabled]);
    
    // Initialize auto-hide if enabled (from Unstoppable pattern)
    useEffect(() => {
        if (autoHideEnabled) {
            setBalanceHidden(true);
        }
    }, []); // Only on mount
    
    /**
     * Toggle balance visibility
     * Inspired by BalanceHiddenManager.toggleBalanceHidden()
     */
    const toggleBalanceVisibility = useCallback(() => {
        setBalanceHidden(prev => {
            const newValue = !prev;
            localStorage.setItem('balance_hidden', String(newValue));
            return newValue;
        });
    }, []);
    
    /**
     * Set balance visibility explicitly
     * @param {boolean} hidden - Whether to hide balances
     */
    const setBalanceVisibility = useCallback((hidden) => {
        setBalanceHidden(hidden);
        localStorage.setItem('balance_hidden', String(hidden));
    }, []);
    
    /**
     * Toggle auto-hide on background
     * Inspired by BalanceHiddenManager.setBalanceAutoHidden()
     */
    const toggleAutoHide = useCallback(() => {
        setAutoHideEnabled(prev => {
            const newValue = !prev;
            localStorage.setItem('auto_hide_enabled', String(newValue));
            
            // If enabling auto-hide, immediately hide balance
            if (newValue) {
                setBalanceHidden(true);
                localStorage.setItem('balance_hidden', 'true');
            }
            
            return newValue;
        });
    }, []);
    
    /**
     * Set auto-hide explicitly
     * @param {boolean} enabled - Whether to enable auto-hide
     */
    const setAutoHide = useCallback((enabled) => {
        setAutoHideEnabled(enabled);
        localStorage.setItem('auto_hide_enabled', String(enabled));
        
        if (enabled) {
            setBalanceHidden(true);
            localStorage.setItem('balance_hidden', 'true');
        }
    }, []);
    
    /**
     * Toggle global privacy mode
     * (Extended feature for additional privacy)
     */
    const togglePrivacyMode = useCallback(() => {
        setPrivacyMode(prev => {
            const newValue = !prev;
            localStorage.setItem('privacy_mode', String(newValue));
            
            // Privacy mode enables balance hiding
            if (newValue) {
                setBalanceHidden(true);
                localStorage.setItem('balance_hidden', 'true');
            }
            
            return newValue;
        });
    }, []);
    
    /**
     * Format balance for display based on privacy settings
     * Returns "* * *" if hidden (pattern from Unstoppable's TokenBalanceScreen.kt)
     */
    const formatBalance = useCallback((balance, decimals = 4) => {
        if (balanceHidden) {
            return '* * *';
        }
        
        if (balance === null || balance === undefined) {
            return '---';
        }
        
        return Number(balance).toFixed(decimals);
    }, [balanceHidden]);
    
    /**
     * Format address for display (show only first and last few chars if privacy mode)
     */
    const formatAddress = useCallback((address, firstChars = 6, lastChars = 4) => {
        if (!address) return '';
        
        if (privacyMode && address.length > (firstChars + lastChars + 3)) {
            return `${address.slice(0, firstChars)}...${address.slice(-lastChars)}`;
        }
        
        return address;
    }, [privacyMode]);
    
    /**
     * Get masked string (for sensitive data)
     */
    const maskSensitive = useCallback((value) => {
        if (balanceHidden || privacyMode) {
            return '* * * * *';
        }
        return value;
    }, [balanceHidden, privacyMode]);
    
    /**
     * Reset all privacy settings
     */
    const resetPrivacySettings = useCallback(() => {
        setBalanceHidden(false);
        setAutoHideEnabled(false);
        setPrivacyMode(false);
        localStorage.setItem('balance_hidden', 'false');
        localStorage.setItem('auto_hide_enabled', 'false');
        localStorage.setItem('privacy_mode', 'false');
        toast.success('Privacy settings reset');
    }, []);
    
    const value = {
        // State
        balanceHidden,
        autoHideEnabled,
        privacyMode,
        
        // Actions
        toggleBalanceVisibility,
        setBalanceVisibility,
        toggleAutoHide,
        setAutoHide,
        togglePrivacyMode,
        
        // Formatters
        formatBalance,
        formatAddress,
        maskSensitive,
        
        // Utilities
        resetPrivacySettings,
    };
    
    return (
        <PrivacyContext.Provider value={value}>
            {children}
        </PrivacyContext.Provider>
    );
}

