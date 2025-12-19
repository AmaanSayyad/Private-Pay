// Lightweight helper utilities for Zcash bridge simulation.
// Real wallet/tx helpers (zcash-bitcore-lib, bip39) are intentionally omitted
// for the simulation runner to avoid installing heavy native deps.

import { Buffer } from 'buffer';
import { encryptEnvelope, encryptEnvelopeAsymmetric } from '../relayer/envelope.js';
import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from 'bip39';
import zcash from 'zcash-bitcore-lib';
// Ensure Buffer is available globally if needed by the library
if (typeof window !== 'undefined') {
    window.Buffer = window.Buffer || Buffer;
}

/**
 * Address types supported
 */
export const AddressType = {
    TRANSPARENT: 'transparent',
    SHIELDED_SAPLING: 'sapling',
    SHIELDED_ORCHARD: 'orchard',
    UNIFIED: 'unified'
};

/**
 * Detect Zcash address type
 * @param {string} address - Zcash address
 * @returns {string} Address type
 */
export const detectAddressType = (address) => {
    if (!address || typeof address !== 'string') {
        throw new Error('Invalid address');
    }
    
    // Transparent addresses (t-addr)
    if (address.startsWith('t1') || address.startsWith('t3')) {
        return AddressType.TRANSPARENT;
    }
    
    // Shielded Sapling addresses (z-addr)
    if (address.startsWith('zs')) {
        return AddressType.SHIELDED_SAPLING;
    }
    
    // Shielded Orchard addresses
    if (address.startsWith('zo')) {
        return AddressType.SHIELDED_ORCHARD;
    }
    
    // Unified addresses (u-addr) - supports both transparent and shielded
    if (address.startsWith('u1') || address.startsWith('u3')) {
        return AddressType.UNIFIED;
    }
    
    throw new Error('Unknown address type');
};

/**
 * Check if address is shielded
 * @param {string} address - Zcash address
 * @returns {boolean} True if shielded
 */
export const isShieldedAddress = (address) => {
    const type = detectAddressType(address);
    return type === AddressType.SHIELDED_SAPLING || 
           type === AddressType.SHIELDED_ORCHARD ||
           type === AddressType.UNIFIED;
};

/**
 * Generate a new Zcash wallet with both transparent and shielded addresses
 * @param {number} wordCount - Mnemonic word count (12, 15, 18, 21, or 24)
 * @returns {Object} Wallet object with mnemonic and addresses
 */
export const generateZcashWallet = (wordCount = 12) => {
    const strength = {
        12: 128,
        15: 160,
        18: 192,
        21: 224,
        24: 256
    }[wordCount] || 128;
    
    const mnemonic = generateMnemonic(strength);
    return getWalletFromMnemonic(mnemonic);
};


/**
 * Recover wallet from Mnemonic
 * Creates both transparent and shielded address support
 * @param {string} mnemonic - BIP39 mnemonic phrase
 * @param {string} passphrase - Optional BIP39 passphrase
 * @returns {Object} Wallet object with addresses and keys
 */
export const getWalletFromMnemonic = (mnemonic, passphrase = '') => {
    if (!validateMnemonic(mnemonic)) {
        throw new Error("Invalid mnemonic");
    }

    const seed = mnemonicToSeedSync(mnemonic, passphrase);
    
    // Create HD Wallet (BIP32)
    // Zcash coin type is 133 (per SLIP-0044)
    // Path: m/44'/133'/0'/0/0 for transparent
    const hdPrivateKey = zcash.HDPrivateKey.fromSeed(seed.toString('hex'), zcash.Networks.testnet);
    const derived = hdPrivateKey.derive("m/44'/133'/0'/0/0");
    
    const privateKey = derived.privateKey;
    const transparentAddress = privateKey.toAddress(zcash.Networks.testnet).toString();

    return {
        mnemonic,
        passphrase,
        seed: seed.toString('hex'),
        
        // Transparent address info
        transparentAddress,
        privateKey: privateKey.toString(),
        wif: privateKey.toWIF(),
        
        // HD derivation path
        derivationPath: "m/44'/133'/0'/0/0",
        
        // Note: Shielded addresses (z-addr) are typically generated via RPC
        // as they require the Zcash SDK for proper Sapling/Orchard support
        // Store the seed to allow generation via RPC when needed
        supportsShielded: true,
        
        // Network
        network: 'testnet'
    };
};

/**
 * Derive HD key at specific path
 * @param {string} mnemonic - BIP39 mnemonic
 * @param {string} path - HD derivation path
 * @param {string} passphrase - Optional passphrase
 * @returns {Object} Derived key info
 */
