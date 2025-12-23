/**
 * Axelar Network Integration for PrivatePay
 * Cross-chain privacy payments via General Message Passing (GMP)
 * 
 * NOTE: Using direct REST API calls instead of AxelarJS SDK
 * because the SDK requires ethers v5, but PrivatePay uses ethers v6
 * 
 * API Documentation: https://docs.axelarscan.io/gmp
 */

// Environment configuration
const isMainnet = import.meta.env.VITE_NETWORK === "mainnet";

// API timeout in milliseconds
const API_TIMEOUT = 30000;

/**
 * Fetch with timeout to prevent hanging requests
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, timeout = API_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Axelar REST API endpoints (no SDK dependency)
const AXELAR_GMP_API = isMainnet
  ? "https://api.gmp.axelarscan.io"
  : "https://testnet.api.gmp.axelarscan.io";

const AXELARSCAN_API = isMainnet
  ? "https://api.axelarscan.io"
  : "https://testnet.api.axelarscan.io";

// Gas token symbols for API calls
const GAS_TOKENS = {
  ETH: "ETH",
  MATIC: "MATIC",
  AVAX: "AVAX",
  BNB: "BNB",
  ROSE: "ROSE",
  FTM: "FTM",
  GLMR: "GLMR",
  DEV: "DEV",
  KAVA: "KAVA",
  FIL: "FIL",
  MNT: "MNT",
  FLOW: "FLOW",
  HBAR: "HBAR",
  IMX: "IMX",
  CFG: "CFG",
};

// Axelar Chain Configuration
export const AXELAR_CHAINS = {
  ethereum: {
    name: "Ethereum",
    axelarName: isMainnet ? "Ethereum" : "ethereum-sepolia",
    chainId: isMainnet ? 1 : 11155111,
    // Official Axelar addresses from: https://github.com/axelarnetwork/axelar-contract-deployments
    gateway: isMainnet
      ? "0x4F4495243837681061C4743b74B3eEdf548D56A5"
      : "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://ethereum-rpc.publicnode.com"
      : "https://sepolia.drpc.org",
    explorer: isMainnet
      ? "https://etherscan.io"
      : "https://sepolia.etherscan.io",
    tokens: isMainnet ? ["axlUSDC", "WETH", "USDC", "aUSDC"] : ["TUSDC", "aUSDC", "axlUSDC", "WETH"], // TUSDC = Test token at 0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B
    icon: "/chains/ethereum.svg",
    gasToken: GAS_TOKENS.ETH,
    color: "#627EEA",
    stealthBridge: isMainnet ? "" : "0x04ab5fA40Df5bF1B5e9E640b5D24C740ec5DfDeE",
  },
  polygon: {
    name: "Polygon",
    // Axelar uses "polygon-sepolia" for Polygon testnet
    axelarName: isMainnet ? "Polygon" : "polygon-sepolia",
    chainId: isMainnet ? 137 : 80002,
    // Source: Axelar contract deployments + testnet resources
    gateway: isMainnet
      ? "0xe432150cce91c13a887f7D836923d5597adD8E31"
      : "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://polygon-rpc.com"
      : "https://rpc-amoy.polygon.technology",
    explorer: isMainnet
      ? "https://polygonscan.com"
      : "https://amoy.polygonscan.com",
    tokens: ["TUSDC", "WMATIC", "USDC", "aUSDC"], // TUSDC available on Base
    icon: "/chains/polygon.svg",
    gasToken: GAS_TOKENS.MATIC,
    color: "#8247E5",
  },
  avalanche: {
    name: "Avalanche",
    // Per Axelar testnet.json: axelarId is "Avalanche" (capitalized) for both mainnet and testnet
    axelarName: "Avalanche",
    chainId: isMainnet ? 43114 : 43113,
    // Official Axelar addresses from: https://github.com/axelarnetwork/axelar-contract-deployments
    gateway: isMainnet
      ? "0x5029C0EFf6C34351a0CEc334542cDb22c7928f78"
      : "0xC249632c2D40b9001FE907806902f63038B737Ab",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://api.avax.network/ext/bc/C/rpc"
      : "https://api.avax-test.network/ext/bc/C/rpc",
    explorer: isMainnet
      ? "https://snowtrace.io"
      : "https://testnet.snowtrace.io",
    tokens: ["axlUSDC", "WAVAX", "USDC", "aUSDC"],
    icon: "/chains/avalanche.svg",
    gasToken: GAS_TOKENS.AVAX,
    color: "#E84142",
  },
  arbitrum: {
    name: "Arbitrum",
    axelarName: isMainnet ? "Arbitrum" : "arbitrum-sepolia",
    chainId: isMainnet ? 42161 : 421614,
    // Official Axelar addresses from: https://github.com/axelarnetwork/axelar-contract-deployments
    gateway: isMainnet
      ? "0xe432150cce91c13a887f7D836923d5597adD8E31"
      : "0xe1cE95479C84e9809269227C7F8524aE051Ae77a",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://arb1.arbitrum.io/rpc"
      : "https://sepolia-rollup.arbitrum.io/rpc",
    explorer: isMainnet ? "https://arbiscan.io" : "https://sepolia.arbiscan.io",
    tokens: ["axlUSDC", "WETH", "USDC", "aUSDC"],
    icon: "/chains/arbitrum.svg",
    gasToken: GAS_TOKENS.ETH,
    color: "#28A0F0",
    stealthBridge: isMainnet ? "" : (import.meta.env.VITE_AXELAR_BRIDGE_ADDRESS_ARBITRUM_SEPOLIA || import.meta.env.VITE_AXELAR_BRIDGE_ADDRESS || ""),
  },
  optimism: {
    name: "Optimism",
    axelarName: isMainnet ? "Optimism" : "optimism-sepolia",
    chainId: isMainnet ? 10 : 11155420,
    // Official Axelar addresses from: https://github.com/axelarnetwork/axelar-contract-deployments
    gateway: isMainnet
      ? "0xe432150cce91c13a887f7D836923d5597adD8E31"
      : "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://mainnet.optimism.io"
      : "https://sepolia.optimism.io",
    explorer: isMainnet
      ? "https://optimistic.etherscan.io"
      : "https://sepolia-optimism.etherscan.io",
    tokens: ["axlUSDC", "WETH", "USDC", "aUSDC"],
    icon: "/chains/optimism.svg",
    gasToken: GAS_TOKENS.ETH,
    color: "#FF0420",
  },
  base: {
    name: "Base",
    axelarName: isMainnet ? "Base" : "base-sepolia",
    chainId: isMainnet ? 8453 : 84532,
    // Official Axelar addresses from: https://github.com/axelarnetwork/axelar-contract-deployments
    gateway: isMainnet
      ? "0xe432150cce91c13a887f7D836923d5597adD8E31"
      : "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet ? "https://mainnet.base.org" : "https://sepolia.base.org",
    explorer: isMainnet
      ? "https://basescan.org"
      : "https://sepolia.basescan.org",
    tokens: isMainnet ? ["axlUSDC", "WETH", "USDC", "aUSDC"] : ["aUSDC", "axlUSDC", "WETH"], // TUSDC not deployed on Base yet
    icon: "/chains/base.svg",
    gasToken: GAS_TOKENS.ETH,
    stealthBridge: isMainnet ? "" : (import.meta.env.VITE_AXELAR_BRIDGE_ADDRESS_BASE_SEPOLIA || import.meta.env.VITE_AXELAR_BRIDGE_ADDRESS || ""),
    color: "#0052FF",
    stealthBridge: isMainnet ? "" : "0xE09f184968cdAD4D0B94e2968Cfbf1395FB66D79",
  },
  oasis: {
    name: "Oasis Sapphire",
    // Note: Oasis uses lowercase even on mainnet per Axelar docs
    axelarName: isMainnet ? "oasis" : "oasis",
    chainId: isMainnet ? 23294 : 23295,
    gateway: "0x9B36f165baB9ebe611d491180418d8De4b8f3a1f",
    gasService: "0x2d5d7d31F671F86C782533cc367F14109a082712",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://sapphire.oasis.io"
      : "https://testnet.sapphire.oasis.io",
    explorer: isMainnet
      ? "https://explorer.oasis.io/mainnet/sapphire"
      : "https://explorer.oasis.io/testnet/sapphire",
    tokens: ["axlUSDC", "USDC", "USDT"],
    icon: "/chains/oasis.svg",
    gasToken: GAS_TOKENS.ROSE,
    color: "#0092F6",
    isConfidential: true,
  },
  bnb: {
    name: "BNB Chain",
    // Note: BNB uses "binance" on both mainnet and testnet per Axelar docs
    axelarName: isMainnet ? "binance" : "binance",
    chainId: isMainnet ? 56 : 97,
    // Official Axelar addresses from: https://github.com/axelarnetwork/axelar-contract-deployments
    gateway: isMainnet
      ? "0x304acf330bbE08d1e512eefaa92F6a57871fD895"
      : "0x4D147dCb984e6affEEC47e44293DA442580A3Ec0",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://bsc-dataseed.binance.org"
      : "https://bsc-testnet-rpc.publicnode.com",
    explorer: isMainnet ? "https://bscscan.com" : "https://testnet.bscscan.com",
    tokens: ["axlUSDC", "WBNB", "USDC", "aUSDC"],
    icon: "/chains/bnb.svg",
    gasToken: GAS_TOKENS.BNB,
    color: "#F0B90B",
  },
  fantom: {
    name: "Fantom",
    // Per Axelar testnet.json: axelarId is "Fantom" (capitalized) for both mainnet and testnet
    axelarName: "Fantom",
    chainId: isMainnet ? 250 : 4002,
    gateway: isMainnet
      ? "0x304acf330bbE08d1e512eefaa92F6a57871fD895"
      : "0x97837985Ec0494E7b9C71f5D3f9250188477ae14",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://rpcapi.fantom.network"
      : "https://rpc.testnet.fantom.network",
    explorer: isMainnet ? "https://ftmscan.com" : "https://testnet.ftmscan.com",
    tokens: ["axlUSDC", "WFTM", "USDC"],
    icon: "/chains/fantom.svg",
    gasToken: GAS_TOKENS.FTM,
    color: "#1969FF",
  },
  moonbeam: {
    name: "Moonbeam",
    axelarName: isMainnet ? "moonbeam" : "moonbeam",
    chainId: isMainnet ? 1284 : 1287,
    gateway: isMainnet
      ? "0x4F4495243837681061C4743b74B3eEdf548D56A5"
      : "0x5769D84DD62a6fD969856c75c7D321b84d455929",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://rpc.api.moonbeam.network"
      : "https://rpc.api.moonbase.moonbeam.network",
    explorer: isMainnet ? "https://moonscan.io" : "https://moonbase.moonscan.io",
    tokens: ["axlUSDC", "WGLMR", "USDC"],
    icon: "/chains/moonbeam.svg",
    gasToken: GAS_TOKENS.DEV,
    color: "#53CBC9",
  },
  linea: {
    name: "Linea",
    axelarName: isMainnet ? "linea" : "linea-sepolia",
    chainId: isMainnet ? 59144 : 59141,
    gateway: isMainnet
      ? "0xe432150cce91c13a887f7D836923d5597adD8E31"
      : "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://rpc.linea.build"
      : "https://rpc.sepolia.linea.build",
    explorer: isMainnet ? "https://lineascan.build" : "https://sepolia.lineascan.build",
    tokens: ["axlUSDC", "WETH", "USDC"],
    icon: "/chains/linea.svg",
    gasToken: GAS_TOKENS.ETH,
    color: "#61DFFF",
  },
  mantle: {
    name: "Mantle",
    axelarName: isMainnet ? "mantle" : "mantle-sepolia",
    chainId: isMainnet ? 5000 : 5003,
    gateway: isMainnet
      ? "0xe432150cce91c13a887f7D836923d5597adD8E31"
      : "0xC8D18F85cB0Cee5C95eC29c69DeaF6cea972349c",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://rpc.mantle.xyz"
      : "https://rpc.sepolia.mantle.xyz",
    explorer: isMainnet ? "https://explorer.mantle.xyz" : "https://explorer.sepolia.mantle.xyz",
    tokens: ["axlUSDC", "WMNT", "USDC"],
    icon: "/chains/mantle.svg",
    gasToken: GAS_TOKENS.MNT,
    color: "#000000",
  },
  scroll: {
    name: "Scroll",
    axelarName: isMainnet ? "scroll" : "scroll",
    chainId: isMainnet ? 534352 : 534351,
    gateway: isMainnet
      ? "0xe432150cce91c13a887f7D836923d5597adD8E31"
      : "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://rpc.scroll.io"
      : "https://sepolia-rpc.scroll.io",
    explorer: isMainnet ? "https://scrollscan.com" : "https://sepolia.scrollscan.com",
    tokens: ["axlUSDC", "WETH", "USDC"],
    icon: "/chains/scroll.svg",
    gasToken: GAS_TOKENS.ETH,
    color: "#FFEEDA",
  },
  blast: {
    name: "Blast",
    axelarName: isMainnet ? "blast" : "blast-sepolia",
    chainId: isMainnet ? 81457 : 168587773,
    gateway: isMainnet
      ? "0xe432150cce91c13a887f7D836923d5597adD8E31"
      : "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://rpc.blast.io"
      : "https://sepolia.blast.io",
    explorer: isMainnet ? "https://blastscan.io" : "https://sepolia.blastscan.io",
    tokens: ["axlUSDC", "WETH", "USDC"],
    icon: "/chains/blast.svg",
    gasToken: GAS_TOKENS.ETH,
    color: "#FCFC03",
  },
  celo: {
    name: "Celo",
    axelarName: isMainnet ? "celo" : "celo-sepolia",
    chainId: isMainnet ? 42220 : 44787,
    gateway: isMainnet
      ? "0xe432150cce91c13a887f7D836923d5597adD8E31"
      : "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://forno.celo.org"
      : "https://alfajores-forno.celo-testnet.org",
    explorer: isMainnet ? "https://celoscan.io" : "https://alfajores.celoscan.io",
    tokens: ["axlUSDC", "CELO", "USDC"],
    icon: "/chains/celo.svg",
    gasToken: "CELO",
    color: "#35D07F",
  },
  kava: {
    name: "Kava",
    axelarName: isMainnet ? "kava" : "kava",
    chainId: isMainnet ? 2222 : 2221,
    gateway: isMainnet
      ? "0xe432150cce91c13a887f7D836923d5597adD8E31"
      : "0xC8D18F85cB0Cee5C95eC29c69DeaF6cea972349c",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://evm.kava.io"
      : "https://evm.testnet.kava.io",
    explorer: isMainnet ? "https://kavascan.com" : "https://testnet.kavascan.com",
    tokens: ["axlUSDC", "WKAVA", "USDC"],
    icon: "/chains/kava.svg",
    gasToken: GAS_TOKENS.KAVA,
    color: "#FF433E",
  },
  filecoin: {
    name: "Filecoin",
    axelarName: isMainnet ? "filecoin" : "filecoin-2",
    chainId: isMainnet ? 314 : 314159,
    gateway: isMainnet
      ? "0xe432150cce91c13a887f7D836923d5597adD8E31"
      : "0x999117D44220F33e0441fbAb2A5aDB8FF485c54D",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://api.node.glif.io"
      : "https://api.calibration.node.glif.io/rpc/v1",
    explorer: isMainnet ? "https://filfox.info" : "https://calibration.filfox.info",
    tokens: ["axlUSDC", "WFIL", "USDC"],
    icon: "/chains/filecoin.svg",
    gasToken: GAS_TOKENS.FIL,
    color: "#0090FF",
  },
};

/**
 * Get chain configuration by chain ID
 */
