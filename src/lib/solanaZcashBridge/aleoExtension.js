/**
 * Aleo Extension for Solana-Zcash Bridge
 * Enables three-way bridge routing: Solana ↔ Aleo ↔ Zcash
 */

import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import { SolanaZcashBridgeClient } from './client.js';
import {
  deriveBridgeStatePDA,
  deriveVaultPDA,
  deriveDepositTicketPDA,
  deriveWithdrawalTicketPDA,
  BRIDGE_CONSTANTS,
} from './index.js';

// Aleo-specific constants
const ALEO_BRIDGE_CONSTANTS = {
  ALEO_CHAIN_ID: 'aleo-testnet',
  ALEO_PROGRAM_ID: 'cross_chain_vault.aleo',
  MIN_ALEO_DEPOSIT: 0.1, // Minimum deposit for Aleo routing
  MAX_ALEO_DEPOSIT: 1000, // Maximum deposit for Aleo routing
  ALEO_BRIDGE_FEE_BPS: 50, // 0.5% fee for Aleo routing
};

/**
 * Extended Solana-Zcash Bridge Client with Aleo routing support
 */
export class SolanaZcashAleoExtendedClient extends SolanaZcashBridgeClient {
  constructor(connection, wallet, heliusClient = null, aleoProvider = null) {
    super(connection, wallet, heliusClient);
    this.aleoProvider = aleoProvider;
    this.aleoRoutes = new Map(); // Track active Aleo routes
  }

  /**
   * Initiate deposit to Aleo vault via Solana bridge
   * This creates a three-way bridge: Solana → Aleo → Zcash (optional)
   */
  async initiateAleoVaultDeposit({
    amount,
    aleoVaultId,
    aleoStrategyId,
    finalDestination = 'aleo', // 'aleo' or 'zcash'
    zcashAddress = null,
    tokenMint = null
  }) {
    if (!this.program) {
      throw new Error('Bridge program not initialized');
    }

    const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);
    
    // Validate amount for Aleo routing
    if (amount < ALEO_BRIDGE_CONSTANTS.MIN_ALEO_DEPOSIT) {
      throw new Error(`Minimum Aleo deposit is ${ALEO_BRIDGE_CONSTANTS.MIN_ALEO_DEPOSIT} SOL`);
    }
    if (amount > ALEO_BRIDGE_CONSTANTS.MAX_ALEO_DEPOSIT) {
      throw new Error(`Maximum Aleo deposit is ${ALEO_BRIDGE_CONSTANTS.MAX_ALEO_DEPOSIT} SOL`);
    }

    // If final destination is Zcash, validate Zcash address
    if (finalDestination === 'zcash' && !zcashAddress) {
      throw new Error('Zcash address required for Zcash final destination');
    }

    const { pda: bridgeStatePda } = deriveBridgeStatePDA();
    const bridgeState = await this.program.account.bridgeState.fetch(bridgeStatePda);
    const ticketId = bridgeState.depositNonce ? bridgeState.depositNonce.toNumber() : 0;

    const { pda: depositTicketPda } = deriveDepositTicketPDA(ticketId);
    const { pda: vaultPda } = deriveVaultPDA();

    // Create Aleo routing metadata
    const aleoRoutingData = {
      vaultId: aleoVaultId,
      strategyId: aleoStrategyId,
      finalDestination,
      zcashAddress: zcashAddress || '',
      routingType: 'aleo_vault_deposit'
    };

    // Encode routing data as memo (64 bytes)
    const memoBytes = Buffer.alloc(64);
    const routingJson = JSON.stringify(aleoRoutingData);
    Buffer.from(routingJson.slice(0, 63)).copy(memoBytes);

    // For Aleo routing, we use a special "Aleo address" format
    const aleoAddressBytes = Buffer.alloc(78);
    const aleoAddressData = `aleo:${aleoVaultId}:${aleoStrategyId}`;
    Buffer.from(aleoAddressData.slice(0, 77)).copy(aleoAddressBytes);

    // Get token mint
    const wrappedZecMintStr = import.meta.env.VITE_WRAPPED_ZEC_MINT || tokenMint;
    if (!wrappedZecMintStr) {
      throw new Error('VITE_WRAPPED_ZEC_MINT not configured');
    }
    const mintPubkey = new PublicKey(wrappedZecMintStr);

