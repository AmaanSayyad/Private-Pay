// Shielded AMM Service
// Handles automated market making with encrypted liquidity positions
// Updated to use Transaction Wrapper for real blockchain transactions

import { PROGRAM_IDS, POOLS } from './constants.js';
import { TransactionWrapper } from './transactionWrapper.js';
import { calculateSlippage, calculatePriceImpact } from './utils.js';

class ShieldedAMMService {
  constructor(walletAdapter) {
    this.wallet = walletAdapter;
    this.programId = PROGRAM_IDS.SHIELDED_AMM;
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
   * Execute a private swap
   * Creates a real transaction on Aleo network
   */
  async swap(tokenIn, tokenOut, amountIn, minAmountOut, poolId) {
    if (!tokenIn || !tokenOut) {
      throw new Error('Invalid token identifiers');
    }
    if (amountIn <= 0 || minAmountOut <= 0) {
      throw new Error('Invalid amounts: must be positive');
    }

    // Calculate expected output and price impact
    const poolInfo = await this.getPoolInfo(poolId);
    const expectedOutput = this.calculateSwapOutput(amountIn, poolInfo);
    const priceImpact = calculatePriceImpact(amountIn, poolInfo.reserveIn, poolInfo.reserveOut);

    const result = await this.txWrapper.executeOperation('amm_swap', {
      tokenIn,
      tokenOut,
      amountIn,
      minAmountOut,
      poolId,
      expectedOutput,
      priceImpact
    });

    return {
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      tokenIn,
      tokenOut,
      amountIn,
      amountOut: expectedOutput,
      priceImpact,
      slippage: calculateSlippage(expectedOutput, expectedOutput),
      fee: amountIn * POOLS.DEFAULT_FEE_RATE / 1000000,
      timestamp: result.timestamp
    };
  }

  /**
   * Add liquidity to a shielded pool
   * Creates a real transaction on Aleo network
   */
  async addLiquidity(poolId, tokenAAmount, tokenBAmount) {
    if (tokenAAmount <= 0 || tokenBAmount <= 0) {
      throw new Error('Invalid amounts: must be positive');
    }

    const result = await this.txWrapper.executeOperation('amm_add_liquidity', {
      poolId,
      tokenAAmount,
      tokenBAmount
    });

    // Calculate LP tokens (simplified)
    const lpTokens = Math.sqrt(tokenAAmount * tokenBAmount);

    return {
      positionId: result.txHash,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      poolId,
      tokenAAmount,
      tokenBAmount,
      lpTokens,
      share: 0, // Would be calculated based on total pool liquidity
      timestamp: result.timestamp
    };
  }

  /**
   * Remove liquidity from a shielded pool
   * Creates a real transaction on Aleo network
   */
  async removeLiquidity(position, lpTokensToBurn) {
    if (lpTokensToBurn <= 0) {
      throw new Error('Invalid LP tokens: must be positive');
    }

    const result = await this.txWrapper.executeOperation('amm_remove_liquidity', {
      positionId: position.positionId,
      lpTokensToBurn,
      poolId: position.poolId
    });

    // Calculate proportional withdrawal
    const withdrawalRatio = lpTokensToBurn / (position.lpTokens || 1);
    const tokenAOut = (position.tokenAAmount || 0) * withdrawalRatio;
    const tokenBOut = (position.tokenBAmount || 0) * withdrawalRatio;

    return {
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      positionId: position.positionId,
      lpTokensBurned: lpTokensToBurn,
      tokenAOut,
      tokenBOut,
      timestamp: result.timestamp
    };
  }

  /**
   * Claim accumulated fees from LP position
   * Creates a real transaction on Aleo network
   */
  async claimFees(position) {
    const result = await this.txWrapper.executeOperation('amm_claim_fees', {
      positionId: position.positionId,
      poolId: position.poolId
    });

    // Calculate fees earned (simplified)
    const feesEarned = (position.lpTokens || 0) * 0.01; // 1% of LP tokens

    return {
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      positionId: position.positionId,
      feesEarned,
      timestamp: result.timestamp
    };
  }

  /**
   * Get user's LP positions
   */
  async getLPPositions() {
    const addHistory = this.txWrapper.getHistory({ operationType: 'amm_add_liquidity' });
    const removeHistory = this.txWrapper.getHistory({ operationType: 'amm_remove_liquidity' });

    // Calculate active positions
    const positions = new Map();

    addHistory.forEach(tx => {
      if (tx.params) {
        const lpTokens = Math.sqrt((tx.params.tokenAAmount || 0) * (tx.params.tokenBAmount || 0));
        positions.set(tx.txHash, {
          positionId: tx.txHash,
          txHash: tx.txHash,
          explorerLink: tx.explorerLink,
          poolId: tx.params.poolId,
          tokenAAmount: tx.params.tokenAAmount,
          tokenBAmount: tx.params.tokenBAmount,
          lpTokens,
          share: 5.2, // Mock share percentage
          feesEarned: lpTokens * 0.01,
          timestamp: tx.timestamp
        });
      }
    });

    // Reduce positions based on removals
    removeHistory.forEach(tx => {
      if (tx.params?.positionId && positions.has(tx.params.positionId)) {
        const pos = positions.get(tx.params.positionId);
        pos.lpTokens -= tx.params.lpTokensToBurn || 0;
        if (pos.lpTokens <= 0) {
          positions.delete(tx.params.positionId);
        }
      }
    });

    return Array.from(positions.values());
  }

  /**
   * Get pool information
   */
  async getPoolInfo(poolId) {
    // This would query actual pool state
    return {
      poolId,
      tokenA: 'credits.aleo',
      tokenB: 'token_b.aleo',
      reserveA: 1000000,
      reserveB: 950000,
      reserveIn: 1000000, // For swap calculations
      reserveOut: 950000,
      totalLiquidity: 975000,
      feeRate: POOLS.DEFAULT_FEE_RATE,
      volume24h: 50000,
      fees24h: 150,
      timestamp: Date.now()
    };
  }

  /**
   * Calculate swap output amount
   */
  calculateSwapOutput(amountIn, poolInfo) {
    const { reserveIn, reserveOut, feeRate } = poolInfo;

    // Apply fee
    const amountInWithFee = amountIn * (1000000 - feeRate) / 1000000;

    // Constant product formula: x * y = k
    const amountOut = (amountInWithFee * reserveOut) / (reserveIn + amountInWithFee);

    return Math.floor(amountOut);
  }

  /**
   * Get swap quote
   */
  async getSwapQuote(tokenIn, tokenOut, amountIn) {
    const poolId = `pool_${tokenIn}_${tokenOut}`;
    const poolInfo = await this.getPoolInfo(poolId);

    const amountOut = this.calculateSwapOutput(amountIn, poolInfo);
    const priceImpact = calculatePriceImpact(amountIn, poolInfo.reserveIn, poolInfo.reserveOut);
    const fee = amountIn * poolInfo.feeRate / 1000000;

    return {
      tokenIn,
      tokenOut,
      amountIn,
      amountOut,
      priceImpact,
      fee,
      feeRate: poolInfo.feeRate,
      price: amountOut / amountIn,
      timestamp: Date.now()
    };
  }

  /**
   * Get available pools
   */
  async getAvailablePools() {
    return [
      {
        poolId: 'pool_credits_tokenb',
        tokenA: 'credits.aleo',
        tokenB: 'token_b.aleo',
        reserveA: 1000000,
        reserveB: 950000,
        totalLiquidity: 975000,
        feeRate: POOLS.DEFAULT_FEE_RATE,
        volume24h: 50000,
        apy: 12.5
      },
      {
        poolId: 'pool_credits_tokenc',
        tokenA: 'credits.aleo',
        tokenB: 'token_c.aleo',
        reserveA: 500000,
        reserveB: 600000,
        totalLiquidity: 548000,
        feeRate: POOLS.DEFAULT_FEE_RATE,
        volume24h: 25000,
        apy: 8.3
      }
    ];
  }

  /**
   * Get transaction history for AMM operations
   */
  getTransactionHistory(limit = 50) {
    return this.txWrapper.getHistory({ limit })
      .filter(tx => tx.operationType?.startsWith('amm_'));
  }
}

export default ShieldedAMMService;
export { ShieldedAMMService };
