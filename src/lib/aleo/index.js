// Aleo SDK Integration
// Main entry point for Aleo blockchain interactions

// Import and export the main SDK
export { AleoSDK, aleoSDK, ProofProgress, RecordManager, ViewKeyManager, initializeAleoSDK } from './sdk.js';

// Import and export Transaction Wrapper (core for real transactions)
export { TransactionWrapper, transactionWrapper, txUtils } from './transactionWrapper.js';

// Import and export Transaction Helper (simplified for UI components)
export { createAleoTransaction, executeAleoOperation, getTransactionHistory, OPERATION_TYPES, TREASURY_ADDRESS } from './aleoTransactionHelper.js';

// Import and export existing services (updated to use Transaction Wrapper)
export { DarkPoolService } from './darkpool.js';
export { ShieldedAMMService } from './amm.js';

// Import and export new services (updated to use Transaction Wrapper)
export { ZKCreditSystem, zkCreditSystem, creditUtils } from './credit.js';
export { PrivateLendingSystem, privateLendingSystem, lendingUtils } from './lending.js';
export { TreasuryManager, treasuryUtils } from './treasury.js';
export { ComplianceManager, complianceUtils } from './compliance.js';

// Placeholder exports for future services
// export { CrossChainVaultService } from './vaults.js';
// export { BridgeService } from './bridge.js';

// Common utilities
export * from './utils.js';
export * from './constants.js';