/**
 * Balance Fetching Service for Unstoppable Wallet
 * Fetches real balances from blockchain RPCs
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createConfiguredRPCClient } from '../zcash';

// Solana RPC endpoints
const SOLANA_RPC_ENDPOINTS = {
    mainnet: 'https://api.mainnet-beta.solana.com',
    testnet: 'https://api.testnet.solana.com',
    devnet: 'https://api.devnet.solana.com',
};

/**
 * Fetch Solana balance for an address
 * @param {string} publicKeyString - Solana public key (base58)
 * @param {string} network - Network: 'mainnet', 'testnet', 'devnet'
 * @returns {Promise<number>} Balance in SOL
 */
export async function fetchSolanaBalance(publicKeyString, network = 'devnet') {
    try {
        const endpoint = SOLANA_RPC_ENDPOINTS[network] || SOLANA_RPC_ENDPOINTS.devnet;
        const connection = new Connection(endpoint, 'confirmed');

        const publicKey = new PublicKey(publicKeyString);
        const balanceLamports = await connection.getBalance(publicKey);

        // Convert lamports to SOL
        const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;

        return balanceSOL;
    } catch (error) {
        console.error('Failed to fetch Solana balance:', error);
        return 0; // Return 0 on error
    }
}

/**
 * Fetch Zcash balance for an address
 * @param {string} address - Zcash address
 * @param {string} network - Network: 'mainnet' or 'testnet'
 * @returns {Promise<number>} Balance in ZEC
 */
export async function fetchZcashBalance(address, network = 'testnet') {
    try {
        // Create RPC client (requires Zcash node running)
        const rpcClient = createConfiguredRPCClient(network);

        // Get balance from RPC
        const balance = await rpcClient.getBalance(address);

        return balance;
    } catch (error) {
        console.error('Failed to fetch Zcash balance:', error);
        // Return 0 if RPC not available (graceful degradation)
        return 0;
    }
}

/**
 * Fetch all balances for the wallet
 * @param {Object} wallet - Wallet object with addresses
 * @returns {Promise<Object>} Balances for all chains
 */
export async function fetchAllBalances(wallet) {
    const balances = {};

    // Fetch Solana balance
    if (wallet.solanaPublicKey) {
        balances.sol = await fetchSolanaBalance(wallet.solanaPublicKey, 'devnet');
    }

    // Fetch Zcash balance
    if (wallet.zcashAddress) {
        balances.zec = await fetchZcashBalance(wallet.zcashAddress, 'testnet');
    }

    // Fetch Ethereum balance
    if (wallet.ethereumAddress) {
        balances.eth = await fetchEthereumBalance(wallet.ethereumAddress, 'sepolia');
    }

    // Placeholder for future chains
    balances.apt = 0; // Aptos - not implemented yet

    return balances;
}

/**
 * Fetch Ethereum balance for an address
 * @param {string} address - Ethereum address (0x...)
 * @param {string} network - Network: 'mainnet', 'sepolia', 'goerli'
 * @returns {Promise<number>} Balance in ETH
 */
export async function fetchEthereumBalance(address, network = 'sepolia') {
    try {
        const { ethers } = await import('ethers');

        // RPC endpoints
        const endpoints = {
            mainnet: 'https://eth.llamarpc.com',
            sepolia: 'https://rpc.sepolia.org',
            goerli: 'https://rpc.ankr.com/eth_goerli',
        };

        const endpoint = endpoints[network] || endpoints.sepolia;
        const provider = new ethers.JsonRpcProvider(endpoint);

        // Get balance in Wei
        const balanceWei = await provider.getBalance(address);

        // Convert to ETH
        const balanceETH = parseFloat(ethers.formatEther(balanceWei));

        return balanceETH;
    } catch (error) {
        console.error('Failed to fetch Ethereum balance:', error);
        return 0; // Return 0 on error
    }
}

/**
 * Update assets with real balances
 * @param {Array} assets - Current assets array
 * @param {Object} balances - Fetched balances
 * @returns {Array} Updated assets with real balances
 */
export function updateAssetsWithBalances(assets, balances) {
    return assets.map(asset => ({
        ...asset,
        balance: balances[asset.id] || 0,
    }));
}
