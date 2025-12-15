# Zcash Integration Module

This module provides integration with the Zcash blockchain for private, shielded transactions.

## Features

- ✅ Zcash RPC client for node communication
- ✅ Shielded address generation (Sapling/Orchard)
- ✅ Viewing key management for auditability
- ✅ Partial notes implementation for bridge proofs
- ✅ Transaction sending and monitoring

## Usage

### Basic Setup

```javascript
import { createConfiguredRPCClient, createZcashWallet } from '@/lib/zcash';

// Create RPC client
const rpcClient = createConfiguredRPCClient('testnet');

// Create wallet instance
const wallet = createZcashWallet(rpcClient);
await wallet.initialize();
```

### Generate Shielded Address

```javascript
// Generate Sapling address
const saplingAddress = await wallet.generateShieldedAddress('sapling', 'My Address');

// Generate Orchard address
const orchardAddress = await wallet.generateShieldedAddress('orchard', 'My Orchard Address');
```

### Get Viewing Key

```javascript
// Export viewing key for auditability
const viewingKey = await wallet.getViewingKey(saplingAddress);
```

### Send Shielded Transaction

```javascript
// Send ZEC to multiple recipients
const recipients = [
  { address: 'ztest...', amount: 0.1 },
  { address: 'ztest2...', amount: 0.2 },
];

const txid = await wallet.sendShieldedTransaction(
  saplingAddress,
  recipients,
  0.0001 // fee
);
```

### Monitor Address with Viewing Key

```javascript
// Import viewing key to monitor an address
const monitoredAddress = await wallet.importViewingKey(viewingKey, 'Monitored Address');

// Get unspent notes
const notes = await wallet.getUnspentNotes(monitoredAddress);
```

### Partial Notes for Bridge

```javascript
import { generatePartialNote, createPartialNoteProof } from '@/lib/zcash';

// Generate partial note from Zcash note
const partialNote = generatePartialNote(zcashNote);

// Create proof for bridge deposit
const proof = await createPartialNoteProof(partialNote, provingKey);
```

## Configuration

Set environment variables:

```env
VITE_ZCASH_RPC_USER=your_rpc_user
VITE_ZCASH_RPC_PASSWORD=your_rpc_password
VITE_ZCASH_NETWORK=testnet  # or 'mainnet'
```

Or configure RPC URL directly:

```javascript
import { createZcashRPCClient } from '@/lib/zcash';

const rpcClient = createZcashRPCClient(
  'http://localhost:18232', // RPC URL
  'rpcuser',                 // RPC user
  'rpcpassword'              // RPC password
);
```

## Architecture

```
zcash/
├── zcashRPC.js      # RPC client for Zcash node communication
├── zcashWallet.js   # Wallet manager for addresses and transactions
├── partialNotes.js  # Partial notes for bridge proofs
└── index.js         # Module exports and configuration
```

## Next Steps

- [ ] Integrate zk-SNARK library for proof generation/verification
- [ ] Add comprehensive error handling
- [ ] Add transaction status polling
- [ ] Add note commitment tree tracking
- [ ] Add integration tests

## Security Notes

⚠️ **Important**: 
- Never expose RPC credentials in client-side code
- Use environment variables for sensitive configuration
- Partial notes proof generation requires zk-SNARK library (currently placeholder)
- Viewing keys allow transaction viewing but not spending






