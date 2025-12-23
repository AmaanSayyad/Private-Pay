/**
 * Arcium Client
 * 
 * High-level client for interacting with Arcium MPC programs on Solana.
 */

import { PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import BN from "bn.js";
import {
  ARCIUM_PROGRAM_ID,
  PRIVATE_PAY_PROGRAM_ID,
  ARCIUM_DEVNET_CLUSTER_OFFSET,
  ACCOUNT_SEEDS,
} from "./constants.js";
import {
  generateKeyPair,
  deriveSharedSecret,
  createCipher,
  generateNonce,
  nonceToU128,
} from "./encryption.js";

/**
 * ArciumClient - Main interface for Arcium MPC operations
 */
export class ArciumClient {
  constructor(connection, wallet, programId = PRIVATE_PAY_PROGRAM_ID) {
    this.connection = connection;
    this.wallet = wallet;
    this.programId = programId;
    this.mxePublicKey = null;
    this.keyPair = null;
    this.sharedSecret = null;
    this.cipher = null;
    this.clusterOffset = ARCIUM_DEVNET_CLUSTER_OFFSET;
  }

  /**
   * Initialize the client and establish encrypted connection with MXE
   */
  async initialize() {
    // Generate our keypair for encryption
    this.keyPair = generateKeyPair();

    // Fetch MXE public key from chain
    // Will use getMXEPublicKey from @arcium-hq/client
    this.mxePublicKey = await this.fetchMXEPublicKey();

    if (this.mxePublicKey) {
      // Derive shared secret for encryption
      this.sharedSecret = deriveSharedSecret(
        this.keyPair.privateKey,
        this.mxePublicKey
      );
      this.cipher = createCipher(this.sharedSecret);
    }

    return this;
  }

  /**
   * Fetch MXE public key from on-chain account
   */
  async fetchMXEPublicKey() {
    try {
      const mxeAddress = this.getMXEAddress();
      const accountInfo = await this.connection.getAccountInfo(mxeAddress);

      if (accountInfo) {
        // Extract x25519 public key from MXE account data
        // The actual offset and structure depends on Arcium's account layout
        // This will be refined when using actual @arcium-hq/client
        return accountInfo.data.slice(8, 40); // Placeholder offset
      }
      return null;
    } catch (error) {
      console.error("Failed to fetch MXE public key:", error);
      return null;
    }
  }

  /**
   * Get MXE PDA address
   */
  getMXEAddress() {
    const [mxePDA] = PublicKey.findProgramAddressSync(
      [ACCOUNT_SEEDS.MXE, this.programId.toBuffer()],
      ARCIUM_PROGRAM_ID
    );
    return mxePDA;
  }

  /**
   * Get Mempool PDA address
   */
  getMempoolAddress() {
    const [mempoolPDA] = PublicKey.findProgramAddressSync(
      [
        ACCOUNT_SEEDS.MEMPOOL,
        new BN(this.clusterOffset).toArrayLike(Buffer, "le", 8),
      ],
      ARCIUM_PROGRAM_ID
    );
    return mempoolPDA;
  }

  /**
   * Get Executing Pool PDA address
   */
  getExecutingPoolAddress() {
    const [execPoolPDA] = PublicKey.findProgramAddressSync(
      [
        ACCOUNT_SEEDS.EXECPOOL,
        new BN(this.clusterOffset).toArrayLike(Buffer, "le", 8),
      ],
      ARCIUM_PROGRAM_ID
    );
    return execPoolPDA;
  }

  /**
   * Get Cluster PDA address
   */
  getClusterAddress() {
    const [clusterPDA] = PublicKey.findProgramAddressSync(
      [
        ACCOUNT_SEEDS.CLUSTER,
        new BN(this.clusterOffset).toArrayLike(Buffer, "le", 8),
      ],
      ARCIUM_PROGRAM_ID
    );
    return clusterPDA;
  }

  /**
   * Get Computation Definition PDA address
   */
  getCompDefAddress(instructionName) {
    // Calculate offset from instruction name (simplified)
    const offset = this.calculateCompDefOffset(instructionName);
    const [compDefPDA] = PublicKey.findProgramAddressSync(
      [
        ACCOUNT_SEEDS.COMP_DEF,
        this.programId.toBuffer(),
        new BN(offset).toArrayLike(Buffer, "le", 4),
      ],
      ARCIUM_PROGRAM_ID
    );
    return compDefPDA;
  }

  /**
   * Get Computation PDA address for a specific computation
   */
  getComputationAddress(computationOffset) {
    const [computationPDA] = PublicKey.findProgramAddressSync(
      [
        ACCOUNT_SEEDS.COMPUTATION,
        new BN(this.clusterOffset).toArrayLike(Buffer, "le", 8),
        computationOffset.toArrayLike(Buffer, "le", 8),
      ],
      ARCIUM_PROGRAM_ID
    );
    return computationPDA;
  }

  /**
   * Calculate computation definition offset from instruction name
   */
  calculateCompDefOffset(instructionName) {
    // Simple hash-based offset calculation
    // In production, use getCompDefAccOffset from @arcium-hq/client
    let hash = 0;
    for (let i = 0; i < instructionName.length; i++) {
      hash = (hash << 5) - hash + instructionName.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /**
   * Encrypt values for MPC computation
   */
  encryptValues(values) {
    if (!this.cipher) {
      throw new Error("Client not initialized. Call initialize() first.");
    }

    const nonce = generateNonce();
    const plaintext = values.map((v) => BigInt(v));
    const ciphertexts = this.cipher.encrypt(plaintext, nonce);

    return {
      ciphertexts,
      nonce,
      nonceU128: nonceToU128(nonce),
      publicKey: this.keyPair.publicKey,
    };
  }

  /**
   * Decrypt values from MPC result
   */
  decryptValues(ciphertexts, nonce) {
    if (!this.cipher) {
      throw new Error("Client not initialized. Call initialize() first.");
    }

    return this.cipher.decrypt(ciphertexts, nonce);
  }

  /**
   * Generate a random computation offset
   */
  generateComputationOffset() {
    const bytes = new Uint8Array(8);
    if (typeof window !== "undefined" && window.crypto) {
      window.crypto.getRandomValues(bytes);
    }
    return new BN(bytes, "le");
  }

  /**
   * Wait for computation to finalize
   */
  async awaitComputationFinalization(computationOffset, commitment = "confirmed") {
    // Will use awaitComputationFinalization from @arcium-hq/client
    // For now, poll the computation account
    const computationAddress = this.getComputationAddress(computationOffset);

    let attempts = 0;
    const maxAttempts = 60;
    const pollInterval = 1000;

    while (attempts < maxAttempts) {
      const accountInfo = await this.connection.getAccountInfo(
        computationAddress,
        commitment
      );

      if (accountInfo) {
        // Check if computation is finalized
        // Actual check depends on Arcium's account structure
        const isFinalized = accountInfo.data[0] === 1; // Placeholder
        if (isFinalized) {
          return true;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;
    }

    throw new Error("Computation finalization timeout");
  }
}

/**
 * Create and initialize an Arcium client
 */
export async function createArciumClient(connection, wallet, programId) {
  const client = new ArciumClient(connection, wallet, programId);
  await client.initialize();
  return client;
}












