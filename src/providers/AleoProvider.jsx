import React, { useMemo } from 'react';
import { WalletProvider } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletModalProvider } from '@demox-labs/aleo-wallet-adapter-reactui';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { DecryptPermission, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';

// Import default styles for wallet modal
import '@demox-labs/aleo-wallet-adapter-reactui/styles.css';

/**
 * Aleo Provider using official Aleo Wallet Adapter
 * Supports Leo Wallet and other Aleo wallets
 */
export default function AleoProvider({ children }) {
    const wallets = useMemo(
        () => [
            new LeoWalletAdapter({
                appName: 'PrivatePay',
                decryptPermission: DecryptPermission.UponRequest,
                // Use TestnetBeta to match Leo Wallet's current network
                network: WalletAdapterNetwork.TestnetBeta,
            }),
        ],
        []
    );

    return (
        <WalletProvider
            wallets={wallets}
            autoConnect={false}
        >
            <WalletModalProvider>
                {children}
            </WalletModalProvider>
        </WalletProvider>
    );
}
