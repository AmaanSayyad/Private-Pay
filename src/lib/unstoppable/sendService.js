/**
 * Transaction Sending Service for Unstoppable Wallet
 * Handles transaction signing and broadcasting
 */

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import { ethers } from 'ethers';

// Solana RPC endpoints
const SOLANA_RPC_ENDPOINTS = {
    mainnet: 'https://api.mainnet-beta.solana.com',
    testnet: 'https://api.testnet.solana.com',
    devnet: 'https://api.devnet.solana.com',
};

/**
 * Send SOL transaction
 * @param {string} fromSecretKey - Sender's secret key (base64)
 * @param {string} toAddress - Recipient's public key (base58)
 * @param {number} amount - Amount in SOL
 * @param {string} network - Network: 'mainnet', 'testnet', 'devnet'
 * @returns {Promise<string>} Transaction signature
 */
export async function sendSolanaTransaction(fromSecretKey, toAddress, amount, network = 'devnet') {
    try {
        const endpoint = SOLANA_RPC_ENDPOINTS[network] || SOLANA_RPC_ENDPOINTS.devnet;
        const connection = new Connection(endpoint, 'confirmed');

        // Restore keypair from secret key
        const secretKeyBuffer = Buffer.from(fromSecretKey, 'base64');
        const fromKeypair = Keypair.fromSecretKey(secretKeyBuffer);

        // Create recipient public key
        const toPublicKey = new PublicKey(toAddress);

        // Create transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromKeypair.publicKey,
                toPubkey: toPublicKey,
                lamports: amount * LAMPORTS_PER_SOL,
            })
        );

        // Send transaction
        const signature = await connection.sendTransaction(transaction, [fromKeypair]);

        // Wait for confirmation
        await connection.confirmTransaction(signature, 'confirmed');

        return signature;
    } catch (error) {
        console.error('Failed to send Solana transaction:', error);
        throw error;
    }
}

/**
 * Send ETH transaction
 * @param {string} privateKey - Sender's private key (hex with 0x prefix)
 * @param {string} toAddress - Recipient's address (0x...)
 * @param {number} amount - Amount in ETH
 * @param {string} network - Network: 'mainnet', 'sepolia'
 * @returns {Promise<string>} Transaction hash
 */
export async function sendEthereumTransaction(privateKey, toAddress, amount, network = 'sepolia') {
    try {
        // RPC endpoints
        const endpoints = {
            mainnet: 'https://eth.llamarpc.com',
            sepolia: 'https://rpc.sepolia.org',
        };

        const endpoint = endpoints[network] || endpoints.sepolia;
        const provider = new ethers.JsonRpcProvider(endpoint);

        // Create wallet from private key
        const wallet = new ethers.Wallet(privateKey, provider);

        // Create transaction
        const tx = {
            to: toAddress,
            value: ethers.parseEther(amount.toString()),
        };

        // Send transaction
        const txResponse = await wallet.sendTransaction(tx);

        // Wait for confirmation
        await txResponse.wait();

        return txResponse.hash;
    } catch (error) {
        console.error('Failed to send Ethereum transaction:', error);
        throw error;
    }
}

/**
 * Validate address format
 * @param {string} address - Address to validate
 * @param {string} chain - Chain: 'Solana', 'Ethereum', 'Zcash'
 * @returns {boolean} Whether address is valid
 */
export function validateAddress(address, chain) {
    try {
        if (chain === 'Solana') {
            new PublicKey(address);
            return true;
        } else if (chain === 'Ethereum') {
            return ethers.isAddress(address);
        } else if (chain === 'Zcash') {
            // Basic validation for Zcash addresses
            return address.startsWith('t') || address.startsWith('z');
        }
        return false;
    } catch (error) {
        return false;
    }
}

/**
 * Estimate transaction fee
 * @param {string} chain - Chain: 'Solana', 'Ethereum'
 * @param {string} network - Network
 * @returns {Promise<string>} Estimated fee
 */
export async function estimateTransactionFee(chain, network = 'devnet') {
    try {
        if (chain === 'Solana') {
            const endpoint = SOLANA_RPC_ENDPOINTS[network] || SOLANA_RPC_ENDPOINTS.devnet;
            const connection = new Connection(endpoint, 'confirmed');
            const fee = await connection.getFeeForMessage(
                new Transaction().compileMessage(),
                'confirmed'
            );
            return `${(fee / LAMPORTS_PER_SOL).toFixed(6)} SOL`;
        } else if (chain === 'Ethereum') {
            const endpoints = {
                mainnet: 'https://eth.llamarpc.com',
                sepolia: 'https://rpc.sepolia.org',
            };
            const endpoint = endpoints[network] || endpoints.sepolia;
            const provider = new ethers.JsonRpcProvider(endpoint);
            const feeData = await provider.getFeeData();
            const estimatedGas = 21000n; // Standard transfer gas limit
            const estimatedFee = feeData.gasPrice * estimatedGas;
            return `${ethers.formatEther(estimatedFee)} ETH`;
        }
        return 'Unknown';
    } catch (error) {
        console.error('Failed to estimate fee:', error);
        return 'Unknown';
    }
}