export function getChainByChainId(chainId) {
  return Object.values(AXELAR_CHAINS).find(
    (chain) => chain.chainId === chainId
  );
}

/**
 * Get chain configuration by Axelar name
 */
export function getChainByAxelarName(axelarName) {
  return Object.values(AXELAR_CHAINS).find(
    (chain) => chain.axelarName === axelarName
  );
}

/**
 * Check if destination is an L2 chain that needs L1 data posting fee
 * Per Axelar docs: L2 chains incur extra cost for posting tx back to L1
 * @param {string} chainKey - Chain key
 * @returns {boolean}
 */
function isL2Chain(chainKey) {
  return ["arbitrum", "optimism", "base"].includes(chainKey);
}

/**
 * Estimate gas fee for cross-chain transfer using Axelar REST API
 * Reference: https://docs.axelar.dev/dev/axelarjs-sdk/axelar-query-api
 *
 * NOTE: For L2 destination chains (Arbitrum, Optimism, Base), the API
 * automatically includes L1 data posting fees per Axelar docs.
 *
 * @param {string} sourceChain - Source chain key (e.g., "ethereum")
 * @param {string} destinationChain - Destination chain key (e.g., "polygon")
 * @param {number} gasLimit - Gas limit for execution on destination chain
 * @param {number} gasMultiplier - Safety multiplier (default: 1.1 = 10% buffer)
 * @param {string} executeData - Optional calldata for more accurate L2 estimation
 * @param {boolean} express - Use Axelar Express for faster execution (premium fee applies)
 * @returns {Promise<string>} - Gas fee in wei
 */