    // Get user's token account
    const userTokenAcct = await getAssociatedTokenAddress(
      mintPubkey,
      this.wallet.publicKey
    );

    const accounts = {
      bridgeState: bridgeStatePda,
      depositTicket: depositTicketPda,
      user: this.wallet.publicKey,
      userTokenAccount: userTokenAcct,
      vault: vaultPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };

    let tx = new Transaction();

    // Build the deposit instruction with Aleo routing data
    const depositIx = await this.program.methods
      .initiateDeposit(
        new BN(amountLamports),
        Array.from(aleoAddressBytes),
        Array.from(memoBytes)
      )
      .accounts(accounts)
      .instruction();

    tx.add(depositIx);

    // Add priority fee if Helius client available
    if (this.heliusClient) {
      try {
        const result = await this.heliusClient.addPriorityFee(tx, { 
          accountKeys: [this.wallet.publicKey.toBase58()] 
        });
        tx = result.transaction;
      } catch (e) {
        console.warn('Failed to estimate priority fee:', e.message);
      }
    }

    // Set blockhash and feePayer
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = this.wallet.publicKey;

    // Send transaction
    const signature = await this.wallet.sendTransaction(tx, this.connection, {
      skipPreflight: false,
    });
    await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    // Store routing information
    const routeId = `${ticketId}-${signature}`;
    this.aleoRoutes.set(routeId, {
      ticketId,
      signature,
      amount: amountLamports,
      aleoVaultId,
      aleoStrategyId,
      finalDestination,
      zcashAddress,
      status: 'initiated',
      createdAt: Date.now()
    });

