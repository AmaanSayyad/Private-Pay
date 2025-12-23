/**
 * Transaction Sending Service for Unstoppable Wallet
 * Handles transaction signing and broadcasting
 */

import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, Keypair, TransactionInstruction } from '@solana/web3.js';
import { ethers } from 'ethers';
import { isStealthAddress, prepareStealthPayment } from './stealthSender';

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

        // Check if sending to stealth address
        let stealthData = null;
        let actualRecipient = toAddress;

        if (isStealthAddress(toAddress)) {
            console.log('🎭 Sending to stealth address');
            stealthData = prepareStealthPayment(toAddress, amount, 'solana');
            // For stealth, we still send to the stealth pubkey directly
            // The ephemeral key is in the memo
        }

        // Create recipient public key
        const toPublicKey = new PublicKey(actualRecipient);

        // Create transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: fromKeypair.publicKey,
                toPubkey: toPublicKey,
                lamports: amount * LAMPORTS_PER_SOL,
            })
        );

        // Add memo instruction if stealth payment
        if (stealthData) {
            const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
            const memoInstruction = new TransactionInstruction({
                keys: [],
                programId: MEMO_PROGRAM_ID,
                data: Buffer.from(stealthData.memo, 'utf-8')
            });
            transaction.add(memoInstruction);
            console.log('📝 Added memo with ephemeral pubkey:', stealthData.memo.substring(0, 20) + '...');
        }

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

        // Check if sending to stealth address
        let stealthData = null;
        let txData = undefined; // Default no data

        if (isStealthAddress(toAddress)) {
            console.log('🎭 Sending to stealth address (Ethereum)');
            stealthData = prepareStealthPayment(toAddress, amount, 'ethereum');
            // For Ethereum, we encode ephemeral key in data field
            txData = ethers.hexlify(ethers.toUtf8Bytes(stealthData.txData));
            console.log('📝 Added tx data with ephemeral pubkey:', stealthData.txData.substring(0, 20) + '...');
        }

        // Create transaction
        const tx = {
            to: toAddress,
            value: ethers.parseEther(amount.toString()),
        };

        // Add data field if stealth payment
        if (txData) {
            tx.data = txData;
        }

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
            // t-addresses (transparent), z-addresses (shielded sapling), u-addresses (unified)
            return address.startsWith('t') || address.startsWith('z') || address.startsWith('u');
        }
        return false;
    } catch (error) {
        return false;
    }
}

/**
 * Send Zcash transaction via local RPC node
 * Uses z_sendmany for shielded transactions
 * @param {string} fromAddress - Source Zcash address
 * @param {string} toAddress - Recipient Zcash address
 * @param {number} amount - Amount in ZEC
 * @param {string} network - Network: 'mainnet' or 'testnet'
 * @returns {Promise<string>} Operation ID (can be used to track transaction)
 */
export async function sendZcashTransaction(fromAddress, toAddress, amount, network = 'testnet') {
    try {
        const rpcUrl = import.meta.env?.VITE_ZCASH_RPC_URL || 'http://localhost:18232';
        const rpcUser = import.meta.env?.VITE_ZCASH_RPC_USER || '';
        const rpcPassword = import.meta.env?.VITE_ZCASH_RPC_PASSWORD || '';

        // Validate addresses
        if (!validateAddress(fromAddress, 'Zcash')) {
            throw new Error('Invalid source Zcash address');
        }
        if (!validateAddress(toAddress, 'Zcash')) {
            throw new Error('Invalid destination Zcash address');
        }

        // Validate amount
        if (!amount || amount <= 0) {
            throw new Error('Invalid amount');
        }

        // Prepare recipients array for z_sendmany
        const recipients = [
            {
                address: toAddress,
                amount: parseFloat(amount)
            }
        ];

        // Make RPC call to z_sendmany
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
                id: Date.now(),
                method: 'z_sendmany',
                params: [
                    fromAddress,
                    recipients,
                    1,          // minconf
                    0.0001      // fee in ZEC
                ]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'Zcash RPC error');
        }

        // z_sendmany returns an operation ID
        const operationId = data.result;
        console.log('✅ Zcash transaction initiated, operation ID:', operationId);

        return operationId;
    } catch (error) {
        console.error('Failed to send Zcash transaction:', error);
        throw error;
    }
}

/**
 * Get Zcash operation status
 * @param {string} operationId - Operation ID from z_sendmany
 * @returns {Promise<Object>} Operation status
 */
export async function getZcashOperationStatus(operationId) {
    try {
        const rpcUrl = import.meta.env?.VITE_ZCASH_RPC_URL || 'http://localhost:18232';
        const rpcUser = import.meta.env?.VITE_ZCASH_RPC_USER || '';
        const rpcPassword = import.meta.env?.VITE_ZCASH_RPC_PASSWORD || '';

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
                id: Date.now(),
                method: 'z_getoperationstatus',
                params: [[operationId]]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        // Returns array of operation statuses
        return data.result?.[0] || null;
    } catch (error) {
        console.error('Failed to get Zcash operation status:', error);
        throw error;
    }
}

/**
 * Estimate transaction fee
 * @param {string} chain - Chain: 'Solana', 'Ethereum', 'Zcash'
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
        } else if (chain === 'Zcash') {
            // Zcash has a fixed fee of 0.0001 ZEC for shielded transactions
            return '0.0001 ZEC';
        }
        return 'Unknown';
    } catch (error) {
        console.error('Failed to estimate fee:', error);
        return 'Unknown';
    }
}
