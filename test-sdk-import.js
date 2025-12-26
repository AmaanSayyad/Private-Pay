import { AleoSDK, ProofProgress, RecordManager, ViewKeyManager, aleoSDK } from './src/lib/aleo/sdk.js';

console.log('Imports successful!');
console.log('AleoSDK:', typeof AleoSDK);
console.log('ProofProgress:', typeof ProofProgress);
console.log('RecordManager:', typeof RecordManager);
console.log('ViewKeyManager:', typeof ViewKeyManager);
console.log('aleoSDK:', typeof aleoSDK);

// Test instantiation
try {
  const sdk = new AleoSDK();
  console.log('SDK instance created successfully');
} catch (error) {
  console.error('Error creating SDK instance:', error.message);
}