export async function estimateCrossChainGas({
  sourceChain,
  destinationChain,
  gasLimit = 300000,
  gasMultiplier = 1.1,
  executeData = null,
  express = false,
}) {
  const srcChain = AXELAR_CHAINS[sourceChain];
  const dstChain = AXELAR_CHAINS[destinationChain];

  if (!srcChain || !dstChain) {
    throw new Error("Invalid chain configuration");
  }

  // Build request body
  // Per Axelar docs: include executeData for more accurate L2 fee estimation
  const requestBody = {
    sourceChain: srcChain.axelarName,
    destinationChain: dstChain.axelarName,
    gasLimit: gasLimit,
    gasMultiplier: gasMultiplier,
  };

  // For L2 chains, include executeData if provided for accurate L1 fee calculation
  // Docs: https://docs.axelar.dev/dev/gas-service/pay-gas/
  // if (isL2Chain(destinationChain) && executeData) {
  //   requestBody.executeData = executeData;
  // }

  // Add express flag for premium faster execution
  // Express service incurs additional insurance fee
  // Docs: https://docs.axelar.dev/dev/gas-service/pay-gas/
  if (express) {
    requestBody.express = true;
  }

  // Use Axelarscan GMP API for gas estimation
  // Docs: https://docs.axelarscan.io/gmp
  let response;
  try {
    response = await fetchWithTimeout(`${AXELARSCAN_API}/gmp/estimateGasFee`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Gas estimation request timed out");
    }
    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gas estimation API failed: ${response.status} - ${errorText}`);
  }

  let data;
  try {
    // API can return plain number string or JSON object
    const text = await response.text();

    // Try to parse as JSON first
    try {
      data = JSON.parse(text);
    } catch {
      // If not valid JSON, it's a plain number string
      data = text;
    }
  } catch (error) {
    throw new Error("Invalid response from gas estimation API");
  }

  // API returns the fee as a plain number string (most common case)
  if (typeof data === "string" && /^\d+$/.test(data)) {
    if (data === "0") {
      throw new Error("Gas estimation returned 0 - check chain names are correct");
    }
    return data;
  }

  // API returns a number
  if (typeof data === "number") {
    if (data === 0) {
      throw new Error("Gas estimation returned 0 - check chain names are correct");
    }
    return data.toString();
  }

  // Object with result field
  if (data && data.result) {
    return data.result;
  }

  // If detailed response with fee breakdown (includes L1 fee for L2 chains)
  // Per Axelar docs: l1ExecutionFeeWithMultiplier is the L1 data posting cost
  if (data && data.baseFee && data.executionFeeWithMultiplier) {
    const baseFee = BigInt(data.baseFee);
    const executionFee = BigInt(data.executionFeeWithMultiplier);
    // L1 fee is automatically included for L2 destination chains
    const l1Fee = data.l1ExecutionFeeWithMultiplier
      ? BigInt(data.l1ExecutionFeeWithMultiplier)
      : 0n;
    return (baseFee + executionFee + l1Fee).toString();
  }

  console.error("Unexpected gas estimation response:", data);
  throw new Error("Unexpected gas estimation response format");
}

/**
 * Fetch available assets from Axelar API
 * @returns {Promise<Array>} - Array of asset objects with chain availability
 */
let cachedAssets = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function fetchAxelarAssets() {
  // Return cached assets if still valid
  if (cachedAssets && Date.now() - cacheTimestamp < CACHE_DURATION) {
    return cachedAssets;
  }

  try {
    const response = await fetchWithTimeout(`${AXELARSCAN_API}/api/getAssets`);
    if (!response.ok) {
      throw new Error(`Failed to fetch assets: ${response.status}`);
    }
    const assets = await response.json();
    cachedAssets = assets;
    cacheTimestamp = Date.now();
    return assets;
  } catch (error) {
    console.error("Error fetching Axelar assets:", error);
    // Return fallback if API fails
    return getFallbackAssets();
  }
}

/**
 * Fallback assets list if API is unavailable
 */
function getFallbackAssets() {
  return [
    { symbol: "aUSDC", name: "USD Coin", decimals: 6, id: "uausdc" },
    { symbol: "WETH", name: "Wrapped Ether", decimals: 18, id: "weth-wei" },
    { symbol: "WMATIC", name: "Wrapped Matic", decimals: 18, id: "wmatic-wei" },
    { symbol: "WAVAX", name: "Wrapped AVAX", decimals: 18, id: "wavax-wei" },
    { symbol: "WBNB", name: "Wrapped BNB", decimals: 18, id: "wbnb-wei" },
  ];
}

// Custom ITS tokens deployed for testing (not in Axelar API)
// New TUSDC deployments (chain-specific addresses)
const TUSDC_ADDRESSES = {
  "base-sepolia": import.meta.env.VITE_AXELAR_TUSDC_ADDRESS_BASE_SEPOLIA || "0x2823Af7e1F2F50703eD9f81Ac4B23DC1E78B9E53",
  "arbitrum-sepolia": import.meta.env.VITE_AXELAR_TUSDC_ADDRESS_ARBITRUM_SEPOLIA || "0xd17beb0fE91B2aE5a57cE39D1c3D15AF1a968817",
  "ethereum-sepolia": "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B", // Old ITS token
};

const CUSTOM_ITS_TOKENS = {
  TUSDC: {
    symbol: "TUSDC",
    name: "Test USDC",
    decimals: 6,
    // Use chain-specific address if available, otherwise fallback to old ITS address
    address: (chainKey) => {
      const chainName = chainKey?.includes("sepolia") ? chainKey : `${chainKey}-sepolia`;
      return TUSDC_ADDRESSES[chainName] || TUSDC_ADDRESSES["ethereum-sepolia"] || "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B";
    },
    // Interchain tokenId (stable across chains) for old ITS token.
    // New deployments are standard ERC20, not ITS tokens.
    tokenId: import.meta.env.VITE_AXELAR_ITS_TUSDC_TOKEN_ID || "0x8bb61f14973ff494dda544391a758a6edf44a9ef16e2dfcd9d6dc9ade3da12bf",
    deployedChains: ["ethereum-sepolia", "base-sepolia", "arbitrum-sepolia", "polygon-sepolia", "polygon-amoy"],
  },
};

export function getCustomItsToken(symbol, chainKey = null) {
  if (!symbol) return null;
  const token = CUSTOM_ITS_TOKENS[String(symbol).toUpperCase()];
  if (!token) return null;
  
  // If address is a function, call it with chainKey
  if (typeof token.address === 'function' && chainKey) {
    return {
      ...token,
      address: token.address(chainKey),
    };
  }
  
  // If address is a string, return as is
  if (typeof token.address === 'string') {
    return token;
  }
  
  // Fallback: try to get address from function with default chain
  if (typeof token.address === 'function') {
    return {
      ...token,
      address: token.address(chainKey || 'base-sepolia'),
    };
  }
  
  return token;
}

export function getItsTokenId(symbol) {
  const token = getCustomItsToken(symbol);
  return token?.tokenId || null;
}

/**
 * Get tokens available on both source and destination chains
 * @param {string} sourceChainKey - Source chain key (e.g., "ethereum", "base")
 * @param {string} destChainKey - Destination chain key
 * @returns {Promise<Array>} - Array of available tokens
 */
export async function getAvailableTokens(sourceChainKey, destChainKey) {
  const assets = await fetchAxelarAssets();

  // Map our chain keys to Axelar chain names
  const srcChain = AXELAR_CHAINS[sourceChainKey];
  const dstChain = AXELAR_CHAINS[destChainKey];

  if (!srcChain || !dstChain) {
    return [];
  }

  // Get the Axelar chain identifiers
  const srcAxelarName = srcChain.axelarName.toLowerCase();
  const dstAxelarName = dstChain.axelarName.toLowerCase();

  // Start with custom ITS tokens that are available on both chains
  const customTokens = Object.values(CUSTOM_ITS_TOKENS).filter(token => {
    const srcSupported = token.deployedChains.some(c =>
      c.toLowerCase() === srcAxelarName || c.toLowerCase().includes(sourceChainKey)
    );
    const dstSupported = token.deployedChains.some(c =>
      c.toLowerCase() === dstAxelarName || c.toLowerCase().includes(destChainKey)
    );
    return srcSupported && dstSupported;
  }).map(token => ({
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    id: token.symbol.toLowerCase(),
    isCustom: true,
  }));

  // Filter Axelar API assets that exist on both chains
  const axelarTokens = assets.filter(asset => {
    if (!asset.addresses) return false;

    // Check if asset exists on source chain
    const srcAddress = Object.keys(asset.addresses).find(
      chain => chain.toLowerCase() === srcAxelarName ||
        chain.toLowerCase().includes(srcAxelarName.split("-")[0])
    );

    // Check if asset exists on destination chain
    const dstAddress = Object.keys(asset.addresses).find(
      chain => chain.toLowerCase() === dstAxelarName ||
        chain.toLowerCase().includes(dstAxelarName.split("-")[0])
    );

    return srcAddress && dstAddress;
  }).map(asset => ({
    symbol: asset.symbol,
    name: asset.name,
    decimals: asset.decimals,
    image: asset.image,
    id: asset.id,
  }));

  // Combine: custom tokens first, then Axelar tokens
  const allTokens = [...customTokens, ...axelarTokens];

  // Prioritize TUSDC and common tokens
  const priorityTokens = ["TUSDC", "aUSDC", "axlUSDC", "WETH", "USDC", "USDT"];
  return allTokens.sort((a, b) => {
    const aIdx = priorityTokens.indexOf(a.symbol);
    const bIdx = priorityTokens.indexOf(b.symbol);
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;
    return a.symbol.localeCompare(b.symbol);
  });
}

/**
 * Get supported tokens for a chain pair (legacy function for backward compatibility)
 * @param {string} sourceChain - Source chain key
 * @param {string} destinationChain - Destination chain key
 * @returns {string[]} - Array of supported token symbols
 */
export function getSupportedTokens(sourceChain, destinationChain) {
  const srcChain = AXELAR_CHAINS[sourceChain];
  const dstChain = AXELAR_CHAINS[destinationChain];

  if (!srcChain || !dstChain) {
    return [];
  }

  // ITS test tokens (handled via ITS path, not Gateway tokenAddresses()).
  if (!isMainnet) {
    const tusdc = getCustomItsToken("TUSDC", sourceChainKey);
    if (tusdc) {
      const srcOk = tusdc.deployedChains.some((c) => c.toLowerCase().includes(srcChain.axelarName.toLowerCase().split("-")[0]));
      const dstOk = tusdc.deployedChains.some((c) => c.toLowerCase().includes(dstChain.axelarName.toLowerCase().split("-")[0]));
      if (srcOk && dstOk) {
        return ["TUSDC", "aUSDC", "WETH", "WMATIC", "WAVAX", "WBNB"];
      }
    }
  }

  // Return common tokens as fallback (for sync calls)
  return ["aUSDC", "WETH", "WMATIC", "WAVAX", "WBNB"];
}

/**
 * Get all supported chains as array
 */
export function getAllSupportedChains() {
  return Object.entries(AXELAR_CHAINS).map(([key, chain]) => ({
    key,
    ...chain,
    // Map icon to image and use asset logos
    image: CHAIN_LOGOS[key] || chain.icon || "/assets/eth-logo.png",
  }));
}

/**
 * Get supported chains for cross-chain payments (filtered by aUSDC availability)
 * @param {string} network - "testnet" or "mainnet"
 * @returns {Array} - Array of supported chain objects
 */
// Logo mapping for chains
const CHAIN_LOGOS = {
  ethereum: "/assets/eth-logo.png",
  polygon: "/assets/eth-logo.png", // Fallback - polygon logo not in assets
  avalanche: "/assets/avalanche.png",
  arbitrum: "/assets/arbitrum.png",
  optimism: "/assets/optimism.png",
  base: "/assets/base.png",
  bnb: "/assets/bsc-logo.png",
  fantom: "/assets/fantom_logo.png",
  scroll: "/assets/scroll.png",
  blast: "/assets/blast_logo.png",
  oasis: "/assets/oasis-logo.png",
  moonbeam: "/assets/eth-logo.png", // Fallback
  linea: "/assets/eth-logo.png", // Fallback
  mantle: "/assets/eth-logo.png", // Fallback
  celo: "/assets/eth-logo.png", // Fallback
  kava: "/assets/eth-logo.png", // Fallback
  filecoin: "/assets/eth-logo.png", // Fallback
};

export function getSupportedChains(network = "testnet") {
  const isMainnet = network === "mainnet";

  return Object.entries(AXELAR_CHAINS).filter(([key, chain]) => {
    // Filter out chains that don't support the current network
    if (isMainnet && chain.axelarName === "ethereum-sepolia") return false;
    if (!isMainnet && chain.axelarName === "ethereum") return false;

    // IMPORTANT: Only include testnets officially supported by Axelar
    // Verified against https://github.com/axelarnetwork/axelar-contract-deployments/blob/main/axelar-chains-config/info/testnet.json
    if (!isMainnet) {
      const supportedTestnets = [
        "ethereum",      // Ethereum Sepolia - VERIFIED in testnet.json
        "polygon",       // Polygon Sepolia (Amoy) - supported by Axelar
        "avalanche",     // Avalanche Fuji - VERIFIED in testnet.json
        "arbitrum",      // Arbitrum Sepolia - VERIFIED in testnet.json
        "optimism",      // Optimism Sepolia - VERIFIED in testnet.json
        "base",          // Base Sepolia - VERIFIED in testnet.json
        "blast",         // Blast Sepolia - VERIFIED in testnet.json
        "fantom",        // Fantom Testnet - VERIFIED in testnet.json
        "scroll",        // Scroll Sepolia - VERIFIED in testnet.json
        // NOT INCLUDED: bnb, oasis, moonbeam, linea, mantle, celo, kava, filecoin (pending verification)
      ];
      return supportedTestnets.includes(key);
    }

    return true;
  }).map(([key, chain]) => ({
    key,
    ...chain,
    // Map icon to image and use asset logos
    image: CHAIN_LOGOS[key] || chain.icon || "/assets/eth-logo.png",
    // Add testnet support flag
    ...(isMainnet ? {} : {
      hasTestnetSupport: true
    })
  }));
}

/**
 * Track cross-chain transaction status via Axelarscan GMP API
 * Based on: https://docs.axelarscan.io/gmp
 * 
 * GMPStatus values per Axelar SDK:
 * - source_gateway_called: Transaction sent to gateway
 * - confirmed: Confirmed on source chain
 * - approving: Being approved on Axelar
 * - destination_gateway_approved: Approved on destination
 * - executing: Being executed on destination
 * - destination_executed: Successfully executed
 * - express_executed: Express executed (fast path)
 * - error: Execution failed
 * - insufficient_fee: Not enough gas paid
 * - not_executed: Not yet executed
 * 
 * @param {string} txHash - Transaction hash from source chain
 * @returns {Promise<object>} - Transaction status with normalized fields
 */
export async function trackTransaction(txHash) {
  const baseUrl = isMainnet
    ? "https://api.axelarscan.io"
    : "https://testnet.api.axelarscan.io";

  try {
    // Use the GMP API endpoint with POST method for searching
    const response = await fetchWithTimeout(
      `${baseUrl}/gmp/searchGMP`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          txHash: txHash,
          size: 1,
        }),
      }
    );

    if (!response.ok) {
      // Fallback to simple GET if POST fails
      const fallbackResponse = await fetchWithTimeout(
        `${baseUrl}/gmp/${txHash}`
      );
      if (!fallbackResponse.ok) {
        throw new Error(`Failed to fetch transaction status: ${response.status}`);
      }
      const fallbackData = await fallbackResponse.json();
      return normalizeGMPResponse(fallbackData);
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error("Invalid JSON response from transaction status API");
    }

    // The searchGMP endpoint can return:
    // 1. { data: [...], total: N, ... } format
    // 2. Direct array format [...]
    // 3. Single object format { ... }

    // Check for { data: [...] } wrapper format
    if (data?.data && Array.isArray(data.data) && data.data.length > 0) {
      return normalizeGMPResponse(data.data[0]);
    }

    // Check for direct array format
    if (Array.isArray(data) && data.length > 0) {
      return normalizeGMPResponse(data[0]);
    }

    // If data is already a single transaction object (check for status field)
    if (data && typeof data === "object" && !Array.isArray(data) && data.status) {
      return normalizeGMPResponse(data);
    }

    // Transaction not yet indexed - return pending status
    return {
      status: "source_gateway_called",
      statusLabel: "Initiated",
      isComplete: false,
      isPending: true,
      isFailed: false,
      message: "Transaction submitted, waiting for Axelar network to index...",
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Transaction status request timed out");
    }
    console.error("Error tracking transaction:", error);
    throw error;
  }
}

/**
 * Normalize GMP API response to a consistent format
 * @param {object} data - Raw GMP API response
 * @returns {object} - Normalized status object
 */
function normalizeGMPResponse(data) {
  // Handle different response structures from the API
  const status = data?.status || data?.simplified_status || "unknown";
  const gasPaidStatus = data?.gas_paid_info?.status || data?.gas_status;

  // Check for express execution
  const isExpressExecuted = status === "express_executed" ||
    data?.express_executed ||
    data?.is_express_executed;

  // Check for successful execution
  const isExecuted = status === "destination_executed" ||
    status === "executed" ||
    isExpressExecuted ||
    data?.executed;

  // Check for errors
  const isError = status === "error" ||
    status === "destination_execute_error" ||
    data?.error;

  // Check for insufficient gas
  const isInsufficientFee = status === "insufficient_fee" ||
    gasPaidStatus === "gas_paid_not_enough_gas" ||
    data?.is_insufficient_fee;

  // Determine human-readable status
  let statusLabel = "Processing";
  let message = "";

  if (isExpressExecuted) {
    statusLabel = "Express Executed";
    message = "Transaction completed via Express service";
  } else if (isExecuted) {
    statusLabel = "Completed";
    message = "Transaction successfully executed on destination chain";
  } else if (isError) {
    statusLabel = "Failed";
    message = data?.error?.message || "Transaction execution failed on destination chain";
  } else if (isInsufficientFee) {
    statusLabel = "Insufficient Gas";
    message = "Not enough gas was paid. Consider adding more gas to complete the transaction.";
  } else if (status === "destination_gateway_approved" || status === "approved") {
    statusLabel = "Approved";
    message = "Approved on destination gateway, awaiting execution";
  } else if (status === "executing") {
    statusLabel = "Executing";
    message = "Transaction is being executed on destination chain";
  } else if (status === "approving" || status === "confirmed") {
    statusLabel = "Confirming";
    message = "Transaction confirmed, awaiting approval on Axelar";
  } else if (status === "source_gateway_called") {
    statusLabel = "Initiated";
    message = "Transaction sent to Axelar gateway, awaiting confirmation";
  }

  return {
    status,
    statusLabel,
    gasPaidStatus,
    isComplete: isExecuted,
    isPending: !isExecuted && !isError && !isInsufficientFee,
    isFailed: isError,
    isInsufficientFee,
    isExpressExecuted,
    message,
    // Include raw data for debugging
    timeSpent: data?.time_spent,
    sourceChain: data?.call?.chain || data?.source_chain,
    destinationChain: data?.call?.returnValues?.destinationChain || data?.destination_chain,
    executedTxHash: data?.executed?.transactionHash,
    rawData: data,
  };
}

/**
 * Get transaction details from Axelarscan
 * @param {string} txHash - Transaction hash
 * @returns {Promise<object>} - Transaction details
 */
export async function getTransactionDetails(txHash) {
  const baseUrl = isMainnet
    ? "https://api.axelarscan.io"
    : "https://testnet.api.axelarscan.io";

  try {
    const response = await fetchWithTimeout(`${baseUrl}/gmp/${txHash}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch transaction details: ${response.status}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error("Invalid JSON response from transaction details API");
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Transaction details request timed out");
    }
    console.error("Error getting transaction details:", error);
    throw error;
  }
}

