// ZK Credit System Integration
// JavaScript wrapper for zk_credit.aleo program
// Updated to use Transaction Wrapper for real blockchain transactions

import { ALEO_NETWORK_URL, ALEO_PRIVATE_KEY } from './constants.js';
import { TransactionWrapper } from './transactionWrapper.js';

/**
 * ZK Credit System class for privacy-preserving credit scoring and lending
 */
export class ZKCreditSystem {
  constructor(walletAdapter = null) {
    this.wallet = walletAdapter;
    this.programName = 'zk_credit.aleo';
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
   * Initialize a new credit score record
   * Creates a real transaction on Aleo network
   */
  async initializeCreditScore(initialScore, verificationProof) {
    if (initialScore < 300 || initialScore > 850) {
      throw new Error('Invalid credit score: must be between 300 and 850');
    }

    const result = await this.txWrapper.executeOperation('credit_initialize', {
      initialScore,
      verificationProof
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      creditScore: {
        owner: this.wallet?.address || 'aleo1user',
        score: initialScore,
        lastUpdated: result.timestamp,
        verificationProof,
        creditHistoryHash: `hash_${result.txHash.slice(0, 16)}`,
        paymentCount: 0,
        defaultCount: 0
      }
    };
  }

  /**
   * Verify creditworthiness without revealing actual score
   * Creates a real transaction on Aleo network
   */
  async verifyCreditworthiness(creditScore, minScoreRequired) {
    const result = await this.txWrapper.executeOperation('credit_verify', {
      currentScore: creditScore.score,
      minScoreRequired
    });

    const minScoreMet = creditScore.score >= minScoreRequired;

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      creditProof: {
        owner: creditScore.owner,
        minScoreMet,
        proofHash: `proof_${result.txHash.slice(0, 16)}`,
        verificationBlock: result.blockHeight,
        validUntil: result.blockHeight + 1000 // Valid for ~1000 blocks
      }
    };
  }

  /**
   * Issue an undercollateralized loan based on credit proof
   * Creates a real transaction on Aleo network
   */
  async issueLoan(creditProof, principal, interestRate, term, collateralRatio, lender) {
    if (principal <= 0) {
      throw new Error('Invalid principal: must be positive');
    }
    if (interestRate < 0 || interestRate > 10000) {
      throw new Error('Invalid interest rate: must be 0-10000 basis points');
    }

    const result = await this.txWrapper.executeOperation('credit_issue_loan', {
      principal,
      interestRate,
      term,
      collateralRatio,
      lender
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      loan: {
        borrower: this.wallet?.address || 'aleo1borrower',
        lender,
        principal,
        interestRate,
        term,
        collateralRatio,
        status: 0, // 0: active
        issueBlock: result.blockHeight,
        dueBlock: result.blockHeight + term,
        loanId: result.txHash
      }
    };
  }

  /**
   * Update credit score based on payment history
   * Creates a real transaction on Aleo network
   */
  async updateCreditScore(currentScore, paymentHistory) {
    const result = await this.txWrapper.executeOperation('credit_update_score', {
      currentScore: currentScore.score,
      paymentCount: paymentHistory.paymentCount || 0,
      isOnTime: paymentHistory.isOnTime
    });

    // Calculate new score based on payment history
    let scoreChange = 0;
    if (paymentHistory.isOnTime) {
      scoreChange = 5; // +5 for on-time payment
    } else {
      scoreChange = -15; // -15 for late payment
    }

    const newScore = Math.max(300, Math.min(850, currentScore.score + scoreChange));

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      updatedScore: {
        ...currentScore,
        score: newScore,
        lastUpdated: result.timestamp,
        paymentCount: (currentScore.paymentCount || 0) + 1
      }
    };
  }

  /**
   * Record a payment for credit history tracking
   * Creates a real transaction on Aleo network
   */
  async recordPayment(loan, paymentAmount, previousHistory) {
    if (paymentAmount <= 0) {
      throw new Error('Invalid payment amount: must be positive');
    }

    const result = await this.txWrapper.executeOperation('credit_record_payment', {
      loanId: loan.loanId,
      paymentAmount,
      principal: loan.principal
    });

    const isFullPayment = paymentAmount >= loan.principal;
    const remainingPrincipal = Math.max(0, loan.principal - paymentAmount);

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      updatedLoan: {
        ...loan,
        principal: remainingPrincipal,
        status: remainingPrincipal === 0 ? 1 : 0 // 1: repaid, 0: active
      },
      paymentHistory: {
        owner: loan.borrower,
        loanId: loan.loanId,
        paymentAmount,
        paymentBlock: result.blockHeight,
        isOnTime: true, // Would be calculated based on due date
        isFullPayment,
        historyHash: `history_${result.txHash.slice(0, 16)}`
      }
    };
  }

