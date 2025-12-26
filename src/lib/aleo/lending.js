// Private Lending System Integration
// JavaScript wrapper for private_lending.aleo program
// Updated to use Transaction Wrapper for real blockchain transactions

import { ALEO_NETWORK_URL, ALEO_PRIVATE_KEY } from './constants.js';
import { TransactionWrapper } from './transactionWrapper.js';

/**
 * Private Lending System class for privacy-preserving lending pools
 */
export class PrivateLendingSystem {
  constructor(walletAdapter = null) {
    this.wallet = walletAdapter;
    this.programName = 'private_lending.aleo';
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
   * Deposit funds into a lending pool
   * Creates a real transaction on Aleo network
   */
  async deposit(poolId, amount, baseInterestRate) {
    if (amount <= 0) {
      throw new Error('Invalid amount: must be positive');
    }
    if (baseInterestRate < 0 || baseInterestRate > 10000) {
      throw new Error('Invalid interest rate: must be 0-10000 basis points');
    }

    const result = await this.txWrapper.executeOperation('lending_deposit', {
      poolId,
      amount,
      baseInterestRate
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      lendingPosition: {
        owner: this.wallet?.address || 'aleo1lender',
        poolId,
        principal: amount,
        accruedInterest: 0,
        lastUpdate: result.blockHeight,
        interestRate: baseInterestRate,
        shares: amount, // 1:1 for simplicity
        depositBlock: result.blockHeight
      }
    };
  }

  /**
   * Borrow from lending pool with collateral
   * Creates a real transaction on Aleo network
   */
  async borrow(poolId, borrowAmount, collateral, creditProof, loanTerm) {
    if (borrowAmount <= 0) {
      throw new Error('Invalid borrow amount: must be positive');
    }
    if (!collateral || collateral.amount <= 0) {
      throw new Error('Invalid collateral: must be positive');
    }

    const result = await this.txWrapper.executeOperation('lending_borrow', {
      poolId,
      borrowAmount,
      collateralAmount: collateral.amount,
      collateralType: collateral.tokenType,
      loanTerm
    });

    // Calculate interest rate based on collateral ratio
    const collateralRatio = (collateral.amount * 10000) / borrowAmount;
    const interestRate = lendingUtils.calculateBorrowRate(collateralRatio, creditProof?.minScoreMet);

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      borrowPosition: {
        owner: this.wallet?.address || 'aleo1borrower',
        poolId,
        borrowedAmount: borrowAmount,
        collateralAmount: collateral.amount,
        interestRate,
        lastUpdate: result.blockHeight,
        accruedInterest: 0,
        liquidationThreshold: 12000, // 120%
        borrowBlock: result.blockHeight,
        dueBlock: result.blockHeight + loanTerm
      }
    };
  }

  /**
   * Repay loan partially or fully
   * Creates a real transaction on Aleo network
   */
  async repay(position, repayAmount) {
    if (repayAmount <= 0) {
      throw new Error('Invalid repay amount: must be positive');
    }

    const result = await this.txWrapper.executeOperation('lending_repay', {
      positionId: position.positionId || position.txHash,
      poolId: position.poolId,
      repayAmount,
      borrowedAmount: position.borrowedAmount
    });

    const remainingDebt = Math.max(0, position.borrowedAmount - repayAmount);

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      updatedPosition: {
        ...position,
        borrowedAmount: remainingDebt,
        lastUpdate: result.blockHeight,
        accruedInterest: 0 // Reset after payment
      }
    };
  }