/**
 * Get Axelarscan explorer URL for a transaction
 * @param {string} txHash - Transaction hash
 * @returns {string} - Explorer URL
 */
export function getAxelarscanUrl(txHash) {
  const baseUrl = isMainnet
    ? "https://axelarscan.io"
    : "https://testnet.axelarscan.io";
  return `${baseUrl}/gmp/${txHash}`;
}

/**
 * Parse transaction status to human-readable format
 * @param {string} status - Raw status from API
 * @returns {object} - Parsed status with label and color
 */
export function parseTransactionStatus(status) {
  const statusMap = {
    source_gateway_called: {
      label: "Initiated",
      color: "blue",
      description: "Transaction sent to Axelar gateway",
    },
    voted: {
      label: "Confirming",
      color: "yellow",
      description: "Axelar validators are confirming",
    },
    approved: {
      label: "Approved",
      color: "orange",
      description: "Transaction approved, awaiting execution",
    },
    executed: {
      label: "Completed",
      color: "green",
      description: "Successfully executed on destination",
    },
    error: {
      label: "Failed",
      color: "red",
      description: "Transaction failed",
    },
    insufficient_fee: {
      label: "Needs Gas",
      color: "red",
      description: "Insufficient gas paid",
    },
  };

  return (
    statusMap[status] || {
      label: status,
      color: "gray",
      description: "Unknown status",
    }
  );
}