  /**
   * Mark a loan as defaulted (lender only)
   * Creates a real transaction on Aleo network
   */
  async markDefault(loan) {
    const result = await this.txWrapper.executeOperation('credit_mark_default', {
      loanId: loan.loanId
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      defaultedLoan: {
        ...loan,
        status: 2 // 2: defaulted
      }
    };
  }

  /**
   * Verify loan eligibility based on credit score
   * Creates a real transaction on Aleo network
   */
  async verifyLoanEligibility(creditScore, requestedPrincipal, requestedCollateralRatio) {
    const result = await this.txWrapper.executeOperation('credit_verify_eligibility', {
      score: creditScore.score,
      requestedPrincipal,
      requestedCollateralRatio
    });

    // Calculate eligibility based on credit score
    const maxLoan = creditUtils.calculateMaxLoanAmount(creditScore.score);
    const minCollateral = creditUtils.calculateMinCollateralRatio(creditScore.score);
    const eligible = requestedPrincipal <= maxLoan && requestedCollateralRatio >= minCollateral;

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      eligible,
      maxLoanAmount: maxLoan,
      minCollateralRatio: minCollateral
    };
  }

  /**
   * Get credit score from transaction history
   */
  async getCreditScore() {
    const initHistory = this.txWrapper.getHistory({ operationType: 'credit_initialize' });
    const updateHistory = this.txWrapper.getHistory({ operationType: 'credit_update_score' });

    if (initHistory.length === 0) {
      return null;
    }

    // Get latest score
    const latestInit = initHistory[0];
    let currentScore = latestInit.params?.initialScore || 600;

    // Apply updates
    updateHistory.forEach(tx => {
      if (tx.params?.isOnTime) {
        currentScore = Math.min(850, currentScore + 5);
      } else {
        currentScore = Math.max(300, currentScore - 15);
      }
    });

    return {
      owner: this.wallet?.address || 'aleo1user',
      score: currentScore,
      lastUpdated: updateHistory[0]?.timestamp || latestInit.timestamp,
      paymentCount: updateHistory.length,
      defaultCount: 0
    };
  }

  /**
   * Get active loans from transaction history
   */
  async getActiveLoans() {
    const loanHistory = this.txWrapper.getHistory({ operationType: 'credit_issue_loan' });
    const paymentHistory = this.txWrapper.getHistory({ operationType: 'credit_record_payment' });
    const defaultHistory = this.txWrapper.getHistory({ operationType: 'credit_mark_default' });

    // Track loan states
    const loans = new Map();

    loanHistory.forEach(tx => {
      if (tx.params) {
        loans.set(tx.txHash, {
          loanId: tx.txHash,
          txHash: tx.txHash,
          explorerLink: tx.explorerLink,
          ...tx.params,
          status: 0, // active
          remainingPrincipal: tx.params.principal
        });
      }
    });

    // Apply payments
    paymentHistory.forEach(tx => {
      if (tx.params?.loanId && loans.has(tx.params.loanId)) {
        const loan = loans.get(tx.params.loanId);
        loan.remainingPrincipal -= tx.params.paymentAmount || 0;
        if (loan.remainingPrincipal <= 0) {
          loan.status = 1; // repaid
        }
      }
    });

    // Apply defaults
    defaultHistory.forEach(tx => {
      if (tx.params?.loanId && loans.has(tx.params.loanId)) {
        loans.get(tx.params.loanId).status = 2; // defaulted
      }
    });

    // Return only active loans
    return Array.from(loans.values()).filter(loan => loan.status === 0);
  }

  /**
   * Get transaction history for credit operations
   */
  getTransactionHistory(limit = 50) {
    return this.txWrapper.getHistory({ limit })
      .filter(tx => tx.operationType?.startsWith('credit_'));
  }
}

// Export singleton instance
export const zkCreditSystem = new ZKCreditSystem();

// Export utility functions
export const creditUtils = {
  /**
   * Calculate credit score range based on payment history
   */
  calculateCreditScoreRange(paymentCount, defaultCount) {
    const defaultRate = paymentCount > 0 ? defaultCount / paymentCount : 0;

    if (defaultRate === 0 && paymentCount >= 12) {
      return { min: 750, max: 850, category: 'Excellent' };
    } else if (defaultRate < 0.1 && paymentCount >= 6) {
      return { min: 700, max: 749, category: 'Good' };
    } else if (defaultRate < 0.2 && paymentCount >= 3) {
      return { min: 650, max: 699, category: 'Fair' };
    } else {
      return { min: 300, max: 649, category: 'Poor' };
    }
  },

  /**
   * Calculate maximum loan amount based on credit score
   */
  calculateMaxLoanAmount(creditScore) {
    if (creditScore >= 750) return 100000;
    if (creditScore >= 700) return 50000;
    if (creditScore >= 650) return 25000;
    return 10000;
  },

  /**
   * Calculate minimum collateral ratio based on credit score
   */
  calculateMinCollateralRatio(creditScore) {
    if (creditScore >= 750) return 5000;  // 50%
    if (creditScore >= 700) return 7500;  // 75%
    if (creditScore >= 650) return 10000; // 100%
    return 12500; // 125%
  },

  /**
   * Format credit score for display
   */
  formatCreditScore(score) {
    if (score >= 750) {
      return { score, color: 'success', description: 'Excellent Credit' };
    } else if (score >= 700) {
      return { score, color: 'primary', description: 'Good Credit' };
    } else if (score >= 650) {
      return { score, color: 'warning', description: 'Fair Credit' };
    } else {
      return { score, color: 'danger', description: 'Poor Credit' };
    }
  }
};
