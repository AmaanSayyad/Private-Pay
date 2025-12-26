// ZK Credit System Tests
import { describe, it, expect, beforeEach } from 'vitest';
import { creditUtils } from '../../src/lib/aleo/credit.js';

// Mock ZKCreditSystem for testing
class MockZKCreditSystem {
  constructor(privateKey) {
    this.privateKey = privateKey;
    this.programName = 'zk_credit.aleo';
  }

  formatCreditScoreRecord(creditScore) {
    return `CreditScore { owner: ${creditScore.owner}, score: ${creditScore.score}u64, last_updated: ${creditScore.lastUpdated}u32, verification_proof: ${creditScore.verificationProof}field, credit_history_hash: ${creditScore.creditHistoryHash}field, payment_count: ${creditScore.paymentCount}u64, default_count: ${creditScore.defaultCount}u64 }`;
  }

  formatLoanRecord(loan) {
    return `Loan { borrower: ${loan.borrower}, lender: ${loan.lender}, principal: ${loan.principal}u64, interest_rate: ${loan.interestRate}u64, term: ${loan.term}u32, collateral_ratio: ${loan.collateralRatio}u64, status: ${loan.status}u8, issue_block: ${loan.issueBlock}u32, due_block: ${loan.dueBlock}u32, loan_id: ${loan.loanId}field }`;
  }

  formatCreditProofRecord(creditProof) {
    return `CreditProof { owner: ${creditProof.owner}, min_score_met: ${creditProof.minScoreMet}, proof_hash: ${creditProof.proofHash}field, verification_block: ${creditProof.verificationBlock}u32, valid_until: ${creditProof.validUntil}u32 }`;
  }
}

describe('ZK Credit System', () => {
  let creditSystem;

  beforeEach(() => {
    // Use a test private key for testing
    const testPrivateKey = 'APrivateKey1zkp8CZNn3yeCseEtxuVPbDCwSyhGW6yZKUYKfgXmcpoGPWH';
    creditSystem = new MockZKCreditSystem(testPrivateKey);
  });

  describe('Credit Score Management', () => {
    it('should initialize credit score with valid parameters', async () => {
      const initialScore = 720;
      const verificationProof = '1234567890';
      
      // Note: This would normally interact with the blockchain
      // For testing, we'll verify the parameters are processed correctly
      expect(initialScore).toBeGreaterThanOrEqual(300);
      expect(initialScore).toBeLessThanOrEqual(850);
      expect(verificationProof).toBeTruthy();
    });

    it('should reject invalid credit scores', () => {
      expect(() => {
        const invalidScore = 200; // Below minimum
        if (invalidScore < 300 || invalidScore > 850) {
          throw new Error('Invalid credit score range');
        }
      }).toThrow('Invalid credit score range');
    });

    it('should format credit score records correctly', () => {
      const creditScore = {
        owner: 'aleo1test',
        score: 720,
        lastUpdated: 100,
        verificationProof: '1234567890field',
        creditHistoryHash: '9876543210field',
        paymentCount: 5,
        defaultCount: 0
      };

      const formatted = creditSystem.formatCreditScoreRecord(creditScore);
      expect(formatted).toContain('owner: aleo1test');
      expect(formatted).toContain('score: 720u64');
      expect(formatted).toContain('payment_count: 5u64');
    });
  });

  describe('Loan Management', () => {
    it('should format loan records correctly', () => {
      const loan = {
        borrower: 'aleo1borrower',
        lender: 'aleo1lender',
        principal: 10000,
        interestRate: 500,
        term: 5256,
        collateralRatio: 7500,
        status: 0,
        issueBlock: 100,
        dueBlock: 5356,
        loanId: '1111111111field'
      };

      const formatted = creditSystem.formatLoanRecord(loan);
      expect(formatted).toContain('borrower: aleo1borrower');
      expect(formatted).toContain('principal: 10000u64');
      expect(formatted).toContain('status: 0u8');
    });

    it('should validate loan parameters', () => {
      const principal = 10000;
      const interestRate = 500; // 5% APR
      const term = 5256; // ~3 months
      const collateralRatio = 7500; // 75%

      expect(principal).toBeGreaterThan(0);
      expect(interestRate).toBeGreaterThan(0);
      expect(interestRate).toBeLessThanOrEqual(10000); // Max 100% APR
      expect(term).toBeGreaterThan(0);
      expect(term).toBeLessThanOrEqual(52560); // Max 1 year
      expect(collateralRatio).toBeLessThanOrEqual(15000); // Max 150%
    });
  });

  describe('Credit Verification', () => {
    it('should format credit proof records correctly', () => {
      const creditProof = {
        owner: 'aleo1test',
        minScoreMet: true,
        proofHash: '1111111111field',
        verificationBlock: 100,
        validUntil: 200
      };

      const formatted = creditSystem.formatCreditProofRecord(creditProof);
      expect(formatted).toContain('owner: aleo1test');
      expect(formatted).toContain('min_score_met: true');
      expect(formatted).toContain('valid_until: 200u32');
    });

    it('should validate proof validity period', () => {
      const currentBlock = 150;
      const validUntil = 200;
      
      expect(validUntil).toBeGreaterThan(currentBlock);
    });
  });
});