/**
 * Pay for Express Service (expedited cross-chain execution)
 * Axelar Express allows lending assets for faster execution before full propagation
 * Incurs additional insurance fee beyond normal GMP fees
 * Official docs: https://docs.axelar.dev/dev/gas-service/pay-gas/
 *
 * @param {object} params - Parameters
 * @param {string} params.sourceChain - Source chain key
 * @param {string} params.destinationChain - Destination chain Axelar name
 * @param {string} params.destinationAddress - Destination contract address
 * @param {string} params.payload - Encoded payload
 * @param {string} params.symbol - Token symbol (for callContractWithToken)
 * @param {string} params.amount - Token amount (for callContractWithToken)
 * @param {object} params.signer - Ethers signer
 * @param {string} params.gasFee - Gas fee amount in wei
 * @returns {Promise<object>} - Transaction receipt
 */
export async function payForExpressCall({
  sourceChain,
  destinationChain,
  destinationAddress,
  payload,
  symbol,
  amount,
  signer,
  gasFee,
}) {
  const chainConfig = AXELAR_CHAINS[sourceChain];
  if (!chainConfig) {
    throw new Error(`Chain ${sourceChain} not found in configuration`);
  }

  // Express Gas Service ABI
  const expressGasServiceABI = [
    "function payNativeGasForExpressCallWithToken(address sender, string destinationChain, string destinationAddress, bytes payload, string symbol, uint256 amount, address refundAddress) external payable",
  ];

  const { ethers } = await import("ethers");
  const gasServiceContract = new ethers.Contract(
    chainConfig.gasService,
    expressGasServiceABI,
    signer
  );

  const senderAddress = await signer.getAddress();

  console.log(`Paying for Express service with ${ethers.formatEther(gasFee)} native gas`);

  const tx = await gasServiceContract.payNativeGasForExpressCallWithToken(
    senderAddress,
    destinationChain,
    destinationAddress,
    payload,
    symbol,
    amount,
    senderAddress, // refund address
    { value: gasFee }
  );

  console.log(`Express gas payment sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Express gas payment confirmed at block ${receipt.blockNumber}`);

  return receipt;
}