export const deriveKeyAtPath = (mnemonic, path = "m/44'/133'/0'/0/0", passphrase = '') => {
    if (!validateMnemonic(mnemonic)) {
        throw new Error("Invalid mnemonic");
    }
    
    const seed = mnemonicToSeedSync(mnemonic, passphrase);
    const hdPrivateKey = zcash.HDPrivateKey.fromSeed(seed.toString('hex'), zcash.Networks.testnet);
    const derived = hdPrivateKey.derive(path);
    const privateKey = derived.privateKey;
    
    return {
        path,
        privateKey: privateKey.toString(),
        wif: privateKey.toWIF(),
        address: privateKey.toAddress(zcash.Networks.testnet).toString()
    };
};

/**
 * Validate Zcash Address
 * @param {string} address - Zcash address to validate
 * @returns {boolean} True if valid
 */
export const validateZcashAddress = (address) => {
    try {
        // Check transparent addresses using zcash-bitcore-lib
        if (address.startsWith('t')) {
            return zcash.Address.isValid(address, zcash.Networks.testnet);
        }
        
        // Basic validation for shielded addresses
        // z-addr Sapling: starts with 'zs', 78 chars
        if (address.startsWith('zs')) {
            return address.length === 78;
        }
        
        // z-addr Orchard: starts with 'zo'
        if (address.startsWith('zo')) {
            return address.length >= 78;
        }
        
        // Unified addresses: starts with 'u1' or 'u3'
        if (address.startsWith('u1') || address.startsWith('u3')) {
            return address.length >= 78;
        }
        
        return false;
    } catch (e) {
        return false;
    }
};

/**
 * Create viewing key from shielded address
 * Note: This is a placeholder - actual viewing keys are generated via RPC
 * @param {string} address - Shielded address
 * @returns {Object} Viewing key info
 */
export const getViewingKeyInfo = (address) => {
    if (!isShieldedAddress(address)) {
        throw new Error('Viewing keys only available for shielded addresses');
    }
    
    return {
        address,
        type: detectAddressType(address),
        requiresRPC: true,
        message: 'Viewing key must be exported via RPC using z_exportviewingkey'
    };
};

/**
 * Construct a simple transaction (Mocked for now as we don't have a backend UTXO provider)
 * In a real app, we would fetch UTXOs from Insight API or similar.
 * @param {string} privateKeyWIF - Private key in WIF format
 * @param {string} toAddress - Recipient address
 * @param {number} amount - Amount to send
 * @returns {Object} Mock transaction
 */
export const createZcashTransaction = (privateKeyWIF, toAddress, amount) => {
    // This is a placeholder. 
    // To implement real sending, we need a service to fetch UTXOs.
    // zcash-bitcore-lib requires inputs to sign.
    console.log("Constructing Zcash transaction for", toAddress, amount);
    return {
        txId: "mock-tx-id-" + Date.now(),
        raw: "mock-raw-tx"
    };
};

/**
 * Build an OP_RETURN payload for the bridge.
 * We encode a simple pipe-separated string and hex it for inclusion in asm.
 */
export const buildBridgeOpReturn = ({ commitment, nullifier, proof, envelope }) => {
    // Build payload with an encrypted envelope field to avoid putting recipient/amount
    // in plaintext on-chain. `envelope` is expected to be a base64 string (simulation).
    const payload = [commitment || '0x0', nullifier || '0x0', proof || '0x0', envelope || ''].join('|');
    const hex = Buffer.from(payload).toString('hex');
    return `OP_RETURN BRIDGE ${hex}`;
};

/**
 * Create a mock bridge transaction object for simulation.
 * Embeds the encrypted envelope in an OP_RETURN-style scriptPubKey.
 */
export const createMockBridgeTx = async ({ txid, commitment, nullifier, proof, amount, recipient }) => {
    // For simulation we create a simple base64-encoded envelope JSON and include
    // it in the OP_RETURN payload (hex-encoded). This avoids placing recipient
    // and amount in plaintext in the op-return string.
    const envelopeObj = { amount: amount || 0, recipient: recipient || '' };
    // If recipient looks like a public key hex, use asymmetric envelope
    let envelopeB64;
    if (recipient && recipient.startsWith('0x') && recipient.length >= 66) {
        // caller provided recipient as public key hex
        envelopeB64 = await encryptEnvelopeAsymmetric(envelopeObj, recipient);
    } else {
        envelopeB64 = encryptEnvelope(envelopeObj);
    }

    return {
        txid: txid || 'mock-tx-' + Date.now(),
        vout: [
            {
                scriptPubKey: {
                    asm: buildBridgeOpReturn({ commitment, nullifier, proof, envelope: envelopeB64 })
                }
            }
        ]
    };
};