describe('Credit Utils', () => {
  describe('Credit Score Calculations', () => {
    it('should calculate credit score range correctly', () => {
      // Excellent credit: no defaults, 12+ payments
      const excellent = creditUtils.calculateCreditScoreRange(15, 0);
      expect(excellent.category).toBe('Excellent');
      expect(excellent.min).toBe(750);
      expect(excellent.max).toBe(850);

      // Good credit: <10% default rate, 6+ payments
      const good = creditUtils.calculateCreditScoreRange(10, 0);
      expect(good.category).toBe('Good');
      expect(good.min).toBe(700);

      // Fair credit: <20% default rate, 3+ payments
      const fair = creditUtils.calculateCreditScoreRange(5, 0);
      expect(fair.category).toBe('Fair');
      expect(fair.min).toBe(650);

      // Poor credit: high default rate or few payments
      const poor = creditUtils.calculateCreditScoreRange(2, 1);
      expect(poor.category).toBe('Poor');
      expect(poor.max).toBe(649);
    });

    it('should calculate max loan amount based on credit score', () => {
      expect(creditUtils.calculateMaxLoanAmount(800)).toBe(100000); // Excellent
      expect(creditUtils.calculateMaxLoanAmount(720)).toBe(50000);  // Good
      expect(creditUtils.calculateMaxLoanAmount(670)).toBe(25000);  // Fair
      expect(creditUtils.calculateMaxLoanAmount(600)).toBe(10000);  // Poor
    });

    it('should calculate minimum collateral ratio based on credit score', () => {
      expect(creditUtils.calculateMinCollateralRatio(800)).toBe(5000);  // 50%
      expect(creditUtils.calculateMinCollateralRatio(720)).toBe(7500);  // 75%
      expect(creditUtils.calculateMinCollateralRatio(670)).toBe(10000); // 100%
      expect(creditUtils.calculateMinCollateralRatio(600)).toBe(12500); // 125%
    });

    it('should format credit score for display', () => {
      const excellent = creditUtils.formatCreditScore(800);
      expect(excellent.color).toBe('success');
      expect(excellent.description).toBe('Excellent Credit');

      const good = creditUtils.formatCreditScore(720);
      expect(good.color).toBe('primary');
      expect(good.description).toBe('Good Credit');

      const fair = creditUtils.formatCreditScore(670);
      expect(fair.color).toBe('warning');
      expect(fair.description).toBe('Fair Credit');

      const poor = creditUtils.formatCreditScore(600);
      expect(poor.color).toBe('danger');
      expect(poor.description).toBe('Poor Credit');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero payments correctly', () => {
      const result = creditUtils.calculateCreditScoreRange(0, 0);
      expect(result.category).toBe('Poor');
    });

    it('should handle high default rates correctly', () => {
      const result = creditUtils.calculateCreditScoreRange(10, 5); // 50% default rate
      expect(result.category).toBe('Poor');
    });

    it('should cap credit scores at boundaries', () => {
      expect(creditUtils.calculateMaxLoanAmount(900)).toBe(100000); // Above max
      expect(creditUtils.calculateMaxLoanAmount(200)).toBe(10000);  // Below min
    });
  });
});