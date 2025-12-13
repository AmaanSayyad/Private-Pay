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
    axelarName: isMainnet ? "ethereum" : "ethereum-sepolia",
    chainId: isMainnet ? 1 : 11155111,
    gateway: isMainnet
      ? "0x4F4495243837681061C4743b74B3eEdf548D56A5"
      : "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://eth-mainnet.g.alchemy.com/v2/"
      : "https://eth-sepolia.g.alchemy.com/v2/",
    explorer: isMainnet
      ? "https://etherscan.io"
      : "https://sepolia.etherscan.io",
    tokens: ["axlUSDC", "WETH", "USDC"],
    icon: "/chains/ethereum.svg",
    gasToken: GAS_TOKENS.ETH,
    color: "#627EEA",
  },
  polygon: {
    name: "Polygon",
    axelarName: isMainnet ? "polygon" : "polygon-sepolia",
    chainId: isMainnet ? 137 : 80002,
    gateway: isMainnet
      ? "0x6f015F38a1E8b4D0E3B5C7F4f0c1f6e5D4C3B2A1"
      : "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://polygon-mainnet.g.alchemy.com/v2/"
      : "https://polygon-amoy.g.alchemy.com/v2/",
    explorer: isMainnet
      ? "https://polygonscan.com"
      : "https://amoy.polygonscan.com",
    tokens: ["axlUSDC", "WMATIC", "USDC"],
    icon: "/chains/polygon.svg",
    gasToken: GAS_TOKENS.MATIC,
    color: "#8247E5",
  },
  avalanche: {
    name: "Avalanche",
    axelarName: isMainnet ? "avalanche" : "avalanche",
    chainId: isMainnet ? 43114 : 43113,
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
    tokens: ["axlUSDC", "WAVAX", "USDC"],
    icon: "/chains/avalanche.svg",
    gasToken: GAS_TOKENS.AVAX,
    color: "#E84142",
  },
  arbitrum: {
    name: "Arbitrum",
    axelarName: isMainnet ? "arbitrum" : "arbitrum-sepolia",
    chainId: isMainnet ? 42161 : 421614,
    gateway: isMainnet
      ? "0xe432150cce91c13a887f7D836923d5597adD8E31"
      : "0xe1cE95479C84e9809269227C7F8524aE051Ae77a",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://arb-mainnet.g.alchemy.com/v2/"
      : "https://arb-sepolia.g.alchemy.com/v2/",
    explorer: isMainnet ? "https://arbiscan.io" : "https://sepolia.arbiscan.io",
    tokens: ["axlUSDC", "WETH", "USDC"],
    icon: "/chains/arbitrum.svg",
    gasToken: GAS_TOKENS.ETH,
    color: "#28A0F0",
  },
  optimism: {
    name: "Optimism",
    axelarName: isMainnet ? "optimism" : "optimism-sepolia",
    chainId: isMainnet ? 10 : 11155420,
    gateway: isMainnet
      ? "0xe432150cce91c13a887f7D836923d5597adD8E31"
      : "0xe432150cce91c13a887f7D836923d5597adD8E31",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://opt-mainnet.g.alchemy.com/v2/"
      : "https://opt-sepolia.g.alchemy.com/v2/",
    explorer: isMainnet
      ? "https://optimistic.etherscan.io"
      : "https://sepolia-optimism.etherscan.io",
    tokens: ["axlUSDC", "WETH", "USDC"],
    icon: "/chains/optimism.svg",
    gasToken: GAS_TOKENS.ETH,
    color: "#FF0420",
  },
  base: {
    name: "Base",
    axelarName: isMainnet ? "base" : "base-sepolia",
    chainId: isMainnet ? 8453 : 84532,
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
    tokens: ["axlUSDC", "WETH", "USDC"],
    icon: "/chains/base.svg",
    gasToken: GAS_TOKENS.ETH,
    color: "#0052FF",
  },
  oasis: {
    name: "Oasis Sapphire",
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
    axelarName: isMainnet ? "binance" : "binance",
    chainId: isMainnet ? 56 : 97,
    gateway: isMainnet
      ? "0x304acf330bbE08d1e512eefaa92F6a57871fD895"
      : "0x4D147dCb984e6affEEC47e44293DA442580A3Ec0",
    gasService: isMainnet
      ? "0x2d5d7d31F671F86C782533cc367F14109a082712"
      : "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
    its: "0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C",
    rpcUrl: isMainnet
      ? "https://bsc-dataseed.binance.org"
      : "https://data-seed-prebsc-1-s1.binance.org:8545",
    explorer: isMainnet ? "https://bscscan.com" : "https://testnet.bscscan.com",
    tokens: ["axlUSDC", "WBNB", "USDC"],
    icon: "/chains/bnb.svg",
    gasToken: GAS_TOKENS.BNB,
    color: "#F0B90B",
  },
  fantom: {
    name: "Fantom",
    axelarName: isMainnet ? "fantom" : "fantom",
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
 * @returns {Promise<string>} - Gas fee in wei
 */
export async function estimateCrossChainGas({
  sourceChain,
  destinationChain,
  gasLimit = 300000,
  gasMultiplier = 1.1,
  executeData = null,
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
  if (isL2Chain(destinationChain) && executeData) {
    requestBody.executeData = executeData;
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
 * Get supported tokens for a chain pair
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

  return srcChain.tokens.filter((token) => dstChain.tokens.includes(token));
}

/**
 * Get all supported chains as array
 */
export function getSupportedChains() {
  return Object.entries(AXELAR_CHAINS).map(([key, chain]) => ({
    key,
    ...chain,
  }));
}

/**
 * Track cross-chain transaction status via Axelarscan API
 * @param {string} txHash - Transaction hash from source chain
 * @returns {Promise<object>} - Transaction status
 */
export async function trackTransaction(txHash) {
  const baseUrl = isMainnet
    ? "https://api.axelarscan.io"
    : "https://testnet.api.axelarscan.io";

  try {
    const response = await fetchWithTimeout(
      `${baseUrl}/cross-chain/transfers-status?txHash=${txHash}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch transaction status: ${response.status}`);
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error("Invalid JSON response from transaction status API");
    }
    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Transaction status request timed out");
    }
    console.error("Error tracking transaction:", error);
    throw error;
  }
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
 * Add gas to a stuck transaction via Axelarscan API
 * Per Axelar docs: If prepaid gas is insufficient, use addNativeGas()
 * This is an alternative to using the AxelarJS SDK recovery API
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
  getAddGasUrl,
  needsMoreGas,
  isL2Chain,
};
