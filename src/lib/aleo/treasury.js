/**
 * Treasury Management Library
 * Provides JavaScript interface for treasury_management.aleo program
 * Updated to use Transaction Wrapper for real blockchain transactions
 */

import { ALEO_PROGRAMS } from './constants.js';
import { TransactionWrapper } from './transactionWrapper.js';

export class TreasuryManager {
  constructor(walletAdapter = null) {
    this.wallet = walletAdapter;
    this.programName = ALEO_PROGRAMS.TREASURY_MANAGEMENT;
    this.txWrapper = new TransactionWrapper(walletAdapter);
  }

  /**
   * Set wallet adapter
   */
  setWallet(walletAdapter) {
    this.wallet = walletAdapter;
    this.txWrapper.setWallet(walletAdapter);
  }

  /**
   * Create multi-signature wallet with encrypted policies
   * Creates a real transaction on Aleo network
   */
  async createMultiSigWallet({
    walletId,
    requiredSignatures,
    totalSigners,
    policyHash,
    initialBalance
  }) {
    if (requiredSignatures < 1 || requiredSignatures > totalSigners) {
      throw new Error('Invalid required signatures');
    }
    if (totalSigners < 1 || totalSigners > 10) {
      throw new Error('Invalid total signers: must be 1-10');
    }

    const result = await this.txWrapper.executeOperation('treasury_create_multisig', {
      walletId,
      requiredSignatures,
      totalSigners,
      policyHash,
      initialBalance
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      wallet: {
        walletId: result.txHash,
        owner: this.wallet?.address || 'aleo1treasury',
        requiredSignatures,
        totalSigners,
        policyHash,
        balance: initialBalance,
        createdAt: result.timestamp
      }
    };
  }

  /**
   * Add signer to multi-signature wallet
   * Creates a real transaction on Aleo network
   */
  async addSigner({ wallet, signerAddress, signerIndex, publicKey }) {
    const result = await this.txWrapper.executeOperation('treasury_add_signer', {
      walletId: wallet.walletId,
      signerAddress,
      signerIndex,
      publicKey
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      signer: {
        walletId: wallet.walletId,
        signerAddress,
        signerIndex,
        publicKey,
        addedAt: result.timestamp
      }
    };
  }

  /**
   * Execute fund allocation with private strategy
   * Creates a real transaction on Aleo network
   */
  async allocateFunds({
    wallet,
    allocationId,
    strategyHash,
    amount,
    targetYield,
    riskLevel,
    viewKey
  }) {
    if (amount <= 0) {
      throw new Error('Invalid amount: must be positive');
    }
    if (riskLevel < 1 || riskLevel > 5) {
      throw new Error('Invalid risk level: must be 1-5');
    }

    const result = await this.txWrapper.executeOperation('treasury_allocate_funds', {
      walletId: wallet.walletId,
      allocationId,
      strategyHash,
      amount,
      targetYield,
      riskLevel,
      viewKey
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      allocation: {
        allocationId: result.txHash,
        walletId: wallet.walletId,
        strategyHash,
        amount,
        targetYield,
        riskLevel,
        viewKey,
        allocatedAt: result.timestamp
      }
    };
  }

  /**
   * Process payroll for B2B payments
   * Creates a real transaction on Aleo network
   */
  async processPayroll({
    wallet,
    payrollId,
    recipient,
    amount,
    paymentPeriod,
    categoryHash
  }) {
    if (amount <= 0) {
      throw new Error('Invalid amount: must be positive');
    }

    const result = await this.txWrapper.executeOperation('treasury_process_payroll', {
      walletId: wallet.walletId,
      payrollId,
      recipient,
      amount,
      paymentPeriod,
      categoryHash
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      payrollEntry: {
        payrollId: result.txHash,
        walletId: wallet.walletId,
        recipient,
        amount,
        paymentPeriod,
        categoryHash,
        processedAt: result.timestamp
      }
    };
  }

  /**
   * Create DAO treasury with view key transparency
   * Creates a real transaction on Aleo network
   */
  async createDAOTreasury({
    daoId,
    initialBalance,
    governanceTokenSupply,
    proposalThreshold,
    viewKey
  }) {
    if (proposalThreshold > governanceTokenSupply) {
      throw new Error('Proposal threshold cannot exceed governance token supply');
    }

    const result = await this.txWrapper.executeOperation('treasury_create_dao', {
      daoId,
      initialBalance,
      governanceTokenSupply,
      proposalThreshold,
      viewKey
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      treasury: {
        daoId: result.txHash,
        owner: this.wallet?.address || 'aleo1dao',
        balance: initialBalance,
        governanceTokenSupply,
        proposalThreshold,
        viewKey,
        createdAt: result.timestamp
      }
    };
  }

  /**
   * Submit treasury proposal for DAO governance
   * Creates a real transaction on Aleo network
   */
  async submitTreasuryProposal({
    daoTreasury,
    proposalId,
    proposalType,
    amount,
    executionDeadline
  }) {
    if (proposalType < 1 || proposalType > 3) {
      throw new Error('Invalid proposal type: must be 1-3');
    }

    const result = await this.txWrapper.executeOperation('treasury_submit_proposal', {
      daoId: daoTreasury.daoId,
      proposalId,
      proposalType,
      amount,
      executionDeadline
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      proposal: {
        proposalId: result.txHash,
        daoId: daoTreasury.daoId,
        proposalType,
        amount,
        executionDeadline,
        votesFor: 0,
        votesAgainst: 0,
        isExecuted: false,
        submittedAt: result.timestamp
      }
    };
  }

  /**
   * Vote on treasury proposal
   * Creates a real transaction on Aleo network
   */
  async voteOnProposal({ proposal, voteWeight, voteFor }) {
    if (voteWeight <= 0) {
      throw new Error('Invalid vote weight: must be positive');
    }

    const result = await this.txWrapper.executeOperation('treasury_vote', {
      proposalId: proposal.proposalId,
      voteWeight,
      voteFor
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      vote: {
        proposalId: proposal.proposalId,
        voteWeight,
        voteFor,
        votedAt: result.timestamp
      }
    };
  }

  /**
   * Execute approved treasury proposal
   * Creates a real transaction on Aleo network
   */
  async executeProposal({ daoTreasury, proposal, proposalThreshold }) {
    const result = await this.txWrapper.executeOperation('treasury_execute_proposal', {
      daoId: daoTreasury.daoId,
      proposalId: proposal.proposalId,
      proposalThreshold
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      executedProposal: {
        ...proposal,
        isExecuted: true,
        executedAt: result.timestamp
      }
    };
  }

  /**
   * Withdraw from multi-sig wallet (requires signatures)
   * Creates a real transaction on Aleo network
   */
  async withdrawFromMultiSig({ wallet, amount, recipient, signatureHash }) {
    if (amount <= 0) {
      throw new Error('Invalid amount: must be positive');
    }

    const result = await this.txWrapper.executeOperation('treasury_withdraw_multisig', {
      walletId: wallet.walletId,
      amount,
      recipient,
      signatureHash
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      withdrawal: {
        walletId: wallet.walletId,
        amount,
        recipient,
        withdrawnAt: result.timestamp
      }
    };
  }

  /**
   * Get multi-sig wallets from transaction history
   */
  async getMultiSigWallets() {
    return this.txWrapper.getHistory({ operationType: 'treasury_create_multisig' })
      .map(tx => ({
        walletId: tx.txHash,
        txHash: tx.txHash,
        explorerLink: tx.explorerLink,
        ...tx.params,
        createdAt: tx.timestamp
      }));
  }

  /**
   * Get fund allocations from transaction history
   */
  async getAllocations() {
    return this.txWrapper.getHistory({ operationType: 'treasury_allocate_funds' })
      .map(tx => ({
        allocationId: tx.txHash,
        txHash: tx.txHash,
        explorerLink: tx.explorerLink,
        ...tx.params,
        allocatedAt: tx.timestamp
      }));
  }

  /**
   * Get DAO treasuries from transaction history
   */
  async getDAOTreasuries() {
    return this.txWrapper.getHistory({ operationType: 'treasury_create_dao' })
      .map(tx => ({
        daoId: tx.txHash,
        txHash: tx.txHash,
        explorerLink: tx.explorerLink,
        ...tx.params,
        createdAt: tx.timestamp
      }));
  }

  /**
   * Get transaction history for treasury operations
   */
  getTransactionHistory(limit = 50) {
    return this.txWrapper.getHistory({ limit })
      .filter(tx => tx.operationType?.startsWith('treasury_'));
  }
}

// Export utility functions for treasury management
export const treasuryUtils = {
  /**
   * Calculate proposal voting power
   */
  calculateVotingPower(tokenBalance, totalSupply) {
    if (totalSupply === 0n || totalSupply === 0) return 0;
    return Number((BigInt(tokenBalance) * 10000n) / BigInt(totalSupply)) / 100;
  },

  /**
   * Check if proposal can be executed
   */
  canExecuteProposal(proposal, threshold, currentBlock) {
    return (
      !proposal.isExecuted &&
      proposal.votesFor > proposal.votesAgainst &&
      proposal.votesFor >= threshold &&
      currentBlock < proposal.executionDeadline
    );
  },

  /**
   * Format treasury balance for display
   */
  formatBalance(balance, decimals = 6) {
    const divisor = 10n ** BigInt(decimals);
    const whole = BigInt(balance) / divisor;
    const fraction = BigInt(balance) % divisor;
    return `${whole}.${fraction.toString().padStart(decimals, '0')}`;
  }
};

export default TreasuryManager;