/**
 * Add gas to a stuck transaction programmatically
 * Per Axelar docs: If prepaid gas is insufficient, use addNativeGas()
 * Official recovery method from: https://docs.axelar.dev/dev/general-message-passing/recovery
 *
 * @param {object} params - Parameters
 * @param {string} params.txHash - Original transaction hash from source chain
 * @param {number} params.logIndex - Log index of the ContractCall event (default: 0)
 * @param {string} params.chainKey - Source chain key (e.g., "ethereum", "polygon")
 * @param {object} params.signer - Ethers signer for the transaction
 * @param {string} params.additionalGas - Additional gas amount in wei as string
 * @returns {Promise<object>} - Transaction receipt
 */
export async function addNativeGas({
  txHash,
  logIndex = 0,
  chainKey,
  signer,
  additionalGas,
}) {
  const chainConfig = AXELAR_CHAINS[chainKey];
  if (!chainConfig) {
    throw new Error(`Chain ${chainKey} not found in configuration`);
  }

  // ABI for addNativeGas function
  const gasServiceABI = [
    "function addNativeGas(bytes32 txHash, uint256 logIndex, address refundAddress) external payable",
  ];

  const { ethers } = await import("ethers");
  const gasServiceContract = new ethers.Contract(
    chainConfig.gasService,
    gasServiceABI,
    signer
  );

  const refundAddress = await signer.getAddress();

  console.log(`Adding ${ethers.formatEther(additionalGas)} native gas to transaction ${txHash}`);

  const tx = await gasServiceContract.addNativeGas(
    txHash,
    logIndex,
    refundAddress,
    { value: additionalGas }
  );

  console.log(`Gas addition transaction sent: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Gas addition confirmed at block ${receipt.blockNumber}`);

  return receipt;
}

