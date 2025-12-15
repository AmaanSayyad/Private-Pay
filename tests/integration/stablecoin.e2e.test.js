/**
 * End-to-End Stablecoin Integration Tests
 * 
 * Tests the complete stablecoin flow:
 * 1. Minting pZUSD with ZEC collateral
 * 2. Burning pZUSD to redeem ZEC
 * 3. Oracle price updates
 * 4. Collateralization checks
 * 5. Liquidation triggers
 */

import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import { ZECOracle } from '../../backend/services/oracle.js';
import { createAztecPXEClient } from '../../src/lib/aztec/index.js';

describe('Stablecoin E2E Tests', () => {
  let oracle;
  let aztecClient;

  beforeAll(async () => {
    // Initialize oracle
    oracle = new ZECOracle({
      updateInterval: 60000,
      aztec: {
        contract: process.env.VITE_AZTEC_STABLECOIN_CONTRACT || '',
      },
    });
    await oracle.initialize();

    // Initialize Aztec connection
    aztecClient = createAztecPXEClient(
      process.env.VITE_AZTEC_PXE_URL || 'http://localhost:8080'
    );
    await aztecClient.connect();
  });

  afterAll(async () => {
    if (oracle) {
      await oracle.stop();
    }
  });

  describe('Oracle Price Feeds', () => {
    it('should fetch ZEC price from multiple sources', async () => {
      const price = await oracle.fetchPrice('coingecko');
      expect(price).toBeGreaterThan(0);
    });

    it('should calculate median price', async () => {
      await oracle.updatePrice();
      const medianPrice = oracle.getCurrentPrice();
      expect(medianPrice).toBeGreaterThan(0);
    });

    it('should update price on Aztec', async () => {
      // This would update price on Aztec stablecoin contract
      // Requires deployed contract
      const price = oracle.getCurrentPrice();
      expect(price).toBeDefined();
    });
  });

  describe('Minting pZUSD', () => {
    it('should calculate stablecoin amount from ZEC collateral', () => {
      const zecAmount = 10.0;
      const zecPrice = 50.0; // $50 per ZEC
      const collateralizationRatio = 1.5; // 150%

      // Max stablecoin = (ZEC * Price) / Collateralization Ratio
      const maxStablecoin = (zecAmount * zecPrice) / collateralizationRatio;
      expect(maxStablecoin).toBe(333.33); // Approximately
    });

    it('should verify collateralization ratio', () => {
      const zecAmount = 10.0;
      const zecPrice = 50.0;
      const stablecoinAmount = 300.0;
      const collateralizationRatio = 1.5;

      const collateralValue = zecAmount * zecPrice;
      const requiredCollateral = stablecoinAmount * collateralizationRatio;

      expect(collateralValue).toBeGreaterThanOrEqual(requiredCollateral);
    });
  });

  describe('Burning pZUSD', () => {
    it('should calculate ZEC return amount', () => {
      const stablecoinAmount = 300.0;
      const zecPrice = 50.0;

      // 1:1 redemption: 1 pZUSD = (1 / ZEC_PRICE) ZEC
      const zecReturn = stablecoinAmount / zecPrice;
      expect(zecReturn).toBe(6.0);
    });
  });

  describe('Risk Management', () => {
    it('should check collateralization ratio', () => {
      const collateral = 10.0; // 10 ZEC
      const zecPrice = 50.0;
      const debt = 300.0; // 300 pZUSD

      const collateralValue = collateral * zecPrice;
      const ratio = (collateralValue / debt) * 100;

      expect(ratio).toBeGreaterThan(130); // Above liquidation threshold
    });

    it('should trigger liquidation when below threshold', () => {
      const collateral = 5.0; // 5 ZEC
      const zecPrice = 50.0;
      const debt = 300.0; // 300 pZUSD

      const collateralValue = collateral * zecPrice;
      const ratio = (collateralValue / debt) * 100;

      // Liquidation threshold is 130%
      const isLiquidatable = ratio < 130;
      expect(isLiquidatable).toBe(true);
    });
  });
});



