// Aleo Constants and Configuration

// Network Configuration
export const ALEO_NETWORKS = {
  TESTNET: 'testnet',
  MAINNET: 'mainnet',
};

export const CURRENT_NETWORK = ALEO_NETWORKS.TESTNET;

// API Endpoints
export const ALEO_ENDPOINTS = {
  TESTNET: {
    RPC: 'https://api.explorer.provable.com/v1/testnet',
    EXPLORER: 'https://explorer.provable.com/testnet',
    FAUCET: 'https://faucet.aleo.org',
  },
  MAINNET: {
    RPC: 'https://api.explorer.provable.com/v1/mainnet',
    EXPLORER: 'https://explorer.provable.com/mainnet',
  },
};

// Network URLs
export const ALEO_NETWORK_URL = ALEO_ENDPOINTS.TESTNET.RPC;

// Default private key for testing (should be replaced with actual wallet integration)
export const ALEO_PRIVATE_KEY = process.env.VITE_ALEO_PRIVATE_KEY || 'APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH';

// Aleo program names
export const ALEO_PROGRAMS = {
  DARK_POOL: 'dark_pool.aleo',
  SHIELDED_AMM: 'shielded_amm.aleo',
  ZK_CREDIT: 'zk_credit.aleo',
  PRIVATE_LENDING: 'private_lending.aleo',
  CROSS_CHAIN_VAULT: 'cross_chain_vault.aleo',
  TREASURY_MANAGEMENT: 'treasury_management.aleo',
  COMPLIANCE_MODULE: 'compliance_module.aleo',
  BRIDGE_MANAGER: 'bridge_manager.aleo',
};

// Program IDs (will be updated after deployment)
export const PROGRAM_IDS = {
  DARK_POOL: 'dark_pool.aleo',
  SHIELDED_AMM: 'shielded_amm.aleo',
  ZK_CREDIT: 'zk_credit.aleo',
  PRIVATE_LENDING: 'private_lending.aleo',
  CROSS_CHAIN_VAULT: 'cross_chain_vault.aleo',
  TREASURY_MANAGEMENT: 'treasury_management.aleo',
  COMPLIANCE_MODULE: 'compliance_module.aleo',
  BRIDGE_MANAGER: 'bridge_manager.aleo',
};

// Transaction Configuration
export const TX_CONFIG = {
  DEFAULT_FEE: 1000000, // 1 credit in microcredits
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
};

// Token Configuration
export const TOKENS = {
  CREDITS: {
    id: 'credits.aleo',
    symbol: 'CREDITS',
    decimals: 6,
  },
  // Additional tokens will be added as they're deployed
};

// Pool Configuration
export const POOLS = {
  DEFAULT_FEE_RATE: 3000, // 0.3% in basis points
  MIN_LIQUIDITY: 1000,
  MAX_SLIPPAGE: 5000, // 5% in basis points
};

// Credit System Configuration
export const CREDIT_SYSTEM = {
  MIN_SCORE: 300,
  MAX_SCORE: 850,
  DEFAULT_SCORE: 600,
  SCORE_DECIMALS: 0,
};

// Lending Configuration
export const LENDING = {
  MIN_COLLATERAL_RATIO: 150, // 150%
  LIQUIDATION_THRESHOLD: 120, // 120%
  MAX_LTV: 80, // 80%
  INTEREST_RATE_DECIMALS: 4,
};

// Bridge Configuration
export const BRIDGE = {
  SUPPORTED_CHAINS: ['ethereum', 'solana', 'cosmos'],
  MIN_BRIDGE_AMOUNT: 1000000, // 1 credit
  BRIDGE_FEE_RATE: 100, // 0.1% in basis points
};

// Error Messages
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Wallet not connected',
  INSUFFICIENT_BALANCE: 'Insufficient balance',
  INVALID_AMOUNT: 'Invalid amount',
  TRANSACTION_FAILED: 'Transaction failed',
  PROGRAM_NOT_FOUND: 'Program not found',
  INVALID_SIGNATURE: 'Invalid signature',
  NETWORK_ERROR: 'Network error',
};