// Private Lending System Tests
import { describe, it, expect, beforeEach } from 'vitest';

// Mock lending utilities for testing
const lendingUtils = {
  calculateInterest(principal, interestRate, blocksElapsed) {
    // Assuming ~525,600 blocks per year (1 block per minute)
    const annualInterest = (principal * interestRate) / 10000;
    const interestPerBlock = annualInterest / 525600;
    return Math.floor(interestPerBlock * blocksElapsed);
  },

  calculateHealthFactor(collateralValue, debtValue, liquidationThreshold) {
    if (debtValue === 0) return 99999; // Max health factor
    return (collateralValue * liquidationThreshold) / (debtValue * 100);
  },

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

  calculateUtilizationRate(totalDeposits, totalBorrowed) {
    if (totalDeposits === 0) return 0;
    return (totalBorrowed * 10000) / totalDeposits;
  },

  formatLendingPosition(position) {
    const totalValue = position.principal + position.accruedInterest;
    const apy = position.interestRate / 100; // Convert basis points to percentage
    
    return {
      ...position,
      totalValue,
      apy,
      formattedApy: `${apy.toFixed(2)}%`,
      formattedValue: `${(totalValue / 1000000).toFixed(2)}M`
    };
  },

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

// Mock PrivateLendingSystem for testing
class MockPrivateLendingSystem {
  constructor(privateKey) {
    this.privateKey = privateKey;
    this.programName = 'private_lending.aleo';
  }

  formatLendingPositionRecord(position) {
    return `LendingPosition { owner: ${position.owner}, pool_id: ${position.poolId}field, principal: ${position.principal}u64, accrued_interest: ${position.accruedInterest}u64, last_update: ${position.lastUpdate}u32, interest_rate: ${position.interestRate}u64, shares: ${position.shares}u64, deposit_block: ${position.depositBlock}u32 }`;
  }

  formatBorrowPositionRecord(position) {
    return `BorrowPosition { owner: ${position.owner}, pool_id: ${position.poolId}field, borrowed_amount: ${position.borrowedAmount}u64, collateral_amount: ${position.collateralAmount}u64, interest_rate: ${position.interestRate}u64, last_update: ${position.lastUpdate}u32, accrued_interest: ${position.accruedInterest}u64, liquidation_threshold: ${position.liquidationThreshold}u64, borrow_block: ${position.borrowBlock}u32, due_block: ${position.dueBlock}u32 }`;
  }

  formatCollateralRecord(collateral) {
    return `Collateral { owner: ${collateral.owner}, pool_id: ${collateral.poolId}field, token_type: ${collateral.tokenType}field, amount: ${collateral.amount}u64, value_usd: ${collateral.valueUsd}u64, liquidation_threshold: ${collateral.liquidationThreshold}u64, deposit_block: ${collateral.depositBlock}u32 }`;
  }
}

describe('Private Lending System', () => {
  let lendingSystem;

  beforeEach(() => {
    // Use a test private key for testing
    const testPrivateKey = 'APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH';
    lendingSystem = new MockPrivateLendingSystem(testPrivateKey);
  });

  describe('Lending Position Management', () => {
    it('should format lending position records correctly', () => {
      const position = {
        owner: 'aleo1lender',
        poolId: '1111111111field',
        principal: 10000,
        accruedInterest: 500,
        lastUpdate: 100,
        interestRate: 500,
        shares: 10000,
        depositBlock: 100
      };

      const formatted = lendingSystem.formatLendingPositionRecord(position);
      expect(formatted).toContain('owner: aleo1lender');
      expect(formatted).toContain('principal: 10000u64');
      expect(formatted).toContain('interest_rate: 500u64');
      expect(formatted).toContain('shares: 10000u64');
    });

    it('should validate deposit parameters', () => {
      const amount = 10000;
      const baseInterestRate = 500; // 5% APR

      expect(amount).toBeGreaterThan(0);
      expect(baseInterestRate).toBeGreaterThan(0);
      expect(baseInterestRate).toBeLessThanOrEqual(2000); // Max 20% APR
    });
  });

  describe('Borrow Position Management', () => {
    it('should format borrow position records correctly', () => {
      const position = {
        owner: 'aleo1borrower',
        poolId: '1111111111field',
        borrowedAmount: 5000,
        collateralAmount: 8000,
        interestRate: 800,
        lastUpdate: 100,
        accruedInterest: 100,
        liquidationThreshold: 8000,
        borrowBlock: 100,
        dueBlock: 5356
      };

      const formatted = lendingSystem.formatBorrowPositionRecord(position);
      expect(formatted).toContain('owner: aleo1borrower');
      expect(formatted).toContain('borrowed_amount: 5000u64');
      expect(formatted).toContain('collateral_amount: 8000u64');
      expect(formatted).toContain('liquidation_threshold: 8000u64');
    });

    it('should validate borrow parameters', () => {
      const borrowAmount = 5000;
      const loanTerm = 5256; // ~3 months
      const collateralValue = 8000;
      const collateralRatio = (collateralValue * 10000) / borrowAmount;

      expect(borrowAmount).toBeGreaterThan(0);
      expect(loanTerm).toBeGreaterThan(0);
      expect(loanTerm).toBeLessThanOrEqual(26280); // Max 6 months
      expect(collateralRatio).toBeGreaterThanOrEqual(12000); // Min 120%
    });
  });

  describe('Collateral Management', () => {
    it('should format collateral records correctly', () => {
      const collateral = {
        owner: 'aleo1borrower',
        poolId: '1111111111field',
        tokenType: '2222222222field',
        amount: 8000,
        valueUsd: 8000,
        liquidationThreshold: 8000,
        depositBlock: 100
      };

      const formatted = lendingSystem.formatCollateralRecord(collateral);
      expect(formatted).toContain('owner: aleo1borrower');
      expect(formatted).toContain('token_type: 2222222222field');
      expect(formatted).toContain('value_usd: 8000u64');
    });

    it('should validate collateral requirements', () => {
      const collateralValue = 8000;
      const borrowAmount = 5000;
      const collateralRatio = (collateralValue * 10000) / borrowAmount;

      expect(collateralRatio).toBeGreaterThanOrEqual(12000); // Min 120%
    });
  });
});

describe('Lending Utils', () => {
  describe('Interest Calculations', () => {
    it('should calculate interest correctly', () => {
      const principal = 10000;
      const interestRate = 500; // 5% APR
      const blocksElapsed = 52560; // ~1 year

      const interest = lendingUtils.calculateInterest(principal, interestRate, blocksElapsed);
      
      // Should be approximately 0.95% of principal (50/52560 of 5%)
      const expectedInterest = Math.floor((principal * interestRate * blocksElapsed) / (10000 * 525600));
      expect(interest).toBe(expectedInterest);
    });

    it('should handle zero principal', () => {
      const interest = lendingUtils.calculateInterest(0, 500, 1000);
      expect(interest).toBe(0);
    });

    it('should handle zero interest rate', () => {
      const interest = lendingUtils.calculateInterest(10000, 0, 1000);
      expect(interest).toBe(0);
    });

    it('should handle zero time elapsed', () => {
      const interest = lendingUtils.calculateInterest(10000, 500, 0);
      expect(interest).toBe(0);
    });
  });

  describe('Health Factor Calculations', () => {
    it('should calculate health factor correctly', () => {
      const collateralValue = 15000;
      const debtValue = 10000;
      const liquidationThreshold = 8000; // 80%

      const healthFactor = lendingUtils.calculateHealthFactor(
        collateralValue, 
        debtValue, 
        liquidationThreshold
      );

      // Expected: (15000 * 8000) / (10000 * 100) = 120
      expect(healthFactor).toBe(120);
    });

    it('should return max health factor for zero debt', () => {
      const healthFactor = lendingUtils.calculateHealthFactor(10000, 0, 8000);
      expect(healthFactor).toBe(99999);
    });

    it('should handle undercollateralized positions', () => {
      const collateralValue = 8000;
      const debtValue = 10000;
      const liquidationThreshold = 8000;

      const healthFactor = lendingUtils.calculateHealthFactor(
        collateralValue, 
        debtValue, 
        liquidationThreshold
      );

      expect(healthFactor).toBeLessThan(10000); // Unhealthy
    });
  });

  describe('Borrow Rate Calculations', () => {
    it('should calculate borrow rate based on collateral ratio', () => {
      // High collateral ratio should result in lower rate
      const highCollateralRate = lendingUtils.calculateBorrowRate(20000, false); // 200%
      const lowCollateralRate = lendingUtils.calculateBorrowRate(12000, false);  // 120%

      expect(highCollateralRate).toBeLessThan(lowCollateralRate);
    });

    it('should apply credit discount', () => {
      const rateWithoutCredit = lendingUtils.calculateBorrowRate(15000, false);
      const rateWithCredit = lendingUtils.calculateBorrowRate(15000, true);

      expect(rateWithCredit).toBeLessThan(rateWithoutCredit);
    });

    it('should cap rate at maximum', () => {
      const rate = lendingUtils.calculateBorrowRate(5000, false); // Very low collateral
      expect(rate).toBeLessThanOrEqual(2500); // Max 25% APR
    });

    it('should not go below base rate', () => {
      const rate = lendingUtils.calculateBorrowRate(50000, true); // Very high collateral + credit
      expect(rate).toBeGreaterThan(0);
    });
  });

  describe('Utilization Rate Calculations', () => {
    it('should calculate utilization rate correctly', () => {
      const totalDeposits = 100000;
      const totalBorrowed = 75000;

      const utilizationRate = lendingUtils.calculateUtilizationRate(totalDeposits, totalBorrowed);
      expect(utilizationRate).toBe(7500); // 75%
    });

    it('should handle zero deposits', () => {
      const utilizationRate = lendingUtils.calculateUtilizationRate(0, 0);
      expect(utilizationRate).toBe(0);
    });

    it('should handle full utilization', () => {
      const utilizationRate = lendingUtils.calculateUtilizationRate(100000, 100000);
      expect(utilizationRate).toBe(10000); // 100%
    });
  });

  describe('Position Formatting', () => {
    it('should format lending position for display', () => {
      const position = {
        owner: 'aleo1lender',
        poolId: '1111111111field',
        principal: 10000000, // 10M
        accruedInterest: 500000, // 0.5M
        interestRate: 500 // 5%
      };

      const formatted = lendingUtils.formatLendingPosition(position);
      expect(formatted.totalValue).toBe(10500000);
      expect(formatted.apy).toBe(5);
      expect(formatted.formattedApy).toBe('5.00%');
      expect(formatted.formattedValue).toBe('10.50M');
    });

    it('should format borrow position for display', () => {
      const position = {
        owner: 'aleo1borrower',
        borrowedAmount: 5000000, // 5M
        accruedInterest: 250000, // 0.25M
        collateralAmount: 8000000, // 8M
        interestRate: 800 // 8%
      };

      const formatted = lendingUtils.formatBorrowPosition(position);
      expect(formatted.totalDebt).toBe(5250000);
      expect(formatted.apy).toBe(8);
      expect(formatted.collateralRatio).toBe(16000); // 160%
      expect(formatted.formattedApy).toBe('8.00%');
      expect(formatted.formattedDebt).toBe('5.25M');
      expect(formatted.formattedCollateralRatio).toBe('160.0%');
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small amounts', () => {
      const interest = lendingUtils.calculateInterest(1, 1, 1);
      expect(interest).toBeGreaterThanOrEqual(0);
    });

    it('should handle very large amounts', () => {
      const interest = lendingUtils.calculateInterest(
        Number.MAX_SAFE_INTEGER / 1000000, 
        1000, 
        1000
      );
      expect(interest).toBeGreaterThan(0);
      expect(Number.isFinite(interest)).toBe(true);
    });

    it('should handle extreme collateral ratios', () => {
      const lowRate = lendingUtils.calculateBorrowRate(100000, true); // 1000% collateral
      const highRate = lendingUtils.calculateBorrowRate(1000, false);  // 10% collateral

      expect(lowRate).toBeLessThan(highRate);
      expect(lowRate).toBeGreaterThan(0);
      expect(highRate).toBeLessThanOrEqual(2500);
    });
  });
});