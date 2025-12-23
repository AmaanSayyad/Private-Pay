/**
 * Stealth Payment Sender
 * Generates ephemeral keys and prepares stealth payments
 */

import { secp256k1 } from '@noble/curves/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

/**
 * Check if an address is a stealth address
 * Stealth addresses are 66-character hex strings (compressed public keys)
 */
export function isStealthAddress(address) {
    if (!address) return false;

    // Check if it's a 66-char hex string (33 bytes compressed pubkey)
    const isCompressedPubkey = /^[0-9a-fA-F]{66}$/.test(address);

    // Also check if it starts with 02 or 03 (compressed pubkey format)
    const hasValidPrefix = address.startsWith('02') || address.startsWith('03');

    return isCompressedPubkey && hasValidPrefix;
}

/**
 * Generate ephemeral keypair for stealth payment
 */
export function generateEphemeralKeypair() {
    // Generate random private key
    const privateKey = secp256k1.utils.randomPrivateKey();
    const privateKeyHex = bytesToHex(privateKey);

    // Derive public key (compressed)
    const publicKey = secp256k1.getPublicKey(privateKey, true);
    const publicKeyHex = bytesToHex(publicKey);

    return {
        privateKey: privateKeyHex,
        publicKey: publicKeyHex
    };
}

/**
 * Compute shared secret using ECDH
 */
function computeSharedSecret(ephemeralPriv, recipientStealthPub) {
    try {
        const sharedPoint = secp256k1.ProjectivePoint.fromHex(recipientStealthPub).multiply(
            BigInt(`0x${ephemeralPriv}`)
        );
        return bytesToHex(sha256(sharedPoint.toRawBytes(true)));
    } catch (error) {
        console.error('Error computing shared secret:', error);
        return null;
    }
}

/**
 * Prepare stealth payment data
 * 
 * @param {string} recipientStealthPub - Recipient's stealth public key (66-char hex)
 * @param {number} amount - Amount to send
 * @param {string} chain - Blockchain (solana, ethereum, aptos)
 * @returns {Object} Payment data with ephemeral pubkey
 */
export function prepareStealthPayment(recipientStealthPub, amount, chain) {
    // Generate ephemeral keypair
    const ephemeral = generateEphemeralKeypair();

    // Compute shared secret (for verification, not strictly needed for sending)
    const sharedSecret = computeSharedSecret(ephemeral.privateKey, recipientStealthPub);

    // Prepare chain-specific data
    let paymentData = {
        recipientAddress: recipientStealthPub,
        amount,
        ephemeralPubKey: ephemeral.publicKey,
        ephemeralPrivKey: ephemeral.privateKey, // Keep for potential encryption
        sharedSecret,
        chain
    };

    // Add chain-specific formatting
    switch (chain.toLowerCase()) {
        case 'solana':
            // Solana: Use memo instruction
            paymentData.memo = `STEALTH:${ephemeral.publicKey}`;
            break;

        case 'ethereum':
            // Ethereum: Add to transaction data field
            paymentData.txData = `STEALTH:${ephemeral.publicKey}`;
            break;

        case 'aptos':
            // Aptos: Add to transaction payload
            paymentData.payload = {
                type: 'stealth_payment',
                ephemeralPubKey: ephemeral.publicKey
            };
            break;

        default:
            console.warn(`Unknown chain: ${chain}, using generic format`);
            paymentData.metadata = `STEALTH:${ephemeral.publicKey}`;
    }

    console.log('🎭 Prepared stealth payment:', {
        chain,
        recipientStealthPub: recipientStealthPub.substring(0, 10) + '...',
        ephemeralPubKey: ephemeral.publicKey.substring(0, 10) + '...',
        amount
    });

    return paymentData;
}

/**
 * Validate stealth address format
 */
export function validateStealthAddress(address) {
    if (!isStealthAddress(address)) {
        return {
            valid: false,
            error: 'Invalid stealth address format. Should be 66-character hex string starting with 02 or 03'
        };
    }

    try {
        // Try to parse as public key point
        secp256k1.ProjectivePoint.fromHex(address);
        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            error: 'Invalid stealth address: Not a valid secp256k1 public key'
        };
    }
}

/**
 * Extract ephemeral pubkey from prepared payment data
 */
export function getEphemeralPubKeyFromPaymentData(paymentData) {
    return paymentData.ephemeralPubKey;
}