/**
 * Manually execute a stuck GMP transaction on destination chain
 * Use when transaction has been approved but not executed
 * Official docs: https://docs.axelar.dev/dev/general-message-passing/recovery
 *
 * NOTE: Manual execution requires commandId from Axelar network validators.
 * This function provides guidance to use Axelarscan UI or AxelarJS SDK.
 * For programmatic execution, use AxelarJS SDK's recovery API.
 *
 * @param {string} txHash - Transaction hash to get recovery URL for
 * @returns {string} - Axelarscan URL for manual execution
 */
export function getManualExecutionUrl(txHash) {
  console.warn("Manual execution requires commandId from Axelar network");
  console.warn("Use Axelarscan UI for manual execution:");
  const url = getAxelarscanUrl(txHash);
  console.warn(`  ${url}`);

  return url;
}

/**
 * Get Axelarscan URL for manual gas addition or execution
 * Per Axelar docs: Use Axelarscan UI for recovery operations
 *
 * @param {string} txHash - Original transaction hash
 * @param {string} logIndex - Log index of the GMP event (usually 0)
 * @returns {string} - URL to add gas via Axelarscan UI
 */
export function getAddGasUrl(txHash, logIndex = "0") {
  const baseUrl = isMainnet
    ? "https://axelarscan.io"
    : "https://testnet.axelarscan.io";
  return `${baseUrl}/gmp/${txHash}:${logIndex}`;
}

/**
 * Check if a transaction needs more gas
 * @param {object} txStatus - Transaction status from trackTransaction
 * @returns {boolean} - True if transaction needs more gas
 */
export function needsMoreGas(txStatus) {
  return txStatus?.status === "insufficient_fee" ||
    txStatus?.is_insufficient_fee === true;
}

/**
 * Export L2 chain check helper
 */
export { isL2Chain };

export default {
  AXELAR_CHAINS,
  getChainByChainId,
  getChainByAxelarName,
  estimateCrossChainGas,
  getSupportedTokens,
  getSupportedChains,
  trackTransaction,
  getTransactionDetails,
  getAxelarscanUrl,
  parseTransactionStatus,
  payForExpressCall,
  addNativeGas,
  getManualExecutionUrl,
  getAddGasUrl,
  needsMoreGas,
  isL2Chain,
};
