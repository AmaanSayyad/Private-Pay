/**
 * ZEC Price Oracle Service
 * 
 * Fetches ZEC/USD price from multiple sources
 * Updates price on Aztec network
 * Provides median price for stability
 */

import axios from 'axios';

/**
 * Oracle Service Class
 * Manages ZEC price feeds
 */
export class ZECOracle {
  constructor(config) {
    this.config = config;
    this.sources = [
      'coingecko',
      'coinmarketcap',
      'binance',
      'kraken'
    ];
    this.currentPrice = null;
    this.updateInterval = config.updateInterval || 60000; // 1 minute
    this.isRunning = false;
  }

  /**
   * Initialize oracle
   */
  async initialize() {
    console.log('Initializing ZEC Oracle...');
    await this.updatePrice();
    console.log('✅ Oracle initialized');
  }

  /**
   * Start price updates
   */
  async start() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting oracle price updates...');

    while (this.isRunning) {
      await this.updatePrice();
      await this.sleep(this.updateInterval);
    }
  }

  /**
   * Stop price updates
   */
  async stop() {
    this.isRunning = false;
    console.log('🛑 Oracle stopped');
  }

  /**
   * Update price from all sources
   */
  async updatePrice() {
    try {
      const prices = await Promise.all(
        this.sources.map(source => this.fetchPrice(source))
      );

      // Filter out null values
      const validPrices = prices.filter(p => p !== null);

      if (validPrices.length === 0) {
        console.warn('No valid prices from any source');
        return;
      }

      // Calculate median (resistant to outliers)
      const medianPrice = this.median(validPrices);
      this.currentPrice = medianPrice;

      // Update on Aztec (if configured)
      if (this.config.aztec && this.config.aztec.contract) {
        await this.updateAztecPrice(medianPrice);
      }

      console.log(`💰 ZEC/USD Price: $${medianPrice.toFixed(2)}`);
    } catch (error) {
      console.error('Error updating price:', error);
    }
  }

  /**
   * Fetch price from CoinGecko
   */
  async fetchPrice(source) {
    try {
      switch (source) {
        case 'coingecko':
          return await this.fetchCoinGecko();
        case 'coinmarketcap':
          return await this.fetchCoinMarketCap();
        case 'binance':
          return await this.fetchBinance();
        case 'kraken':
          return await this.fetchKraken();
        default:
          return null;
      }
    } catch (error) {
      console.error(`Error fetching from ${source}:`, error);
      return null;
    }
  }

  /**
   * Fetch from CoinGecko
   */
  async fetchCoinGecko() {
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price',
      {
        params: {
          ids: 'zcash',
          vs_currencies: 'usd'
        }
      }
    );
    return response.data.zcash.usd;
  }

  /**
   * Fetch from CoinMarketCap
   */
  async fetchCoinMarketCap() {
    const apiKey = this.config.coinmarketcap?.apiKey;
    if (!apiKey) {
      return null;
    }

    const response = await axios.get(
      'https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest',
      {
        headers: {
          'X-CMC_PRO_API_KEY': apiKey
        },
        params: {
          symbol: 'ZEC',
          convert: 'USD'
        }
      }
    );
    return response.data.data.ZEC.quote.USD.price;
  }

  /**
   * Fetch from Binance
   */
  async fetchBinance() {
    const response = await axios.get(
      'https://api.binance.com/api/v3/ticker/price',
      {
        params: {
          symbol: 'ZECUSDT'
        }
      }
    );
    return parseFloat(response.data.price);
  }

  /**
   * Fetch from Kraken
   */
  async fetchKraken() {
    const response = await axios.get(
      'https://api.kraken.com/0/public/Ticker',
      {
        params: {
          pair: 'ZECUSD'
        }
      }
    );
    const result = response.data.result;
    const pair = Object.keys(result)[0];
    return parseFloat(result[pair].c[0]); // Last price
  }

  /**
   * Calculate median of array
   */
  median(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }

  /**
   * Update price on Aztec
   */
  async updateAztecPrice(price) {
    // In production, this would call the Aztec oracle contract
    // For now, placeholder
    console.log(`Updating Aztec price: $${price.toFixed(2)}`);
  }

  /**
   * Get current price
   */
  getCurrentPrice() {
    return this.currentPrice;
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Create oracle instance
 */
export function createZECOracle(config) {
  return new ZECOracle(config);
}



