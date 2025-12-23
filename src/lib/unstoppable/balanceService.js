/**
 * Transaction Sending Service for Unstoppable Wallet
 * Fetches real balances from blockchain RPCs
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

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
 * Fetch Aptos balance for an address
 * @param {string} address - Aptos address (0x...)
 * @param {string} network - Network: 'mainnet' or 'testnet'
 * @returns {Promise<number>} Balance in APT
 */
export async function fetchAptosBalance(address, network = 'testnet') {
    try {
        const endpoint = network === 'mainnet'
            ? 'https://fullnode.mainnet.aptoslabs.com/v1'
            : 'https://fullnode.testnet.aptoslabs.com/v1';

        const response = await fetch(`${endpoint}/accounts/${address}/resources`);

        if (!response.ok) {
            console.log('Aptos account not found or not initialized - returning 0');
            return 0;
        }

        const resources = await response.json();

        // Find the AptosCoin resource
        const coinResource = resources.find(r =>
            r.type === '0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>'
        );

        if (coinResource && coinResource.data && coinResource.data.coin) {
            // Convert from octas (10^-8 APT) to APT
            const balanceOctas = BigInt(coinResource.data.coin.value);
            const balanceAPT = Number(balanceOctas) / 100000000;
            return balanceAPT;
        }

        return 0; // No coin resource found
    } catch (error) {
        console.error('Failed to fetch Aptos balance:', error);
        return 0; // Return 0 on error
    }
}

/**
 * Fetch Zcash balance for an address
 * Tries local Zcash RPC node first, then falls back to public APIs
 * @param {string} address - Zcash address
 * @param {string} network - Network: 'mainnet' or 'testnet'
 * @param {Object} rpcClient - Optional ZcashRPCClient instance
 * @returns {Promise<number>} Balance in ZEC
 */
export async function fetchZcashBalance(address, network = 'testnet', rpcClient = null) {
    try {
        // Try local Zcash RPC node first (if available)
        if (rpcClient || isZcashRPCAvailable()) {
            try {
                const client = rpcClient || getDefaultZcashRPCClient();
                const balance = await client.getBalance(address);
                console.log('✅ Zcash balance fetched via local RPC:', balance);
                return typeof balance === 'number' ? balance : parseFloat(balance) || 0;
            } catch (rpcError) {
                console.warn('Local Zcash RPC failed, falling back to public API:', rpcError.message);
            }
        }

        // Fallback: Try Blockchair API for mainnet
        if (network === 'mainnet') {
            const response = await fetch(`https://api.blockchair.com/zcash/dashboards/address/${address}`);
            if (response.ok) {
                const data = await response.json();
                if (data.data && data.data[address]) {
                    const balanceSatoshis = data.data[address].address.balance;
                    return balanceSatoshis / 100000000; // Convert to ZEC
                }
            }
        }

        // Fallback: For testnet, try chain.so API
        if (network === 'testnet') {
            const response = await fetch(`https://chain.so/api/v2/get_address_balance/ZECTEST/${address}`);
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'success' && data.data) {
                    return parseFloat(data.data.confirmed_balance) || 0;
                }
            }
        }

        console.log('Zcash balance APIs unavailable - returning 0');
        return 0;
    } catch (error) {
        console.error('Failed to fetch Zcash balance:', error);
        return 0;
    }
}

// Cached RPC client
let _zcashRPCClient = null;

/**
 * Check if Zcash RPC is configured
 */
function isZcashRPCAvailable() {
    const rpcUrl = import.meta.env?.VITE_ZCASH_RPC_URL;
    return !!rpcUrl;
}

/**
 * Get default Zcash RPC client (lazy initialization)
 */
function getDefaultZcashRPCClient() {
    if (!_zcashRPCClient) {
        // Dynamic import to avoid circular dependencies
        const rpcUrl = import.meta.env?.VITE_ZCASH_RPC_URL || 'http://localhost:18232';
        const rpcUser = import.meta.env?.VITE_ZCASH_RPC_USER || '';
        const rpcPassword = import.meta.env?.VITE_ZCASH_RPC_PASSWORD || '';

        // Create simple RPC client inline (avoid import issues)
        _zcashRPCClient = {
            async getBalance(address) {
                const response = await fetch(rpcUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...(rpcUser && rpcPassword ? {
                            'Authorization': 'Basic ' + btoa(`${rpcUser}:${rpcPassword}`)
                        } : {})
                    },
                    body: JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'z_getbalance',
                        params: [address, 1]
                    })
                });
                const data = await response.json();
                if (data.error) throw new Error(data.error.message);
                return data.result;
            }
        };
    }
    return _zcashRPCClient;
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

    // Fetch Aptos balance
    if (wallet.aptosAddress) {
        balances.apt = await fetchAptosBalance(wallet.aptosAddress, 'testnet');
    } else {
        balances.apt = 0;
    }

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
