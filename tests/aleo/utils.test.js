// Aleo Utilities Tests
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  creditsToMicrocredits,
  microcreditsToCredits,
  formatAleoAddress,
  isValidAleoAddress,
  calculateSlippage,
  calculatePriceImpact,
  createTransaction,
} from '../../src/lib/aleo/utils.js';

describe('Aleo Utils', () => {
  describe('creditsToMicrocredits', () => {
    it('should convert credits to microcredits correctly', () => {
      expect(creditsToMicrocredits(1)).toBe(1_000_000);
      expect(creditsToMicrocredits(0.5)).toBe(500_000);
      expect(creditsToMicrocredits(10.123456)).toBe(10_123_456);
    });

    it('should handle zero and negative values', () => {
      expect(creditsToMicrocredits(0)).toBe(0);
      expect(creditsToMicrocredits(-1)).toBe(-1_000_000);
    });
  });

  describe('microcreditsToCredits', () => {
    it('should convert microcredits to credits correctly', () => {
      expect(microcreditsToCredits(1_000_000)).toBe(1);
      expect(microcreditsToCredits(500_000)).toBe(0.5);
      expect(microcreditsToCredits(10_123_456)).toBe(10.123456);
    });

    it('should handle zero', () => {
      expect(microcreditsToCredits(0)).toBe(0);
    });
  });

  describe('formatAleoAddress', () => {
    const testAddress = 'aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc';

    it('should format address correctly', () => {
      const formatted = formatAleoAddress(testAddress);
      expect(formatted).toBe('aleo1qqq...3ljyzc');
    });

    it('should handle custom start and end chars', () => {
      const formatted = formatAleoAddress(testAddress, 10, 8);
      expect(formatted).toBe('aleo1qqqqq...qq3ljyzc');
    });

    it('should return original address if too short', () => {
      const shortAddress = 'aleo1short';
      expect(formatAleoAddress(shortAddress)).toBe(shortAddress);
    });

    it('should handle empty or null address', () => {
      expect(formatAleoAddress('')).toBe('');
      expect(formatAleoAddress(null)).toBe('');
      expect(formatAleoAddress(undefined)).toBe('');
    });
  });

  describe('isValidAleoAddress', () => {
    it('should validate correct Aleo addresses', () => {
      const validAddress = 'aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc';
      expect(isValidAleoAddress(validAddress)).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(isValidAleoAddress('invalid')).toBe(false);
      expect(isValidAleoAddress('aleo1short')).toBe(false);
      expect(isValidAleoAddress('btc1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc')).toBe(false);
      expect(isValidAleoAddress('')).toBe(false);
      expect(isValidAleoAddress(null)).toBe(false);
    });
  });

  describe('calculateSlippage', () => {
    it('should calculate slippage correctly', () => {
      expect(calculateSlippage(1000, 950)).toBe(5); // 5% slippage
      expect(calculateSlippage(1000, 1000)).toBe(0); // No slippage
      expect(calculateSlippage(1000, 1050)).toBe(5); // 5% positive slippage
    });

    it('should handle zero expected amount', () => {
      expect(calculateSlippage(0, 100)).toBe(0);
    });
  });

  describe('calculatePriceImpact', () => {
    it('should calculate price impact correctly', () => {
      const impact = calculatePriceImpact(1000, 100000, 100000);
      expect(impact).toBeGreaterThan(0);
      expect(impact).toBeLessThan(100);
    });

    it('should handle zero reserves', () => {
      expect(calculatePriceImpact(1000, 0, 100000)).toBe(0);
      expect(calculatePriceImpact(1000, 100000, 0)).toBe(0);
    });
  });

  describe('createTransaction', () => {
    it('should create transaction object correctly', () => {
      const tx = createTransaction('test.aleo', 'test_function', ['input1', 'input2'], 2000000);
      
      expect(tx).toMatchObject({
        program: 'test.aleo',
        function: 'test_function',
        inputs: ['input1', 'input2'],
        fee: 2000000,
      });
      expect(tx.timestamp).toBeTypeOf('number');
    });

    it('should use default fee when not specified', () => {
      const tx = createTransaction('test.aleo', 'test_function', ['input1']);
      expect(tx.fee).toBe(1000000); // Default fee
    });
  });

  // Property-based tests
  describe('Property-Based Tests', () => {
    it('Property: Credits conversion round-trip', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 1000000, noNaN: true }),
          (credits) => {
            const microcredits = creditsToMicrocredits(credits);
            const backToCredits = microcreditsToCredits(microcredits);
            
            // Allow for small floating point differences
            expect(Math.abs(backToCredits - credits)).toBeLessThan(0.000001);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Address formatting preserves validity', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 63, maxLength: 63 }).map(s => 'aleo1' + s.substring(5).toLowerCase()),
          (address) => {
            // Only test with potentially valid addresses
            if (isValidAleoAddress(address)) {
              const formatted = formatAleoAddress(address);
              expect(formatted).toContain('aleo1');
              expect(formatted).toContain('...');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('Property: Slippage calculation symmetry', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 1, max: 1000000, noNaN: true }),
          fc.float({ min: 1, max: 1000000, noNaN: true }),
          (expected, actual) => {
            const slippage1 = calculateSlippage(expected, actual);
            const slippage2 = calculateSlippage(actual, expected);
            
            // Slippage should be symmetric (same magnitude)
            expect(Math.abs(slippage1 - slippage2)).toBeLessThan(0.001);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});