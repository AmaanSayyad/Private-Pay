import React from 'react';
import { useChain } from '@cosmos-kit/react';

// Check if testnet
const isTestnet = import.meta.env.VITE_OSMOSIS_CHAIN_ID === 'osmo-test-5';
const chainName = isTestnet ? 'osmosistestnet' : 'osmosis';

export function CosmosWalletButton() {
  const { status, username, address, connect, disconnect, wallet } = useChain(chainName);

  if (status === 'Connected') {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-200">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-emerald-700 text-sm font-medium">Connected</span>
        </div>
        <div className="text-xs text-gray-600 font-mono bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
          {address ? `${address.slice(0, 8)}...${address.slice(-6)}` : ''}
        </div>
        <button
          onClick={disconnect}
          className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors border border-red-200"
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (status === 'Connecting') {
    return (
      <button
        disabled
        className="px-6 py-2.5 text-sm font-semibold text-white bg-gray-400 rounded-xl cursor-not-allowed"
      >
        Connecting...
      </button>
    );
  }

  return (
    <button
      onClick={() => connect()}
      className="px-6 py-2.5 text-sm font-semibold text-white bg-[#0d08e3] rounded-xl hover:bg-[#0e0dc6] focus:outline-none focus:ring-2 focus:ring-[#0d08e3] focus:ring-offset-2 transition-all shadow-md hover:shadow-lg"
    >
      Connect Wallet
    </button>
  );
}
