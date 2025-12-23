/**
 * Axelar Token Configuration
 * Custom ITS tokens deployed for testing
 */

// Environment configuration
const isMainnet = import.meta.env.VITE_NETWORK === "mainnet";

/**
 * TUSDC - Test USDC deployed on multiple chains
 * Chain-specific addresses for new deployments
 */
const TUSDC_ADDRESSES = {
  "base-sepolia": import.meta.env.VITE_AXELAR_TUSDC_ADDRESS_BASE_SEPOLIA || "0x2823Af7e1F2F50703eD9f81Ac4B23DC1E78B9E53",
  "arbitrum-sepolia": import.meta.env.VITE_AXELAR_TUSDC_ADDRESS_ARBITRUM_SEPOLIA || "0xd17beb0fE91B2aE5a57cE39D1c3D15AF1a968817",
  "ethereum-sepolia": "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B", // Old ITS token
};

export const TUSDC_CONFIG = {
  symbol: "TUSDC",
  name: "Test USDC",
  decimals: 6,
  // Chain-specific addresses
  getAddress: (chainKey) => {
    const chainName = chainKey?.includes("sepolia") ? chainKey : `${chainKey}-sepolia`;
    return TUSDC_ADDRESSES[chainName] || TUSDC_ADDRESSES["ethereum-sepolia"] || "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B";
  },
  // Legacy: same address for old ITS token (for backward compatibility)
  address: "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B",
  tokenManagerAddress: "0x1e2f2E68ea65212Ec6F3D91f39E6B644fE41e29B",
  // Chains where TUSDC is deployed
  deployedChains: ["ethereum-sepolia", "base-sepolia", "arbitrum-sepolia"],
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
 * Supports chain-specific addresses for new TUSDC deployments
 */
export function getTokenAddress(symbol, chainKey) {
  const config = CUSTOM_TOKENS[symbol];
  if (!config) return null;
  
  // Check if chain is supported
  const axelarChainName = chainKey.includes("sepolia") ? chainKey : `${chainKey}-sepolia`;
  if (!config.deployedChains.includes(axelarChainName) && !config.deployedChains.includes(chainKey)) {
    return null;
  }
  
  // Use getAddress function if available (for chain-specific addresses)
  if (typeof config.getAddress === 'function') {
    return config.getAddress(chainKey);
  }
  
  // Fallback to static address
  return config.address;
}

export default {
  TUSDC_CONFIG,
  ITS_ADDRESS,
  CUSTOM_TOKENS,
  getTokenConfig,
  isITSToken,
  getTokenAddress,
};
