/**
 * Axelar Token Configuration
 * Custom ITS tokens deployed for testing
 */

// Environment configuration
const isMainnet = import.meta.env.VITE_NETWORK === "mainnet";

/**
 * TUSDC - Test USDC deployed via Axelar ITS
 * Same address on all chains (CREATE3 deployment)
 */
export const TUSDC_CONFIG = {
  symbol: "TUSDC",
  name: "Test USDC",
  decimals: 6,
  // Same address on all ITS-deployed chains
  address: "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B",
  tokenManagerAddress: "0x1e2f2E68ea65212Ec6F3D91f39E6B644fE41e29B",
  // Chains where TUSDC is deployed
  deployedChains: ["ethereum-sepolia", "base-sepolia"],
};

/**
 * ITS (Interchain Token Service) addresses
 * Official Axelar ITS contract - same on all chains
 */
export const ITS_ADDRESS = "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C";

/**
 * Custom tokens configuration for testnet
 */
export const CUSTOM_TOKENS = isMainnet ? {} : {
  TUSDC: TUSDC_CONFIG,
};

/**
 * Get token config by symbol
 */
export function getTokenConfig(symbol) {
  return CUSTOM_TOKENS[symbol] || null;
}

/**
 * Check if a token is an ITS token (vs GMP token)
 */
export function isITSToken(symbol) {
  return !!CUSTOM_TOKENS[symbol];
}

/**
 * Get token address for a specific chain
 * ITS tokens have the same address on all chains
 */
export function getTokenAddress(symbol, chainKey) {
  const config = CUSTOM_TOKENS[symbol];
  if (!config) return null;
  
  // ITS tokens have the same address on all deployed chains
  const axelarChainName = chainKey.includes("sepolia") ? chainKey : `${chainKey}-sepolia`;
  if (config.deployedChains.includes(axelarChainName) || config.deployedChains.includes(chainKey)) {
    return config.address;
  }
  return null;
}

export default {
  TUSDC_CONFIG,
  ITS_ADDRESS,
  CUSTOM_TOKENS,
  getTokenConfig,
  isITSToken,
  getTokenAddress,
};
