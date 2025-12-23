import { ChainProvider } from '@cosmos-kit/react';
import { default as osmosisChain } from '@chain-registry/osmosis/chain';
import { default as osmosisAssets } from '@chain-registry/osmosis/assets';
import { wallets as keplrWallets } from '@cosmos-kit/keplr';
import { wallets as leapWallets } from '@cosmos-kit/leap';
import '@interchain-ui/react/styles';

const supportedChains = [osmosisChain];
const supportedAssets = [osmosisAssets];

// CORS-friendly RPC endpoints for Osmosis
const OSMOSIS_RPC = import.meta.env.VITE_OSMOSIS_RPC_URL || 'https://rpc.osmosis.zone';
const OSMOSIS_REST = import.meta.env.VITE_OSMOSIS_LCD_URL || 'https://lcd.osmosis.zone';

export function CosmosProvider({ children }) {
  return (
    <ChainProvider
      chains={supportedChains}
      assetLists={supportedAssets}
      wallets={[...keplrWallets, ...leapWallets]}
      walletConnectOptions={{
        signClient: {
          projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '2f05a7cde26d53d5928cd7e61b67c751',
          relayUrl: 'wss://relay.walletconnect.org',
          metadata: {
            name: 'PrivatePay',
            description: 'Privacy-focused payments on Osmosis with stealth addresses',
            url: `https://${import.meta.env.VITE_WEBSITE_HOST}`,
            icons: [`https://${import.meta.env.VITE_WEBSITE_HOST}/favicon.ico`],
          },
        },
      }}
      endpointOptions={{
        isLazy: true,
        endpoints: {
          osmosis: {
            rpc: [OSMOSIS_RPC],
            rest: [OSMOSIS_REST],
          },
        },
      }}
    >
      {children}
    </ChainProvider>
  );
}

// Export RPC endpoint for use in other components
export const getOsmosisRpcEndpoint = () => OSMOSIS_RPC;
export const getOsmosisRestEndpoint = () => OSMOSIS_REST;
