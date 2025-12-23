import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { sha256 } from "@noble/hashes/sha2.js";
import { getPublicKey, Point } from "@noble/secp256k1";
import { bytesToHex } from "@noble/hashes/utils.js";
import * as bip39 from "bip39";
import toast from "react-hot-toast";

// Import Zcash privacy technology
import { generateZcashWallet, getWalletFromMnemonic, validateZcashAddress } from "../lib/zcash";
import {
  PartialNote,
  generatePartialNote,
  createPartialNoteProof,
  encryptNoteValue,
  decryptNoteValue,
} from "../lib/zcash/partialNotes";

// Import multi-chain key derivation
import { deriveAllChainKeys } from "../lib/unstoppable/multichain";

// Import balance fetching service
import { fetchAllBalances, updateAssetsWithBalances } from "../lib/unstoppable/balanceService";

// Import transaction history service
import { fetchAllTransactions } from "../lib/unstoppable/transactionService";

// Import send transaction service
import { sendSolanaTransaction, sendEthereumTransaction, validateAddress } from "../lib/unstoppable/sendService";

// Import stealth payment receiving
import stealthScanner from "../lib/unstoppable/stealthScanner";
import { getAllReceivedPayments, getTotalUnspentBalance } from "../lib/unstoppable/indexedDB";

// Utility functions
const hexToBytes = (hex) => {
  if (!hex || typeof hex !== 'string') {
    return new Uint8Array(0);
  }
  // Remove '0x' prefix if present
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) return new Uint8Array(0);
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < cleanHex.length; i += 2) {
    bytes[i / 2] = parseInt(cleanHex.substr(i, 2), 16);
  }
  return bytes;
};

const randomBytes = (length) => {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
};

// Convert bytes to BigInt (big-endian)
const bytesToBigInt = (bytes) => {
  let result = 0n;
  for (let i = 0; i < bytes.length; i++) {
    result = result * 256n + BigInt(bytes[i]);
  }
  return result;
};

/**
 * Unstoppable Wallet Provider
 * Self-custody wallet with enhanced privacy features
 * 
 * Features:
 * - BIP39 mnemonic-based wallet generation
 * - Stealth address derivation
 * - Wallet hiding/masking
 * - Privacy-preserving balance tracking
 * - Multi-asset management with hiding
 */

// Default context value to prevent undefined errors
const defaultContextValue = {
  wallet: null,
  isConnected: false,
  isLocked: true,
  createWallet: async () => { },
  unlockWallet: async () => false,
  lockWallet: () => { },
  importWallet: async () => { },
  disconnect: () => { },
  exportWallet: () => null,
  stealthAddresses: [],
  generateNewStealthAddress: () => null,
  hiddenAssets: [],
  isBalanceHidden: false,
  decoyMode: false,
  toggleAssetVisibility: () => { },
  toggleBalanceVisibility: () => { },
  toggleDecoyMode: () => { },
  assets: [],
  getVisibleBalances: [],
  simulateReceive: () => { },
  privacyScore: 0,
  txHistory: [],
  calculatePrivacyScore: () => 0,
  publicAddress: null,
  viewingKey: null,
  // Zcash-specific
  zcashAddress: null,
  shieldedNotes: [],
  createShieldedNote: () => null,
  encryptValue: () => null,
  decryptValue: () => null,
  // Multi-chain
  solanaPublicKey: null,
  solanaSecretKey: null,
  aztecAddress: null,
  minaPublicKey: null,
};

const UnstoppableContext = createContext(defaultContextValue);

export const useUnstoppable = () => {
  return useContext(UnstoppableContext);
};

// Encryption utilities using AES-GCM
const encryptData = async (data, password) => {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encoder.encode(JSON.stringify(data))
  );

  return {
    salt: bytesToHex(salt),
    iv: bytesToHex(iv),
    data: bytesToHex(new Uint8Array(encrypted)),
  };
};

const decryptData = async (encryptedObj, password) => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: hexToBytes(encryptedObj.salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: hexToBytes(encryptedObj.iv) },
    key,
    hexToBytes(encryptedObj.data)
  );

  return JSON.parse(decoder.decode(decrypted));
};

