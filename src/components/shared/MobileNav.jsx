/**
 * Mobile Navigation Component
 * 
 * Bottom navigation bar for mobile devices
 * Inspired by Unstoppable Wallet's mobile-first design
 */

import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeftRight, Send,   LayoutGrid } from 'lucide-react';

export function MobileNav() {
    const navigate = useNavigate();
    const location = useLocation();
    
    const navItems = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: <LayoutGrid className="w-5 h-5" />,
            path: '/',
        },
        // {
        //     id: 'wallets',
        //     label: 'Wallets',
        //     icon: <Wallet className="w-5 h-5" />,
        //     path: '/wallets',
        // },
        {
            id: 'swap',
            label: 'Swap',
            icon: <ArrowLeftRight className="w-5 h-5" />,
            path: '/arcium/swap',
        },
        {
            id: 'send',
            label: 'Send',
            icon: <Send className="w-5 h-5" />,
            path: '/send',
        },
        // {
        //     id: 'settings',
        //     label: 'Settings',
        //     icon: <Settings className="w-5 h-5" />,
        //     path: '/settings',
        // },
    ];
    
    const isActive = (path) => {
        if (path === '/') {
            return location.pathname === '/';
        }
        return location.pathname.startsWith(path);
    };
    
    return (
        <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-black/90 backdrop-blur-lg border-t border-white/10 safe-area-inset-bottom z-50">
            <div className="flex items-center justify-around py-2 px-2">
                {navItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => navigate(item.path)}
                        className={`flex flex-col items-center gap-1 py-2 px-3 rounded-lg transition-colors min-w-[60px] ${
                            isActive(item.path)
                                ? 'text-blue-400 bg-blue-500/10'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        {item.icon}
                        <span className="text-xs font-medium">{item.label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
}

/**
 * Mobile-friendly page wrapper with bottom padding for nav
 */
export function MobilePageWrapper({ children, className = '' }) {
    return (
        <div className={`pb-20 md:pb-0 ${className}`}>
            {children}
            <MobileNav />
        </div>
    );
}

