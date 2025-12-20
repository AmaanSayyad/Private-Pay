/**
 * Multi-Chain Key Derivation for Unstoppable Wallet
 * 
 * Derives cryptographic keys for multiple privacy-focused blockchains
 * from a single BIP39 mnemonic using BIP44 derivation paths.
 * 
 * Supported Chains:
 * - Solana (BIP44: m/44'/501'/0'/0')
 * - Aztec (Custom derivation)
 * - Mina (BIP44: m/44'/12586'/0'/0')
 */

import * as bip39 from 'bip39';
import { derivePath } from 'ed25519-hd-key';
import nacl from 'tweetnacl';
import { Keypair } from '@solana/web3.js';
import { ethers } from 'ethers';

/**
 * Derive Solana keypair from BIP39 mnemonic
 * Uses BIP44 path: m/44'/501'/0'/0'
 */
export function deriveSolanaKeypair(mnemonic) {
    try {
        // Validate mnemonic
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('Invalid mnemonic phrase');
        }

        // Convert mnemonic to seed
        const seed = bip39.mnemonicToSeedSync(mnemonic);

        // BIP44 derivation path for Solana
        // m/44'/501'/0'/0' (501 is Solana's coin type)
        const path = "m/44'/501'/0'/0'";

        // Derive key from path
        const derivedSeed = derivePath(path, seed.toString('hex')).key;

        // Create Solana keypair from derived seed
        const keypair = Keypair.fromSeed(derivedSeed);

        return {
            publicKey: keypair.publicKey.toBase58(),
            secretKey: Buffer.from(keypair.secretKey).toString('base64'),
            keypair, // For signing transactions
        };
    } catch (error) {
        console.error('Failed to derive Solana keypair:', error);
        throw error;
    }
}

/**
 * Derive Aztec keys from BIP39 mnemonic
 * Uses custom Aztec derivation
 */
export function deriveAztecKeys(mnemonic) {
    try {
        // Validate mnemonic
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('Invalid mnemonic phrase');
        }

        // Convert mnemonic to seed
        const seed = bip39.mnemonicToSeedSync(mnemonic);

        // Aztec uses a custom derivation path
        // For now, using a similar BIP44 structure  
        // NOTE: ed25519-hd-key requires ALL segments to be hardened
        const path = "m/44'/60'/0'/0'"; // Using Ethereum's coin type as placeholder

        // Derive key from path
        const derivedSeed = derivePath(path, seed.toString('hex')).key;

        // Generate Aztec-compatible keypair
        const keypair = nacl.sign.keyPair.fromSeed(derivedSeed);

        return {
            address: Buffer.from(keypair.publicKey).toString('hex'),
            publicKey: Buffer.from(keypair.publicKey).toString('base64'),
            privateKey: Buffer.from(keypair.secretKey).toString('base64'),
        };
    } catch (error) {
        console.error('Failed to derive Aztec keys:', error);
        throw error;
    }
}

/**
 * Derive Mina keypair from BIP39 mnemonic
 * Uses BIP44 path: m/44'/12586'/0'/0'
 */
export function deriveMinaKeys(mnemonic) {
    try {
        // Validate mnemonic
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('Invalid mnemonic phrase');
        }

        // Convert mnemonic to seed
        const seed = bip39.mnemonicToSeedSync(mnemonic);

        // BIP44 derivation path for Mina
        // m/44'/12586'/0'/0' (12586 is Mina's coin type)
        const path = "m/44'/12586'/0'/0'";

        // Derive key from path
        const derivedSeed = derivePath(path, seed.toString('hex')).key;

        // Generate Mina-compatible keypair
        const keypair = nacl.sign.keyPair.fromSeed(derivedSeed);

        return {
            publicKey: Buffer.from(keypair.publicKey).toString('base64'),
            privateKey: Buffer.from(keypair.secretKey).toString('base64'),
        };
    } catch (error) {
        console.error('Failed to derive Mina keys:', error);
        throw error;
    }
}

/**
 * Derive Ethereum keypair from BIP39 mnemonic
 * Uses BIP44 path: m/44'/60'/0'/0/0
 */
export function deriveEthereumKeys(mnemonic) {
    try {
        // Validate mnemonic
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('Invalid mnemonic phrase');
        }

        // BIP44 derivation path for Ethereum
        // m/44'/60'/0'/0/0 (60 is Ethereum's coin type)
        const path = "m/44'/60'/0'/0/0";

        // Create HD wallet from mnemonic with path directly
        const wallet = ethers.HDNodeWallet.fromPhrase(mnemonic, undefined, path);

        return {
            address: wallet.address,
            publicKey: wallet.publicKey,
            privateKey: wallet.privateKey,
        };
    } catch (error) {
        console.error('Failed to derive Ethereum keys:', error);
        throw error;
    }
}

/**
 * Derive all chain keys from a single mnemonic
 * Returns keys for Solana, Aztec, Mina, and Ethereum
 */
export function deriveAllChainKeys(mnemonic) {
    return {
        solana: deriveSolanaKeypair(mnemonic),
        aztec: deriveAztecKeys(mnemonic),
        mina: deriveMinaKeys(mnemonic),
        ethereum: deriveEthereumKeys(mnemonic),
    };
}

/**
 * Get Solana keypair for signing transactions
 * Used by Arcium and other Solana-based features
 */
export function getSolanaKeypairFromSecretKey(secretKeyBase64) {
    try {
        const secretKey = Buffer.from(secretKeyBase64, 'base64');
        return Keypair.fromSecretKey(secretKey);
    } catch (error) {
        console.error('Failed to restore Solana keypair:', error);
        throw error;
    }
}