    return {
      ticketId,
      signature,
      amount: amountLamports,
      aleoVaultId,
      aleoStrategyId,
      finalDestination,
      routeId,
      status: 'initiated',
    };
  }

  /**
   * Process Aleo vault deposit on Aleo network
   * This should be called after the Solana deposit is confirmed
   */
  async processAleoVaultDeposit(routeId) {
    const route = this.aleoRoutes.get(routeId);
    if (!route) {
      throw new Error('Route not found');
    }

    if (!this.aleoProvider) {
      throw new Error('Aleo provider not configured');
    }

    try {
      // Create bridged asset record for Aleo
      const bridgedAsset = {
        owner: await this.aleoProvider.getAddress(),
        source_chain: '1field', // Solana chain ID
        source_token: '2field', // Wrapped ZEC token ID
        amount: `${route.amount}u64`,
        bridge_proof: `${route.signature}field`, // Use Solana tx signature as proof
        bridge_nonce: `${route.ticketId}field`
      };

      // Generate Aleo vault deposit transaction
      const aleoTxData = {
        program: ALEO_BRIDGE_CONSTANTS.ALEO_PROGRAM_ID,
        function: 'deposit_bridged',
        inputs: [
          bridgedAsset,
          `${route.aleoVaultId}field`,
          `${route.aleoStrategyId}field`
        ]
      };

      console.log('Processing Aleo vault deposit:', aleoTxData);

      // Update route status
      route.status = 'processing_aleo';
      route.aleoTxData = aleoTxData;
      this.aleoRoutes.set(routeId, route);

      return {
        routeId,
        aleoTxData,
        status: 'processing_aleo'
      };

    } catch (error) {
      console.error('Error processing Aleo vault deposit:', error);
      route.status = 'failed';
      route.error = error.message;
      this.aleoRoutes.set(routeId, route);
      throw error;
    }
  }

  /**
   * Initiate withdrawal from Aleo vault to Solana
   */
  async initiateAleoVaultWithdrawal({
    aleoVaultPosition,
    withdrawAmount,
    targetChain = 'solana',
    solanaTokenAccount = null
  }) {
    if (!this.aleoProvider) {
      throw new Error('Aleo provider not configured');
    }

    try {
      // Generate Aleo withdrawal transaction
      const aleoWithdrawalTx = {
        program: ALEO_BRIDGE_CONSTANTS.ALEO_PROGRAM_ID,
        function: 'withdraw_to_chain',
        inputs: [
          aleoVaultPosition,
          `${withdrawAmount}u64`,
          '1field', // Solana chain ID
          `${this.wallet.publicKey.toBase58()}field`
        ]
      };

      console.log('Initiating Aleo vault withdrawal:', aleoWithdrawalTx);

      // Create withdrawal route tracking
      const routeId = `withdrawal-${Date.now()}`;
      this.aleoRoutes.set(routeId, {
        type: 'withdrawal',
        aleoVaultPosition,
        withdrawAmount,
        targetChain,
        solanaTokenAccount,
        aleoWithdrawalTx,
        status: 'initiated',
        createdAt: Date.now()
      });

      return {
        routeId,
        aleoWithdrawalTx,
        status: 'initiated'
      };

    } catch (error) {
      console.error('Error initiating Aleo vault withdrawal:', error);
      throw error;
    }
  }

  /**
   * Process Aleo withdrawal on Solana side
   * This should be called after the Aleo withdrawal is confirmed
   */
  async processAleoWithdrawal(routeId, aleoWithdrawalProof) {
    const route = this.aleoRoutes.get(routeId);
    if (!route || route.type !== 'withdrawal') {
      throw new Error('Withdrawal route not found');
    }

    if (!this.program) {
      throw new Error('Bridge program not initialized');
    }

    try {
      const { pda: bridgeStatePda } = deriveBridgeStatePDA();
      const bridgeState = await this.program.account.bridgeState.fetch(bridgeStatePda);
      const ticketId = bridgeState.withdrawalNonce ? bridgeState.withdrawalNonce.toNumber() : 0;

      const { pda: withdrawalTicketPda } = deriveWithdrawalTicketPDA(ticketId);

      // Create withdrawal proof from Aleo data
      const withdrawalProof = {
        proofData: Array.from(Buffer.alloc(256)), // Simplified proof
        commitment: Array.from(Buffer.from(aleoWithdrawalProof.commitment || '', 'hex').slice(0, 32)),
        nullifier: Array.from(Buffer.from(aleoWithdrawalProof.nullifier || '', 'hex').slice(0, 32))
      };

      const accounts = {
        bridgeState: bridgeStatePda,
        withdrawalTicket: withdrawalTicketPda,
        user: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      };

      let tx = await this.program.methods
        .initiateWithdrawal(
          new BN(route.withdrawAmount),
          Array.from(Buffer.alloc(32)), // Partial note commitment
          Array.from(Buffer.alloc(32)), // Partial note nullifier  
          Array.from(Buffer.alloc(32))  // Encrypted value
        )
        .accounts(accounts)
        .transaction();

      if (this.heliusClient) {
        const result = await this.heliusClient.addPriorityFee(tx, { 
          accountKeys: [this.wallet.publicKey.toBase58()] 
        });
        tx = result.transaction;
      }

      const signature = await this.wallet.sendTransaction(tx, this.connection);
      await this.connection.confirmTransaction(signature, 'confirmed');

      // Update route status
      route.status = 'completed';
      route.solanaSignature = signature;
      route.ticketId = ticketId;
      this.aleoRoutes.set(routeId, route);

      return {
        routeId,
        ticketId,
        signature,
        status: 'completed'
      };

    } catch (error) {
      console.error('Error processing Aleo withdrawal:', error);
      route.status = 'failed';
      route.error = error.message;
      this.aleoRoutes.set(routeId, route);
      throw error;
    }
  }

  /**
   * Get Aleo route status
   */
  getAleoRouteStatus(routeId) {
    return this.aleoRoutes.get(routeId) || null;
  }

  /**
   * List all Aleo routes for the current user
   */
  getAllAleoRoutes() {
    return Array.from(this.aleoRoutes.values());
  }

  /**
   * Generate Aleo-specific proof for bridge verification
   */
  async generateAleoProof(routeData) {
    // Simplified proof generation - in production would use proper ZK proofs
    const proofData = {
      route: routeData.routeId,
      amount: routeData.amount,
      vaultId: routeData.aleoVaultId,
      strategyId: routeData.aleoStrategyId,
      timestamp: Date.now()
    };

    const proofHash = Buffer.from(JSON.stringify(proofData)).toString('hex');
    
    return {
      proofHash,
      proofData,
      commitment: proofHash.slice(0, 64),
      nullifier: proofHash.slice(64, 128) || proofHash.slice(0, 64)
    };
  }

  /**
   * Verify Aleo proof
   */
  async verifyAleoProof(proof, expectedData) {
    try {
      // Simplified verification - in production would verify ZK proof
      const computedHash = Buffer.from(JSON.stringify(expectedData)).toString('hex');
      return proof.proofHash === computedHash;
    } catch (error) {
      console.error('Error verifying Aleo proof:', error);
      return false;
    }
  }

  /**
   * Get bridge statistics including Aleo routing
   */
  async getExtendedBridgeStats() {
    const baseStats = await this.getBridgeStats();
    
    const aleoRoutes = this.getAllAleoRoutes();
    const aleoStats = {
      totalAleoRoutes: aleoRoutes.length,
      activeAleoRoutes: aleoRoutes.filter(r => r.status === 'processing_aleo').length,
      completedAleoRoutes: aleoRoutes.filter(r => r.status === 'completed').length,
      failedAleoRoutes: aleoRoutes.filter(r => r.status === 'failed').length,
      totalAleoVolume: aleoRoutes.reduce((sum, r) => sum + (r.amount || 0), 0)
    };

    return {
      ...baseStats,
      aleo: aleoStats
    };
  }

  /**
   * Monitor Aleo bridge events
   */
  async monitorAleoEvents(callback) {
    // Monitor Solana events for Aleo-related transactions
    const programId = new PublicKey(BRIDGE_CONSTANTS.PROGRAM_ID);
    
    this.connection.onLogs(programId, (logs, context) => {
      // Parse logs for Aleo-related events
      const logMessages = logs.logs;
      
      for (const log of logMessages) {
        if (log.includes('aleo:')) {
          // Extract Aleo routing information from logs
          try {
            const aleoData = this.parseAleoLogData(log);
            callback({
              type: 'aleo_route_event',
              data: aleoData,
              signature: logs.signature,
              slot: context.slot
            });
          } catch (error) {
            console.warn('Failed to parse Aleo log data:', error);
          }
        }
      }
    });

    console.log('Aleo bridge event monitoring started');
  }

  /**
   * Parse Aleo-specific data from Solana logs
   */
  parseAleoLogData(logMessage) {
    // Extract Aleo routing data from log message
    const aleoMatch = logMessage.match(/aleo:([^:]+):([^:]+)/);
    if (aleoMatch) {
      return {
        vaultId: aleoMatch[1],
        strategyId: aleoMatch[2],
        timestamp: Date.now()
      };
    }
    return null;
  }

  /**
   * Estimate fees for Aleo routing
   */
  async estimateAleoRoutingFees(amount) {
    const baseFees = await this.estimatePriorityFee();
    
    // Add Aleo-specific fees
    const aleoFee = Math.floor(amount * ALEO_BRIDGE_CONSTANTS.ALEO_BRIDGE_FEE_BPS / 10000);
    
    return {
      ...baseFees,
      aleoRoutingFee: aleoFee,
      totalWithAleoRouting: {
        low: baseFees.low + aleoFee,
        medium: baseFees.medium + aleoFee,
        high: baseFees.high + aleoFee
      }
    };
  }
}

