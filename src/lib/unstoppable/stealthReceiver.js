/**
 * Stealth Payment Receiver
 * Detects and decrypts payments to stealth addresses
 */

import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { storeReceivedPayment, transactionExists } from './indexedDB'; // Now uses Supabase

/**
 * Generate stealth address from keys (matching generation logic)
 */
function generateStealthAddressFromKeys(spendingPub, viewingPriv, ephemeralPub) {
    try {
        // Compute shared secret: viewingPriv * ephemeralPub
        const sharedPoint = secp256k1.ProjectivePoint.fromHex(ephemeralPub).multiply(
            BigInt(`0x${viewingPriv}`)
        );
        const sharedSecret = sha256(sharedPoint.toRawBytes(true));

        // Derive stealth public key: spendingPub + H(shared_secret) * G
        const hashInt = BigInt(`0x${bytesToHex(sharedSecret)}`);
        const spendingPoint = secp256k1.ProjectivePoint.fromHex(spendingPub);
        const offset = secp256k1.ProjectivePoint.BASE.multiply(hashInt);
        const stealthPoint = spendingPoint.add(offset);

        return bytesToHex(stealthPoint.toRawBytes(true));
    } catch (error) {
        console.error('Error generating stealth address:', error);
        return null;
    }
}

/**
 * Check if transaction is a stealth payment to one of our addresses
 * 
 * @param {Object} tx - Transaction object
 * @param {Array} stealthAddresses - Our generated stealth addresses
 * @param {Object} wallet - Wallet with viewing key
 * @returns {Object|null} - Payment details if match found, null otherwise
 */
export async function detectStealthPayment(tx, stealthAddresses, wallet) {
    try {
        // Skip if we've already processed this transaction
        const walletAddr = wallet.solanaPublicKey || wallet.ethereumAddress || wallet.zcashAddress;
        if (await transactionExists(tx.hash || tx.signature, walletAddr)) {
            return null;
        }

        // Extract ephemeral public key from transaction
        // This depends on how it's encoded in the transaction
        // For now, we'll check transaction memo/data fields
        let ephemeralPubKey = null;

        // Try to extract from memo (Solana)
        if (tx.memo && typeof tx.memo === 'string') {
            // Memo format: "STEALTH:<ephemeral_pubkey>"
            if (tx.memo.startsWith('STEALTH:')) {
                ephemeralPubKey = tx.memo.substring(8);
            }
        }

        // Try to extract from logs/data (Ethereum)
        if (!ephemeralPubKey && tx.logs) {
            for (const log of tx.logs) {
                if (log.data && log.data.startsWith('0xSTE')) {
                    // Custom event signature for stealth payments
                    ephemeralPubKey = log.data.substring(5, 71); // Next 66 chars
                }
            }
        }

        if (!ephemeralPubKey) {
            return null; // Not a stealth payment
        }

        // Try to generate the stealth address using our viewing key
        const derivedStealthAddr = generateStealthAddressFromKeys(
            wallet.spendingPub,
            wallet.viewingPriv,
            ephemeralPubKey
        );

        // Check if derived address matches any of our stealth addresses
        const matchedAddress = stealthAddresses.find(
            addr => addr.stealthPub === derivedStealthAddr
        );

        if (matchedAddress) {
            // Found a payment to our stealth address!
            const payment = {
                stealthAddress: matchedAddress.stealthPub,
                amount: tx.value || tx.amount || 0,
                txHash: tx.hash || tx.signature,
                timestamp: tx.timestamp || Date.now(),
                chain: tx.chain || 'unknown',
                ephemeralPubKey: ephemeralPubKey,
                blockNumber: tx.blockNumber || tx.slot,
                from: tx.from || tx.sender,
                to: tx.to || tx.recipient
            };

            console.log('✅ Stealth payment detected!', payment);

            // Store in Supabase
            const walletAddr = wallet.solanaPublicKey || wallet.ethereumAddress || wallet.zcashAddress;
            await storeReceivedPayment(payment, walletAddr);

            return payment;
        }

        return null;
    } catch (error) {
        console.error('Error detecting stealth payment:', error);
        return null;
    }
}

/**
 * Scan transactions for stealth payments
 * 
 * @param {Array} transactions - List of transactions to scan
 * @param {Array} stealthAddresses - Our stealth addresses
 * @param {Object} wallet - Wallet with viewing keys
 * @returns {Array} - Detected payments
 */
export async function scanTransactionsForPayments(transactions, stealthAddresses, wallet) {
    const detectedPayments = [];

    for (const tx of transactions) {
        const payment = await detectStealthPayment(tx, stealthAddresses, wallet);
        if (payment) {
            detectedPayments.push(payment);
        }
    }

    return detectedPayments;
}

/**
 * Compute spending key for a stealth payment
 * Used when spending received funds
 * 
 * @param {string} viewingPriv - Viewing private key
 * @param {string} spendingPriv - Spending private key  
 * @param {string} ephemeralPub - Ephemeral public key from payment
 * @returns {string} - Private key to spend this payment
 */
export function computeStealthSpendingKey(viewingPriv, spendingPriv, ephemeralPub) {
    try {
        // Compute shared secret
        const sharedPoint = secp256k1.ProjectivePoint.fromHex(ephemeralPub).multiply(
            BigInt(`0x${viewingPriv}`)
        );
        const sharedSecret = sha256(sharedPoint.toRawBytes(true));

        // Derive spending key: spendingPriv + H(shared_secret)
        const hashInt = BigInt(`0x${bytesToHex(sharedSecret)}`);
        const spendingInt = BigInt(`0x${spendingPriv}`);
        const stealthPrivInt = (spendingInt + hashInt) % secp256k1.CURVE.n;

        return stealthPrivInt.toString(16).padStart(64, '0');
    } catch (error) {
        console.error('Error computing stealth spending key:', error);
        return null;
    }
}
