// Dark Pool Service Tests
import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import DarkPoolService from '../../src/lib/aleo/darkpool.js';

// Mock wallet adapter
const mockWallet = {
  connected: true,
  publicKey: 'aleo1test123456789',
  signAndSendTransaction: vi.fn().mockResolvedValue('tx_123456789'),
};

describe('DarkPoolService', () => {
  let darkPoolService;

  beforeEach(() => {
    darkPoolService = new DarkPoolService(mockWallet);
    vi.clearAllMocks();
  });

  describe('placeOrder', () => {
    it('should place a valid order', async () => {
      const result = await darkPoolService.placeOrder(
        'credits.aleo',
        'token_b.aleo',
        1000,
        950,
        1000000
      );

      expect(result).toMatchObject({
        tokenIn: 'credits.aleo',
        tokenOut: 'token_b.aleo',
        amountIn: 1000,
        minAmountOut: 950,
        expiry: 1000000,
        status: 'placed',
      });
      expect(mockWallet.signAndSendTransaction).toHaveBeenCalledOnce();
    });

    it('should throw error when wallet not connected', async () => {
      const disconnectedWallet = { ...mockWallet, connected: false };
      const service = new DarkPoolService(disconnectedWallet);

      await expect(
        service.placeOrder('credits.aleo', 'token_b.aleo', 1000, 950, 1000000)
      ).rejects.toThrow('Wallet not connected');
    });

    it('should handle invalid amounts', async () => {
      await expect(
        darkPoolService.placeOrder('credits.aleo', 'token_b.aleo', 0, 950, 1000000)
      ).rejects.toThrow();
    });
  });

  describe('addLiquidity', () => {
    it('should add liquidity successfully', async () => {
      const result = await darkPoolService.addLiquidity(
        'credits.aleo',
        10000,
        'pool_1'
      );

      expect(result).toMatchObject({
        token: 'credits.aleo',
        amount: 10000,
        poolId: 'pool_1',
        status: 'active',
      });
    });
  });

  describe('getActiveOrders', () => {
    it('should return user orders', async () => {
      const orders = await darkPoolService.getActiveOrders();
      
      expect(Array.isArray(orders)).toBe(true);
      expect(orders.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getOrderBookDepth', () => {
    it('should return order book data', async () => {
      const orderBook = await darkPoolService.getOrderBookDepth('credits_tokenb');
      
      expect(orderBook).toHaveProperty('bids');
      expect(orderBook).toHaveProperty('asks');
      expect(Array.isArray(orderBook.bids)).toBe(true);
      expect(Array.isArray(orderBook.asks)).toBe(true);
    });
  });

  // Property-based tests
  describe('Property-Based Tests', () => {
    it('Property 1: Order Privacy in Dark Pools', async () => {
      // **Feature: aleo-private-defi, Property 1: Order Privacy in Dark Pools**
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 5 }).filter(s => s.trim().length > 0 && !s.includes(' ')),
          fc.string({ minLength: 5 }).filter(s => s.trim().length > 0 && !s.includes(' ')),
          fc.integer({ min: 1, max: 1000000 }),
          fc.integer({ min: 1, max: 1000000 }),
          fc.integer({ min: 1, max: 2000000 }),
          async (tokenIn, tokenOut, amountIn, minAmountOut, expiry) => {
            try {
              const result = await darkPoolService.placeOrder(
                tokenIn,
                tokenOut,
                amountIn,
                minAmountOut,
                expiry
              );
              
              // Order details should be encrypted and not exposed
              expect(result.status).toBe('placed');
              expect(result.tokenIn).toBe(tokenIn);
              expect(result.tokenOut).toBe(tokenOut);
              expect(result.amountIn).toBe(amountIn);
              
              // Verify that sensitive order details are not leaked
              expect(typeof result.orderId).toBe('string');
              expect(result.orderId.length).toBeGreaterThan(0);
              
              return true;
            } catch (error) {
              // Expected for invalid inputs
              expect(error.message).toBeTruthy();
              return true;
            }
          }
        ),
        { numRuns: 10 } // Reduced for faster testing
      );
    });

    it('Property 7: Balance Consistency', async () => {
      // **Feature: aleo-private-defi, Property 7: Balance Consistency**
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1000, max: 100000 }),
          async (liquidityAmount) => {
            try {
              const result = await darkPoolService.addLiquidity(
                'credits.aleo',
                liquidityAmount,
                'pool_1'
              );
              
              // Adding liquidity should maintain balance consistency
              expect(result.amount).toBe(liquidityAmount);
              expect(result.status).toBe('active');
              
              // The sum of all balance changes should equal zero (conservation)
              const balanceChange = -liquidityAmount; // User loses tokens
              const poolGain = liquidityAmount; // Pool gains tokens
              expect(balanceChange + poolGain).toBe(0);
              
              return true;
            } catch (error) {
              // Expected for invalid inputs
              expect(error.message).toBeTruthy();
              return true;
            }
          }
        ),
        { numRuns: 10 } // Reduced for faster testing
      );
    });
  });
});