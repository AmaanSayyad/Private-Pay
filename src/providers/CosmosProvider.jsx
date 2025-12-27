import { ChainProvider } from '@cosmos-kit/react';
import { default as osmosisChain } from '@chain-registry/osmosis/chain';
import { default as osmosisAssets } from '@chain-registry/osmosis/assets';
import { wallets as keplrWallets } from '@cosmos-kit/keplr';
import { wallets as leapWallets } from '@cosmos-kit/leap';
import '@interchain-ui/react/styles';

// Osmosis Testnet chain config
const osmosisTestnet = {
  ...osmosisChain,
  chain_id: 'osmo-test-5',
  chain_name: 'osmosistestnet',
  pretty_name: 'Osmosis Testnet',
  network_type: 'testnet',
  apis: {
    rpc: [{ address: 'https://rpc.testnet.osmosis.zone' }],
    rest: [{ address: 'https://lcd.testnet.osmosis.zone' }],
  },
};

// Osmosis Testnet assets config
const osmosisTestnetAssets = {
  ...osmosisAssets,
  chain_name: 'osmosistestnet',
  assets: [
    {
      description: 'The native token of Osmosis',
      denom_units: [
        {
          denom: 'uosmo',
          exponent: 0,
        },
        {
          denom: 'osmo',
          exponent: 6,
        },
      ],
      base: 'uosmo',
      name: 'Osmosis',
      display: 'osmo',
      symbol: 'OSMO',
      logo_URIs: {
        png: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.png',
        svg: 'https://raw.githubusercontent.com/cosmos/chain-registry/master/osmosis/images/osmo.svg',
      },
      coingecko_id: 'osmosis',
    },
  ],
};

// Use testnet for development, mainnet for production
const isTestnet = import.meta.env.VITE_OSMOSIS_CHAIN_ID === 'osmo-test-5';
const supportedChains = isTestnet ? [osmosisTestnet] : [osmosisChain];
const supportedAssets = isTestnet ? [osmosisTestnetAssets] : [osmosisAssets];

// Osmosis Testnet (osmo-test-5) endpoints for testing
// Switch to mainnet by changing these to rpc.osmosis.zone / lcd.osmosis.zone
const OSMOSIS_RPC = import.meta.env.VITE_OSMOSIS_RPC_URL || 'https://rpc.testnet.osmosis.zone';
const OSMOSIS_REST = import.meta.env.VITE_OSMOSIS_LCD_URL || 'https://lcd.testnet.osmosis.zone';

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
          osmosistestnet: {
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
