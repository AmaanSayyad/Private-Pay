/**
 * Bridge Backend Service
 * 
 * Main entry point for bridge operator and oracle services
 */

import { createBridgeOperator } from './services/bridgeOperator.js';
import { createZECOracle } from './services/oracle.js';

// Configuration
const config = {
  zcash: {
    rpcUrl: process.env.ZCASH_RPC_URL || 'http://localhost:18232',
    rpcUser: process.env.ZCASH_RPC_USER || '',
    rpcPassword: process.env.ZCASH_RPC_PASSWORD || '',
    bridgeAddress: process.env.ZCASH_BRIDGE_ADDRESS || '',
    scanInterval: 60000, // 1 minute
  },
  aztec: {
    pxeUrl: process.env.AZTEC_PXE_URL || 'http://localhost:8080',
    bridgeContract: process.env.AZTEC_BRIDGE_CONTRACT || '',
    scanInterval: 60000, // 1 minute
  },
  oracle: {
    updateInterval: 60000, // 1 minute
    coinmarketcap: {
      apiKey: process.env.COINMARKETCAP_API_KEY || '',
    },
  },
};

/**
 * Main function
 */
async function main() {
  console.log('🚀 Starting Bridge Backend Services...\n');

  try {
    // Initialize bridge operator
    const bridgeOperator = createBridgeOperator(config);
    await bridgeOperator.initialize();
    await bridgeOperator.start();

    // Initialize oracle
    const oracle = createZECOracle(config.oracle);
    await oracle.initialize();
    await oracle.start();

    console.log('\n✅ All services started successfully');
    console.log('Press Ctrl+C to stop\n');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      await bridgeOperator.stop();
      await oracle.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start services:', error);
    process.exit(1);
  }
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createBridgeOperator, createZECOracle };