/**
 * Create extended bridge client with Aleo support
 */
export function createSolanaZcashAleoClient(connection, wallet, heliusClient = null, aleoProvider = null) {
  return new SolanaZcashAleoExtendedClient(connection, wallet, heliusClient, aleoProvider);
}

/**
 * Aleo bridge utilities
 */
export const AleoBridgeUtils = {
  ALEO_BRIDGE_CONSTANTS,
  
  /**
   * Validate Aleo vault ID format
   */
  isValidAleoVaultId(vaultId) {
    return typeof vaultId === 'string' && vaultId.length > 0 && vaultId.length <= 32;
  },

  /**
   * Validate Aleo strategy ID format
   */
  isValidAleoStrategyId(strategyId) {
    return typeof strategyId === 'string' && strategyId.length > 0 && strategyId.length <= 32;
  },

  /**
   * Format Aleo field value
   */
  formatAleoField(value) {
    return `${value}field`;
  },

  /**
   * Format Aleo u64 value
   */
  formatAleoU64(value) {
    return `${value}u64`;
  },

  /**
   * Parse Aleo address format
   */
  parseAleoAddress(address) {
    const parts = address.split(':');
    if (parts.length >= 3 && parts[0] === 'aleo') {
      return {
        vaultId: parts[1],
        strategyId: parts[2],
        isValid: true
      };
    }
    return { isValid: false };
  }
};

export default SolanaZcashAleoExtendedClient;