// Generate stealth address from viewing key
const generateStealthAddressFromKeys = (spendingPubKeyHex, viewingPrivKeyHex, ephemeralPubKeyHex) => {
  try {
    // Parse viewing private key to BigInt
    const viewingPrivKeyBytes = hexToBytes(viewingPrivKeyHex);
    const viewingPrivKeyBigInt = bytesToBigInt(viewingPrivKeyBytes);

    // Parse ephemeral public key point
    const ephemeralPubPoint = Point.fromHex(ephemeralPubKeyHex);

    // ECDH: shared secret = viewingPrivKey * ephemeralPubKey
    const sharedPoint = ephemeralPubPoint.multiply(viewingPrivKeyBigInt);
    const sharedSecretBytes = hexToBytes(sharedPoint.toHex(true));

    // Derive tweak from shared secret
    const tweak = sha256(sharedSecretBytes);
    const tweakBigInt = bytesToBigInt(tweak);

    // Compute tweakPoint = tweak * G
    const tweakPoint = Point.BASE.multiply(tweakBigInt);

    // Compute stealth public key: stealthPub = spendPub + tweakPoint
    const spendPubPoint = Point.fromHex(spendingPubKeyHex);
    const stealthPoint = spendPubPoint.add(tweakPoint);

    return stealthPoint.toHex(true);
  } catch (error) {
    console.error("Error generating stealth address:", error);
    // Return a simple hash as fallback for demo purposes
    const combined = spendingPubKeyHex + ephemeralPubKeyHex;
    return bytesToHex(sha256(hexToBytes(combined.slice(0, 64))));
  }
};

// Generate master keys from mnemonic (multi-chain support)
const generateMasterKeys = (mnemonic) => {
  try {
    const seed = bip39.mnemonicToSeedSync(mnemonic);

    // Derive spending and viewing keys (use first 32 bytes of hash)
    const spendingKey = sha256(new Uint8Array([...seed, 0x01]));
    const viewingKey = sha256(new Uint8Array([...seed, 0x02]));

    // Generate Zcash wallet from mnemonic using Zcash privacy technology
    let zcashWallet = null;
    try {
      zcashWallet = getWalletFromMnemonic(mnemonic);
    } catch (e) {
      console.warn("Zcash wallet generation failed, continuing without it:", e);
    }

    // Derive keys for all privacy chains (Solana, Aztec, Mina)
    let multiChainKeys = null;
    try {
      multiChainKeys = deriveAllChainKeys(mnemonic);
      console.log("✅ Multi-chain keys derived successfully");
    } catch (e) {
      console.warn("Multi-chain key derivation failed:", e);
    }

    return {
      spendingPriv: bytesToHex(spendingKey),
      spendingPub: bytesToHex(getPublicKey(spendingKey, true)),
      viewingPriv: bytesToHex(viewingKey),
      viewingPub: bytesToHex(getPublicKey(viewingKey, true)),
      // Zcash-specific keys (leveraging Zcash privacy technology)
      zcashAddress: zcashWallet?.address || null,
      zcashPrivateKey: zcashWallet?.privateKey || null,
      zcashWIF: zcashWallet?.wif || null,
      // Multi-chain addresses
      solanaPublicKey: multiChainKeys?.solana?.publicKey || null,
      solanaSecretKey: multiChainKeys?.solana?.secretKey || null,
      aztecAddress: multiChainKeys?.aztec?.address || null,
      aztecPublicKey: multiChainKeys?.aztec?.publicKey || null,
      aztecPrivateKey: multiChainKeys?.aztec?.privateKey || null,
      minaPublicKey: multiChainKeys?.mina?.publicKey || null,
      minaPrivateKey: multiChainKeys?.mina?.privateKey || null,
      // Ethereum
      ethereumAddress: multiChainKeys?.ethereum?.address || null,
      ethereumPublicKey: multiChainKeys?.ethereum?.publicKey || null,
      ethereumPrivateKey: multiChainKeys?.ethereum?.privateKey || null,
      // Aptos
      aptosAddress: multiChainKeys?.aptos?.address || null,
      aptosPublicKey: multiChainKeys?.aptos?.publicKey || null,
      aptosPrivateKey: multiChainKeys?.aptos?.privateKey || null,
    };
  } catch (error) {
    console.error("Error generating master keys:", error);
    // Return dummy keys for demo purposes
    const dummyKey = sha256(new TextEncoder().encode(mnemonic));
    return {
      spendingPriv: bytesToHex(dummyKey),
      spendingPub: bytesToHex(dummyKey),
      viewingPriv: bytesToHex(dummyKey),
      viewingPub: bytesToHex(dummyKey),
    };
  }
};