  /**
   * Withdraw from lending position
   * Creates a real transaction on Aleo network
   */
  async withdraw(position, withdrawAmount) {
    if (withdrawAmount <= 0) {
      throw new Error('Invalid withdraw amount: must be positive');
    }
    if (withdrawAmount > position.principal + position.accruedInterest) {
      throw new Error('Insufficient balance in position');
    }

    const result = await this.txWrapper.executeOperation('lending_withdraw', {
      positionId: position.positionId || position.txHash,
      poolId: position.poolId,
      withdrawAmount,
      principal: position.principal
    });

    const remainingPrincipal = Math.max(0, position.principal - withdrawAmount);

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      updatedPosition: {
        ...position,
        principal: remainingPrincipal,
        lastUpdate: result.blockHeight
      }
    };
  }

  /**
   * Check position health
   * Creates a real transaction on Aleo network
   */
  async checkPositionHealth(position, collateral) {
    const result = await this.txWrapper.executeOperation('lending_check_health', {
      positionId: position.positionId || position.txHash,
      borrowedAmount: position.borrowedAmount,
      collateralAmount: collateral.amount,
      liquidationThreshold: position.liquidationThreshold
    });

    const healthFactor = lendingUtils.calculateHealthFactor(
      collateral.valueUsd || collateral.amount,
      position.borrowedAmount + position.accruedInterest,
      position.liquidationThreshold
    );

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      isHealthy: healthFactor > 10000,
      healthFactor
    };
  }

  /**
   * Get lending positions from transaction history
   */
  async getLendingPositions() {
    const depositHistory = this.txWrapper.getHistory({ operationType: 'lending_deposit' });
    const withdrawHistory = this.txWrapper.getHistory({ operationType: 'lending_withdraw' });

    // Track positions
    const positions = new Map();

    depositHistory.forEach(tx => {
      if (tx.params) {
        positions.set(tx.txHash, {
          positionId: tx.txHash,
          txHash: tx.txHash,
          explorerLink: tx.explorerLink,
          owner: this.wallet?.address || 'aleo1lender',
          poolId: tx.params.poolId,
          principal: tx.params.amount,
          accruedInterest: Math.floor(tx.params.amount * 0.05), // 5% mock interest
          interestRate: tx.params.baseInterestRate,
          depositBlock: tx.blockHeight,
          lastUpdate: tx.timestamp
        });
      }
    });

    // Apply withdrawals
    withdrawHistory.forEach(tx => {
      if (tx.params?.positionId && positions.has(tx.params.positionId)) {
        const pos = positions.get(tx.params.positionId);
        pos.principal -= tx.params.withdrawAmount || 0;
        if (pos.principal <= 0) {
          positions.delete(tx.params.positionId);
        }
      }
    });

    return Array.from(positions.values());
  }

  /**
   * Get borrow positions from transaction history
   */
  async getBorrowPositions() {
    const borrowHistory = this.txWrapper.getHistory({ operationType: 'lending_borrow' });
    const repayHistory = this.txWrapper.getHistory({ operationType: 'lending_repay' });

    // Track positions
    const positions = new Map();

    borrowHistory.forEach(tx => {
      if (tx.params) {
        positions.set(tx.txHash, {
          positionId: tx.txHash,
          txHash: tx.txHash,
          explorerLink: tx.explorerLink,
          owner: this.wallet?.address || 'aleo1borrower',
          poolId: tx.params.poolId,
          borrowedAmount: tx.params.borrowAmount,
          collateralAmount: tx.params.collateralAmount,
          interestRate: 800, // 8% default
          accruedInterest: Math.floor(tx.params.borrowAmount * 0.02), // 2% mock interest
          liquidationThreshold: 12000,
          borrowBlock: tx.blockHeight,
          dueBlock: tx.blockHeight + (tx.params.loanTerm || 10000),
          lastUpdate: tx.timestamp
        });
      }
    });

    // Apply repayments
    repayHistory.forEach(tx => {
      if (tx.params?.positionId && positions.has(tx.params.positionId)) {
        const pos = positions.get(tx.params.positionId);
        pos.borrowedAmount -= tx.params.repayAmount || 0;
        if (pos.borrowedAmount <= 0) {
          positions.delete(tx.params.positionId);
        }
      }
    });

    return Array.from(positions.values());
  }

  /**
   * Get transaction history for lending operations
   */
  getTransactionHistory(limit = 50) {
    return this.txWrapper.getHistory({ limit })
      .filter(tx => tx.operationType?.startsWith('lending_'));
  }
}

// Export singleton instance
export const privateLendingSystem = new PrivateLendingSystem();

// Export utility functions
export const lendingUtils = {
  /**
   * Calculate interest earned over time
   */
  calculateInterest(principal, interestRate, blocksElapsed) {
    // Assuming ~525,600 blocks per year (1 block per minute)
    const annualInterest = (principal * interestRate) / 10000;
    const interestPerBlock = annualInterest / 525600;
    return Math.floor(interestPerBlock * blocksElapsed);
  },

  /**
   * Calculate health factor for a position
   */
  calculateHealthFactor(collateralValue, debtValue, liquidationThreshold) {
    if (debtValue === 0) return 99999; // Max health factor
    return (collateralValue * liquidationThreshold) / (debtValue * 100);
  },

  /**
   * Calculate borrowing interest rate based on collateral ratio
   */
  calculateBorrowRate(collateralRatio, hasGoodCredit = false) {
    let baseRate = 800; // 8% APR base rate

    // Adjust based on collateral ratio
    const collateralAdjustment = collateralRatio < 15000 ?
      (15000 - collateralRatio) / 100 : 0;

    // Credit discount
    const creditDiscount = hasGoodCredit ? 100 : 0;

    const finalRate = baseRate + collateralAdjustment - creditDiscount;

    // Cap at 25% APR
    return Math.min(finalRate, 2500);
  },

  /**
   * Calculate utilization rate for a pool
   */
  calculateUtilizationRate(totalDeposits, totalBorrowed) {
    if (totalDeposits === 0) return 0;
    return (totalBorrowed * 10000) / totalDeposits;
  },

  /**
   * Format lending position for display
   */
  formatLendingPosition(position) {
    const totalValue = position.principal + position.accruedInterest;
    const apy = position.interestRate / 100;

    return {
      ...position,
      totalValue,
      apy,
      formattedApy: `${apy.toFixed(2)}%`,
      formattedValue: `${(totalValue / 1000000).toFixed(2)}M`
    };
  },

  /**
   * Format borrow position for display
   */
  formatBorrowPosition(position) {
    const totalDebt = position.borrowedAmount + position.accruedInterest;
    const apy = position.interestRate / 100;
    const collateralRatio = (position.collateralAmount * 10000) / position.borrowedAmount;

    return {
      ...position,
      totalDebt,
      apy,
      collateralRatio,
      formattedApy: `${apy.toFixed(2)}%`,
      formattedDebt: `${(totalDebt / 1000000).toFixed(2)}M`,
      formattedCollateralRatio: `${(collateralRatio / 100).toFixed(1)}%`
    };
  }
};
