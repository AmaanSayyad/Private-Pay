/**
 * Transaction History Service for Unstoppable Wallet
 * Fetches real transaction history from blockchain RPCs
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { ethers } from 'ethers';

// Solana RPC endpoints
const SOLANA_RPC_ENDPOINTS = {
    mainnet: 'https://api.mainnet-beta.solana.com',
    testnet: 'https://api.testnet.solana.com',
    devnet: 'https://api.devnet.solana.com',
};

/**
 * Fetch Solana transaction history for an address
 * @param {string} publicKeyString - Solana public key (base58)
 * @param {string} network - Network: 'mainnet', 'testnet', 'devnet'
 * @param {number} limit - Max number of transactions to fetch
 * @returns {Promise<Array>} Transaction history
 */
export async function fetchSolanaTransactions(publicKeyString, network = 'devnet', limit = 10) {
    try {
        const endpoint = SOLANA_RPC_ENDPOINTS[network] || SOLANA_RPC_ENDPOINTS.devnet;
        const connection = new Connection(endpoint, 'confirmed');

        const publicKey = new PublicKey(publicKeyString);

        // Get confirmed signatures for address
        const signatures = await connection.getSignaturesForAddress(publicKey, { limit });

        // Fetch transaction details
        const transactions = [];
        for (const sig of signatures) {
            try {
                const tx = await connection.getTransaction(sig.signature, {
                    maxSupportedTransactionVersion: 0
                });

                if (tx) {
                    transactions.push({
                        hash: sig.signature,
                        timestamp: sig.blockTime ? new Date(sig.blockTime * 1000).toISOString() : null,
                        status: sig.err ? 'failed' : 'success',
                        chain: 'Solana',
                        explorerUrl: `https://solscan.io/tx/${sig.signature}?cluster=${network}`,
                        slot: sig.slot,
                    });
                }
            } catch (err) {
                console.warn('Failed to fetch Solana tx details:', err);
            }
        }

        return transactions;
    } catch (error) {
        console.error('Failed to fetch Solana transactions:', error);
        return [];
    }
}

/**
 * Fetch Ethereum transaction history for an address
 * @param {string} address - Ethereum address (0x...)
 * @param {string} network - Network: 'mainnet', 'sepolia'
 * @param {number} limit - Max number of transactions to fetch
 * @returns {Promise<Array>} Transaction history
 */
export async function fetchEthereumTransactions(address, network = 'sepolia', limit = 10) {
    try {
        // RPC endpoints
        const endpoints = {
            mainnet: 'https://eth.llamarpc.com',
            sepolia: 'https://rpc.sepolia.org',
        };

        const endpoint = endpoints[network] || endpoints.sepolia;
        const provider = new ethers.JsonRpcProvider(endpoint);

        // Get latest block number
        const latestBlock = await provider.getBlockNumber();

        // Fetch last N blocks and find transactions
        const transactions = [];
        const blocksToScan = Math.min(100, latestBlock); // Scan last 100 blocks

        for (let i = 0; i < blocksToScan && transactions.length < limit; i++) {
            const blockNumber = latestBlock - i;
            try {
                const block = await provider.getBlock(blockNumber, true);

                if (block && block.transactions) {
                    for (const tx of block.transactions) {
                        if (typeof tx === 'object' && (tx.from?.toLowerCase() === address.toLowerCase() ||
                            tx.to?.toLowerCase() === address.toLowerCase())) {

                            transactions.push({
                                hash: tx.hash,
                                timestamp: new Date(block.timestamp * 1000).toISOString(),
                                status: 'success', // Block inclusion means success
                                chain: 'Ethereum',
                                from: tx.from,
                                to: tx.to,
                                value: ethers.formatEther(tx.value || 0),
                                explorerUrl: `https://${network === 'mainnet' ? '' : network + '.'}etherscan.io/tx/${tx.hash}`,
                            });

                            if (transactions.length >= limit) break;
                        }
                    }
                }
            } catch (err) {
                console.warn(`Failed to fetch block ${blockNumber}:`, err);
            }
        }

        return transactions;
    } catch (error) {
        console.error('Failed to fetch Ethereum transactions:', error);
        return [];
    }
}

/**
 * Fetch Zcash transaction history for an address
 * Uses multiple APIs with fallbacks
 * @param {string} address - Zcash address
 * @param {string} network - Network: 'mainnet' or 'testnet'
 * @param {number} limit - Max number of transactions to fetch
 * @returns {Promise<Array>} Transaction history
 */
export async function fetchZcashTransactions(address, network = 'testnet', limit = 10) {
    try {
        // For mainnet, use Blockchair API
        if (network === 'mainnet') {
            try {
                const response = await fetch(
                    `https://api.blockchair.com/zcash/dashboards/address/${address}?transaction_details=true&limit=${limit}`
                );
                if (response.ok) {
                    const data = await response.json();
                    if (data.data && data.data[address] && data.data[address].transactions) {
                        return data.data[address].transactions.slice(0, limit).map(txid => ({
                            hash: txid,
                            timestamp: null, // Blockchair doesn't return timestamp in this endpoint
                            status: 'confirmed',
                            chain: 'Zcash',
                            explorerUrl: `https://blockchair.com/zcash/transaction/${txid}`,
                        }));
                    }
                }
            } catch (e) {
                console.warn('Blockchair API failed:', e);
            }
        }

        // For testnet, try chain.so API
        if (network === 'testnet') {
            try {
                const apiUrl = `https://chain.so/api/v2/get_tx_received/ZECTEST/${address}`;
                const response = await fetch(apiUrl);

                if (response.ok) {
                    const data = await response.json();
                    if (data.status === 'success' && data.data && data.data.txs) {
                        return data.data.txs.slice(0, limit).map(tx => ({
                            hash: tx.txid,
                            timestamp: tx.time ? new Date(tx.time * 1000).toISOString() : null,
                            status: tx.confirmations > 0 ? 'confirmed' : 'pending',
                            chain: 'Zcash',
                            value: tx.value,
                            confirmations: tx.confirmations,
                            explorerUrl: `https://blockexplorer.one/zcash/testnet/tx/${tx.txid}`,
                        }));
                    }
                }
            } catch (e) {
                console.warn('Chain.so API failed:', e);
            }
        }

        console.log('Zcash transaction APIs unavailable');
        return [];
    } catch (error) {
        console.error('Failed to fetch Zcash transactions:', error);
        return [];
    }
}

/**
 * Fetch all transactions for the wallet
 * @param {Object} wallet - Wallet object with addresses
 * @param {number} limit - Max transactions per chain (default: 10)
 * @returns {Promise<Array>} Combined transaction history
 */
export async function fetchAllTransactions(wallet, limit = 10) {
    const allTransactions = [];

    // Fetch Solana transactions
    if (wallet.solanaPublicKey) {
        const solTxs = await fetchSolanaTransactions(wallet.solanaPublicKey, 'devnet', limit);
        allTransactions.push(...solTxs);
    }

    // Fetch Ethereum transactions
    if (wallet.ethereumAddress) {
        const ethTxs = await fetchEthereumTransactions(wallet.ethereumAddress, 'sepolia', limit);
        allTransactions.push(...ethTxs);
    }

    // Fetch Zcash transactions
    if (wallet.zcashAddress) {
        const zecTxs = await fetchZcashTransactions(wallet.zcashAddress, 'testnet', limit);
        allTransactions.push(...zecTxs);
    }

    // Sort by timestamp (newest first)
    allTransactions.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return new Date(b.timestamp) - new Date(a.timestamp);
    });

    return allTransactions;
}