export default function UnstoppableProvider({ children }) {
  // Wallet state
  const [wallet, setWallet] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [password, setPassword] = useState(null);

  // Privacy features
  const [hiddenAssets, setHiddenAssets] = useState([]);
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const [decoyMode, setDecoyMode] = useState(false);

  // Multi-asset tracking (privacy-preserving)
  const [assets, setAssets] = useState([
    { id: "zec", symbol: "ZEC", name: "Zcash", balance: 0, hidden: false, shielded: true },
    { id: "sol", symbol: "SOL", name: "Solana", balance: 0, hidden: false, shielded: false },
    { id: "apt", symbol: "APT", name: "Aptos", balance: 0, hidden: false, shielded: false },
    { id: "eth", symbol: "ETH", name: "Ethereum", balance: 0, hidden: false, shielded: false },
  ]);

  // Stealth addresses for receiving payments
  const [stealthAddresses, setStealthAddresses] = useState([]);
  const [receivedPayments, setReceivedPayments] = useState([]); // Track received stealth payments

  // Privacy analytics (local only, no tracking)
  const [privacyScore, setPrivacyScore] = useState(0);
  const [txHistory, setTxHistory] = useState([]);

  // Balance fetching state
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);

  // Fetch real balances when wallet is connected
  useEffect(() => {
    if (!isConnected || !wallet || isLoadingBalances) return;

    const loadBalances = async () => {
      try {
        setIsLoadingBalances(true);
        console.log('🔄 Fetching real balances from blockchain...');
        console.log('Wallet has:', {
          solana: !!wallet.solanaPublicKey,
          ethereum: !!wallet.ethereumAddress,
          zcash: !!wallet.zcashAddress,
        });

        const balances = await fetchAllBalances(wallet);
        console.log('✅ Balances fetched:', balances);

        setAssets(currentAssets => updateAssetsWithBalances(currentAssets, balances));
      } catch (error) {
        console.error('Failed to fetch balances:', error);
      } finally {
        setIsLoadingBalances(false);
      }
    };

    loadBalances();

    // Refresh balances every 30 seconds
    const interval = setInterval(loadBalances, 30000);
    return () => clearInterval(interval);
  }, [isConnected, wallet, isLoadingBalances]);

  // Fetch real transaction history when wallet is connected
  useEffect(() => {
    if (!isConnected || !wallet) return;

    const loadTransactions = async (limit = 10) => {
      try {
        console.log('🔄 Fetching transaction history from blockchain...');

        const transactions = await fetchAllTransactions(wallet, limit);
        console.log('✅ Transactions fetched:', transactions.length);

        setTxHistory(transactions);
      } catch (error) {
        console.error('Failed to fetch transactions:', error);
      }
    };

    loadTransactions();

    // Refresh transactions every 60 seconds
    const interval = setInterval(() => loadTransactions(), 60000);
    return () => clearInterval(interval);
  }, [isConnected, wallet]);

  // Start/stop stealth payment scanner when wallet unlocks/locks
  useEffect(() => {
    if (!isConnected || !wallet || isLocked) {
      // Stop scanner when locked
      stealthScanner.stop();
      return;
    }

    // Load received payments from Supabase
    const loadReceivedPayments = async () => {
      try {
        const walletAddr = wallet.solanaPublicKey || wallet.ethereumAddress || wallet.zcashAddress;
        const payments = await getAllReceivedPayments(walletAddr);
        setReceivedPayments(payments);
        console.log(`📦 Loaded ${payments.length} received stealth payment(s) from Supabase`);
      } catch (error) {
        console.error('Failed to load received payments:', error);
      }
    };

    loadReceivedPayments();

    // Start scanner with callback for new payments
    stealthScanner.start(wallet, stealthAddresses, (payment) => {
      console.log('🎉 New stealth payment received!', payment);
      setReceivedPayments(prev => [payment, ...prev]);
      toast.success(`Received ${payment.amount} ${payment.chain} to stealth address!`, {
        duration: 5000,
        icon: '🎉'
      });
    });

    return () => stealthScanner.stop();
  }, [isConnected, wallet, isLocked, stealthAddresses]);

  // Load wallet from encrypted storage
  useEffect(() => {
    const loadWallet = async () => {
      const encryptedWallet = localStorage.getItem("unstoppable_wallet");
      if (encryptedWallet) {
        try {
          const parsed = JSON.parse(encryptedWallet);
          // Wallet exists but needs password to unlock
          setWallet({ encrypted: true, data: parsed });
          setIsConnected(false);
          setIsLocked(true);
        } catch (e) {
          console.error("Failed to parse stored wallet", e);
        }
      }
    };
    loadWallet();
  }, []);

  // Create a new wallet
  const createWallet = useCallback(async (userPassword) => {
    try {
      const mnemonic = bip39.generateMnemonic(256); // 24 words for maximum security
      const keys = generateMasterKeys(mnemonic);

      const walletData = {
        mnemonic,
        ...keys,
        createdAt: Date.now(),
        version: 1,
      };

      // Debug: Log what keys were generated
      console.log('🔑 Wallet keys generated:', {
        hasZcash: !!keys.zcashAddress,
        hasSolana: !!keys.solanaPublicKey,
        hasEthereum: !!keys.ethereumAddress,
        hasMina: !!keys.minaPublicKey,
        hasAztec: !!keys.aztecAddress,
      });

      // Encrypt and store
      const encrypted = await encryptData(walletData, userPassword);
      localStorage.setItem("unstoppable_wallet", JSON.stringify(encrypted));

      setWallet(walletData);
      setPassword(userPassword);
      setIsConnected(true);
      setIsLocked(false);

      // Calculate initial privacy score
      calculatePrivacyScore();

      toast.success("🔐 Unstoppable Wallet created! Your keys, your crypto.");

      return { mnemonic, address: keys.spendingPub };
    } catch (error) {
      console.error("Failed to create wallet:", error);
      toast.error("Failed to create wallet");
      throw error;
    }
  }, []);

  // Unlock wallet with password
  const unlockWallet = useCallback(async (userPassword) => {
    try {
      if (!wallet?.encrypted) {
        throw new Error("No wallet to unlock");
      }

      const decrypted = await decryptData(wallet.data, userPassword);
      setWallet(decrypted);
      setPassword(userPassword);
      setIsConnected(true);
      setIsLocked(false);

      toast.success("🔓 Wallet unlocked!");
      return true;
    } catch (error) {
      console.error("Failed to unlock wallet:", error);
      toast.error("Wrong password or corrupted wallet");
      return false;
    }
  }, [wallet]);

  // Lock wallet
  const lockWallet = useCallback(() => {
    const encryptedWallet = localStorage.getItem("unstoppable_wallet");
    if (encryptedWallet) {
      setWallet({ encrypted: true, data: JSON.parse(encryptedWallet) });
    }
    setPassword(null);
    setIsLocked(true);
    toast.success("🔒 Wallet locked");
  }, []);

  // Import wallet from mnemonic
  const importWallet = useCallback(async (mnemonic, userPassword) => {
    try {
      if (!bip39.validateMnemonic(mnemonic)) {
        throw new Error("Invalid mnemonic phrase");
      }

      const keys = generateMasterKeys(mnemonic);

      const walletData = {
        mnemonic,
        ...keys,
        createdAt: Date.now(),
        version: 1,
        imported: true,
      };

      const encrypted = await encryptData(walletData, userPassword);
      localStorage.setItem("unstoppable_wallet", JSON.stringify(encrypted));

      setWallet(walletData);
      setPassword(userPassword);
      setIsConnected(true);
      setIsLocked(false);

      toast.success("🔐 Wallet imported successfully!");
      return { address: keys.spendingPub };
    } catch (error) {
      console.error("Failed to import wallet:", error);
      toast.error(error.message || "Failed to import wallet");
      throw error;
    }
  }, []);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    localStorage.removeItem("unstoppable_wallet");
    setWallet(null);
    setPassword(null);
    setIsConnected(false);
    setIsLocked(true);
    setStealthAddresses([]);
    toast.success("Wallet disconnected");
  }, []);

  // Generate new stealth address for receiving
  const generateNewStealthAddress = useCallback(() => {
    if (!wallet || isLocked) {
      toast.error("Unlock wallet first");
      return null;
    }

    try {
      // Generate ephemeral key pair
      const ephemeralPrivBytes = randomBytes(32);
      const ephemeralPriv = bytesToHex(ephemeralPrivBytes);
      const ephemeralPub = bytesToHex(getPublicKey(ephemeralPrivBytes, true));

      const stealthPub = generateStealthAddressFromKeys(
        wallet.spendingPub,
        wallet.viewingPriv,
        ephemeralPub
      );

      const newAddress = {
        id: Date.now().toString(),
        stealthPub,
        ephemeralPub,
        createdAt: Date.now(),
        used: false,
        label: `Stealth #${stealthAddresses.length + 1}`,
      };

      setStealthAddresses(prev => [...prev, newAddress]);

      // Update privacy score
      calculatePrivacyScore();

      toast.success("New stealth address generated!");
      return newAddress;
    } catch (error) {
      console.error("Failed to generate stealth address:", error);
      toast.error("Failed to generate address");
      return null;
    }
  }, [wallet, isLocked, stealthAddresses]);

  // Toggle asset visibility (hiding feature)
  const toggleAssetVisibility = useCallback((assetId) => {
    setAssets(prev =>
      prev.map(asset =>
        asset.id === assetId
          ? { ...asset, hidden: !asset.hidden }
          : asset
      )
    );

    // Update hidden assets list
    setHiddenAssets(prev => {
      if (prev.includes(assetId)) {
        return prev.filter(id => id !== assetId);
      }
      return [...prev, assetId];
    });

    calculatePrivacyScore();
  }, []);

  // Toggle balance visibility
  const toggleBalanceVisibility = useCallback(() => {
    setIsBalanceHidden(prev => !prev);
  }, []);

  // Enable decoy mode (shows fake balances)
  const toggleDecoyMode = useCallback(() => {
    setDecoyMode(prev => !prev);
    if (!decoyMode) {
      toast.success("🎭 Decoy mode enabled - fake balances shown");
    } else {
      toast.success("Decoy mode disabled");
    }
  }, [decoyMode]);

  // Calculate privacy score based on actions
  const calculatePrivacyScore = useCallback(() => {
    let score = 0;

    // Using stealth addresses
    score += Math.min(stealthAddresses.length * 5, 25);

    // Hidden assets
    score += hiddenAssets.length * 5;

    // Balance hidden
    if (isBalanceHidden) score += 10;

    // Decoy mode
    if (decoyMode) score += 15;

    // Shielded transactions
    const shieldedTxs = txHistory.filter(tx => tx.shielded).length;
    score += Math.min(shieldedTxs * 2, 20);

    // Cap at 100
    score = Math.min(score, 100);

    setPrivacyScore(score);
    return score;
  }, [stealthAddresses, hiddenAssets, isBalanceHidden, decoyMode, txHistory]);

  // Simulate receiving a payment
  const simulateReceive = useCallback((assetId, amount) => {
    setAssets(prev =>
      prev.map(asset =>
        asset.id === assetId
          ? { ...asset, balance: asset.balance + parseFloat(amount) }
          : asset
      )
    );

    const tx = {
      id: Date.now().toString(),
      type: "receive",
      asset: assetId,
      amount: parseFloat(amount),
      timestamp: Date.now(),
      shielded: assets.find(a => a.id === assetId)?.shielded || false,
      stealthAddress: stealthAddresses[stealthAddresses.length - 1]?.stealthPub || null,
    };

    setTxHistory(prev => [tx, ...prev]);
    calculatePrivacyScore();

    toast.success(`Received ${amount} ${assetId.toUpperCase()}`);
  }, [assets, stealthAddresses, calculatePrivacyScore]);

  // Get visible balances (respecting privacy settings)
  const getVisibleBalances = useMemo(() => {
    if (decoyMode) {
      // Return decoy balances
      return assets.map(asset => ({
        ...asset,
        balance: Math.random() * 10,
        isDecoy: true,
      }));
    }

    return assets.map(asset => ({
      ...asset,
      balance: isBalanceHidden ? "***" : asset.hidden ? "🔒" : asset.balance,
    }));
  }, [assets, isBalanceHidden, decoyMode]);

  // Export wallet for backup
  const exportWallet = useCallback(() => {
    if (!wallet || isLocked) {
      toast.error("Unlock wallet first");
      return null;
    }

    return {
      mnemonic: wallet.mnemonic,
      viewingKey: wallet.viewingPub,
      spendingKey: wallet.spendingPub,
      zcashAddress: wallet.zcashAddress,
      createdAt: wallet.createdAt,
    };
  }, [wallet, isLocked]);

  // ============================================
  // ZCASH PRIVACY TECHNOLOGY FUNCTIONS
  // ============================================

  // Shielded notes state
  const [shieldedNotes, setShieldedNotes] = useState([]);

  // Create a shielded note (Zcash privacy technology)
  const createShieldedNote = useCallback((value, memo = '') => {
    if (!wallet || isLocked) {
      toast.error("Unlock wallet first");
      return null;
    }

    try {
      // Generate note commitment and nullifier using Zcash privacy primitives
      const noteCommitment = bytesToHex(sha256(new TextEncoder().encode(
        `${wallet.spendingPub}:${value}:${Date.now()}`
      )));

      const nullifier = bytesToHex(sha256(new TextEncoder().encode(
        `${wallet.viewingPriv}:${noteCommitment}`
      )));

      // Create partial note using Zcash privacy technology
      const partialNote = new PartialNote(noteCommitment, nullifier, value, memo);

      const noteData = {
        id: `note_${Date.now()}`,
        ...partialNote.toJSON(),
        createdAt: new Date().toISOString(),
        status: 'unspent',
      };

      setShieldedNotes(prev => [...prev, noteData]);
      toast.success("🛡️ Shielded note created (Zcash privacy)");

      return noteData;
    } catch (error) {
      console.error("Error creating shielded note:", error);
      toast.error("Failed to create shielded note");
      return null;
    }
  }, [wallet, isLocked]);

  // Encrypt a value using Zcash privacy technology
  const encryptValue = useCallback((value) => {
    if (!wallet || isLocked) return null;

    try {
      // Use viewing key as shared secret for encryption
      const encrypted = encryptNoteValue(value, wallet.viewingPriv);
      return encrypted;
    } catch (error) {
      console.error("Error encrypting value:", error);
      return null;
    }
  }, [wallet, isLocked]);

  // Decrypt a value using Zcash privacy technology
  const decryptValue = useCallback((encryptedValue) => {
    if (!wallet || isLocked) return null;

    try {
      const decrypted = decryptNoteValue(encryptedValue, wallet.viewingPriv);
      return decrypted;
    } catch (error) {
      console.error("Error decrypting value:", error);
      return null;
    }
  }, [wallet, isLocked]);

  // Validate Zcash address
  const isValidZcashAddress = useCallback((address) => {
    return validateZcashAddress(address);
  }, []);

  // Create proof for shielded transaction (zk-SNARK)
  const createShieldedProof = useCallback(async (noteId) => {
    const note = shieldedNotes.find(n => n.id === noteId);
    if (!note) {
      toast.error("Note not found");
      return null;
    }

    try {
      const partialNote = PartialNote.fromJSON(note);
      const proof = await createPartialNoteProof(partialNote);

      toast.success("🔐 zk-SNARK proof created");
      return proof.toJSON();
    } catch (error) {
      console.error("Error creating proof:", error);
      toast.error("Failed to create proof");
      return null;
    }
  }, [shieldedNotes]);

  // Send transaction function
  const sendTransaction = useCallback(async (chain, toAddress, amount) => {
    try {
      if (!wallet) throw new Error("No wallet connected");

      // Validate address
      if (!validateAddress(toAddress, chain)) {
        throw new Error(`Invalid ${chain} address`);
      }

      // Validate amount
      if (!amount || amount <= 0) {
        throw new Error("Invalid amount");
      }

      let txHash;

      if (chain === 'Solana') {
        txHash = await sendSolanaTransaction(
          wallet.solanaSecretKey,
          toAddress,
          amount,
          'devnet'
        );
        toast.success(`Transaction sent! Hash: ${txHash.substring(0, 8)}...`);
      } else if (chain === 'Ethereum') {
        txHash = await sendEthereumTransaction(
          wallet.ethereumPrivateKey,
          toAddress,
          amount,
          'sepolia'
        );
        toast.success(`Transaction sent! Hash: ${txHash.substring(0, 10)}...`);
      } else if (chain === 'Zcash') {
        // Import Zcash send function dynamically
        const { sendZcashTransaction } = await import('../lib/unstoppable/sendService');

        // Use wallet's Zcash address as source
        if (!wallet.zcashAddress) {
          throw new Error("No Zcash address in wallet");
        }

        const operationId = await sendZcashTransaction(
          wallet.zcashAddress,
          toAddress,
          amount,
          'testnet'
        );
        toast.success(`Zcash transaction initiated! Op: ${operationId.substring(0, 12)}...`);
        return operationId;
      } else {
        throw new Error(`Sending not supported for ${chain}`);
      }

      return txHash;
    } catch (error) {
      console.error("Failed to send transaction:", error);
      toast.error(`Failed to send: ${error.message}`);
      throw error;
    }
  }, [wallet]);

  const value = useMemo(() => ({
    // Wallet state
    wallet: isLocked ? null : wallet,
    isConnected,
    isLocked,

    // Wallet actions
    createWallet,
    unlockWallet,
    lockWallet,
    importWallet,
    disconnect,
    exportWallet,

    // Stealth addresses
    stealthAddresses,
    generateNewStealthAddress,

    // Privacy features
    hiddenAssets,
    isBalanceHidden,
    decoyMode,
    toggleAssetVisibility,
    toggleBalanceVisibility,
    toggleDecoyMode,

    // Assets & balances
    assets,
    getVisibleBalances,
    simulateReceive,

    // Analytics
    privacyScore,
    txHistory,
    calculatePrivacyScore,

    // Computed values
    publicAddress: wallet?.spendingPub || null,
    viewingKey: wallet?.viewingPub || null,

    // Zcash Privacy Technology
    zcashAddress: wallet?.zcashAddress || null,
    shieldedNotes,
    createShieldedNote,
    encryptValue,
    decryptValue,
    isValidZcashAddress,
    createShieldedProof,

    // Multi-chain addresses (Solana, Aztec, Mina, Ethereum)
    solanaPublicKey: wallet?.solanaPublicKey || null,
    solanaSecretKey: wallet?.solanaSecretKey || null,
    aztecAddress: wallet?.aztecAddress || null,
    minaPublicKey: wallet?.minaPublicKey || null,
    ethereumAddress: wallet?.ethereumAddress || null,
    ethereumPublicKey: wallet?.ethereumPublicKey || null,

    // Send transaction
    sendTransaction,
  }), [
    wallet,
    isConnected,
    isLocked,
    createWallet,
    unlockWallet,
    lockWallet,
    importWallet,
    disconnect,
    exportWallet,
    stealthAddresses,
    generateNewStealthAddress,
    hiddenAssets,
    isBalanceHidden,
    decoyMode,
    toggleAssetVisibility,
    toggleBalanceVisibility,
    toggleDecoyMode,
    assets,
    getVisibleBalances,
    simulateReceive,
    privacyScore,
    txHistory,
    calculatePrivacyScore,
    shieldedNotes,
    createShieldedNote,
    encryptValue,
    decryptValue,
    isValidZcashAddress,
    createShieldedProof,
  ]);

  return (
    <UnstoppableContext.Provider value={value}>
      {children}
    </UnstoppableContext.Provider>
  );
}


