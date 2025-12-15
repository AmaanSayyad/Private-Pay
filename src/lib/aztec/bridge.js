/**
 * Zcash-Aztec Bridge Module
 * 
 * Handles bi-directional private bridge between Zcash and Aztec
 * Uses partial notes for privacy-preserving proofs
 */

import { generatePartialNote, createPartialNoteProof } from '../zcash/partialNotes.js';
import { EncryptedNote } from './encryptedNotes.js';

/**
 * Bridge Deposit Request
 * Represents a deposit from Zcash to Aztec
 */
export class BridgeDeposit {
  constructor(zcashTxId, partialNote, ticketId, amount) {
    this.zcashTxId = zcashTxId; // Zcash transaction ID
    this.partialNote = partialNote; // Partial note proof
    this.ticketId = ticketId; // Unique ticket ID for claiming
    this.amount = amount; // Amount in ZEC
    this.status = 'pending'; // pending, confirmed, claimed
    this.createdAt = Date.now();
  }

  toJSON() {
    return {
      zcashTxId: this.zcashTxId,
      partialNote: this.partialNote.toJSON(),
      ticketId: this.ticketId,
      amount: this.amount,
      status: this.status,
      createdAt: this.createdAt,
    };
  }

  static fromJSON(json) {
    const deposit = new BridgeDeposit(
      json.zcashTxId,
      json.partialNote,
      json.ticketId,
      json.amount
    );
    deposit.status = json.status;
    deposit.createdAt = json.createdAt;
    return deposit;
  }
}

/**
 * Bridge Withdrawal Request
 * Represents a withdrawal from Aztec to Zcash
 */
export class BridgeWithdrawal {
  constructor(aztecTxId, bzecAmount, zcashAddress, encryptedNote) {
    this.aztecTxId = aztecTxId; // Aztec transaction ID
    this.bzecAmount = bzecAmount; // Amount of bZEC to burn
    this.zcashAddress = zcashAddress; // Zcash unified address for receiving
    this.encryptedNote = encryptedNote; // Encrypted note with withdrawal request
    this.status = 'pending'; // pending, processed, completed
    this.createdAt = Date.now();
  }

  toJSON() {
    return {
      aztecTxId: this.aztecTxId,
      bzecAmount: this.bzecAmount,
      zcashAddress: this.zcashAddress,
      encryptedNote: this.encryptedNote.toJSON(),
      status: this.status,
      createdAt: this.createdAt,
    };
  }

  static fromJSON(json) {
    const withdrawal = new BridgeWithdrawal(
      json.aztecTxId,
      json.bzecAmount,
      json.zcashAddress,
      json.encryptedNote
    );
    withdrawal.status = json.status;
    withdrawal.createdAt = json.createdAt;
    return withdrawal;
  }
}

/**
 * Bridge Manager
 * Manages bridge operations between Zcash and Aztec
 */
export class BridgeManager {
  constructor(aztecClient, zcashWallet) {
    this.aztecClient = aztecClient;
    this.zcashWallet = zcashWallet;
    this.deposits = new Map(); // ticketId -> BridgeDeposit
    this.withdrawals = new Map(); // aztecTxId -> BridgeWithdrawal
  }

  /**
   * Create deposit request (Zcash -> Aztec)
   * @param {string} zcashTxId - Zcash transaction ID
   * @param {Object} zcashNote - Zcash note
   * @param {bigint} amount - Amount in ZEC
   * @returns {Promise<BridgeDeposit>} Deposit request
   */
  async createDeposit(zcashTxId, zcashNote, amount) {
    try {
      // Generate partial note
      const partialNote = generatePartialNote(zcashNote);
      
      // Create unique ticket ID
      const ticketId = this.generateTicketId();
      
      // Create deposit request
      const deposit = new BridgeDeposit(
        zcashTxId,
        partialNote,
        ticketId,
        amount
      );
      
      this.deposits.set(ticketId, deposit);
      
      return deposit;
    } catch (error) {
      console.error('Failed to create deposit:', error);
      throw error;
    }
  }

  /**
   * Claim bZEC on Aztec using ticket
   * @param {string} ticketId - Ticket ID from deposit
   * @param {string} aztecAddress - Aztec address to receive bZEC
   * @returns {Promise<string>} Aztec transaction hash
   */
  async claimBZEC(ticketId, aztecAddress) {
    try {
      const deposit = this.deposits.get(ticketId);
      if (!deposit) {
        throw new Error('Deposit not found');
      }

      if (deposit.status !== 'pending') {
        throw new Error('Deposit already processed');
      }

      // Create proof for claiming
      // In production, this would use zk-SNARK proof
      const proof = await createPartialNoteProof(
        deposit.partialNote,
        null // proving key would go here
      );

      // Submit claim transaction to Aztec
      const transaction = {
        type: 'claim_bzec',
        ticketId,
        proof: proof.toJSON(),
        recipient: aztecAddress,
        amount: deposit.amount,
      };

      const txHash = await this.aztecClient.sendTransaction(transaction);
      
      deposit.status = 'claimed';
      
      return txHash;
    } catch (error) {
      console.error('Failed to claim bZEC:', error);
      throw error;
    }
  }

  /**
   * Create withdrawal request (Aztec -> Zcash)
   * @param {bigint} bzecAmount - Amount of bZEC to burn
   * @param {string} zcashAddress - Zcash address to receive ZEC
   * @param {EncryptedNote} encryptedNote - Encrypted note with withdrawal request
   * @returns {Promise<BridgeWithdrawal>} Withdrawal request
   */
  async createWithdrawal(bzecAmount, zcashAddress, encryptedNote) {
    try {
      // Burn bZEC on Aztec
      const burnTransaction = {
        type: 'burn_bzec',
        amount: bzecAmount.toString(),
        withdrawalNote: encryptedNote.toJSON(),
      };

      const aztecTxId = await this.aztecClient.sendTransaction(burnTransaction);

      // Create withdrawal request
      const withdrawal = new BridgeWithdrawal(
        aztecTxId,
        bzecAmount,
        zcashAddress,
        encryptedNote
      );

      this.withdrawals.set(aztecTxId, withdrawal);

      return withdrawal;
    } catch (error) {
      console.error('Failed to create withdrawal:', error);
      throw error;
    }
  }

  /**
   * Generate unique ticket ID
   * @returns {string} Ticket ID
   */
  generateTicketId() {
    // In production, use cryptographically secure random
    return `ticket_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get deposit by ticket ID
   * @param {string} ticketId - Ticket ID
   * @returns {BridgeDeposit|null} Deposit or null
   */
  getDeposit(ticketId) {
    return this.deposits.get(ticketId) || null;
  }

  /**
   * Get withdrawal by transaction ID
   * @param {string} aztecTxId - Aztec transaction ID
   * @returns {BridgeWithdrawal|null} Withdrawal or null
   */
  getWithdrawal(aztecTxId) {
    return this.withdrawals.get(aztecTxId) || null;
  }
}

/**
 * Create bridge manager instance
 * @param {AztecPXEClient} aztecClient - Aztec PXE client
 * @param {ZcashWallet} zcashWallet - Zcash wallet instance
 * @returns {BridgeManager} Bridge manager instance
 */
export function createBridgeManager(aztecClient, zcashWallet) {
  return new BridgeManager(aztecClient, zcashWallet);
}





