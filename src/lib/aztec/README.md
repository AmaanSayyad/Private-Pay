# Aztec Integration Module

This module provides integration with the Aztec privacy protocol for private smart contracts and encrypted state.

## Features

- ✅ Aztec PXE (Private eXecution Environment) client
- ✅ Encrypted notes management
- ✅ Zcash-Aztec bridge implementation
- ✅ Private transaction handling

## Usage

### Basic Setup

```javascript
import { createConfiguredPXEClient, createNoteManager } from '@/lib/aztec';

// Create PXE client
const pxeClient = createConfiguredPXEClient('testnet');
await pxeClient.connect();

// Create note manager
const noteManager = createNoteManager();
```

### Bridge Operations

```javascript
import { createBridgeManager } from '@/lib/aztec';
import { createZcashWallet } from '@/lib/zcash';

// Create bridge manager
const zcashWallet = createZcashWallet(zcashRPC);
const bridgeManager = createBridgeManager(pxeClient, zcashWallet);

// Deposit ZEC to Aztec
const deposit = await bridgeManager.createDeposit(
  zcashTxId,
  zcashNote,
  amount
);

// Claim bZEC on Aztec
const txHash = await bridgeManager.claimBZEC(deposit.ticketId, aztecAddress);

// Withdraw from Aztec to Zcash
const withdrawal = await bridgeManager.createWithdrawal(
  bzecAmount,
  zcashAddress,
  encryptedNote
);
```

### Encrypted Notes

```javascript
import { EncryptedNote, createNoteManager } from '@/lib/aztec';

// Create note manager
const noteManager = createNoteManager();

// Add notes
const note = new EncryptedNote(
  commitment,
  nullifier,
  value,
  owner,
  assetId
);
noteManager.addNote(note);

// Get balance
const balance = noteManager.getBalance(assetId);

// Select notes for payment
const selectedNotes = noteManager.selectNotesForPayment(amount, assetId);
```

## Configuration

Set environment variables:

```env
VITE_AZTEC_NETWORK=testnet  # or 'mainnet'
VITE_AZTEC_PXE_URL=http://localhost:8080  # Optional, overrides default
```

## Architecture

```
aztec/
├── aztecClient.js      # PXE client for Aztec connection
├── encryptedNotes.js   # Encrypted note management
├── bridge.js           # Zcash-Aztec bridge
└── index.js            # Module exports and configuration
```

## Next Steps

- [ ] Integrate Aztec SDK for actual PXE connection
- [ ] Implement zk-SNARK proof generation for bridge
- [ ] Add comprehensive error handling
- [ ] Add transaction status polling
- [ ] Add integration tests

## Security Notes

⚠️ **Important**: 
- Encrypted notes contain sensitive data - handle with care
- Bridge operations require proper proof generation
- PXE connection should use secure channels in production
- Viewing keys allow transaction viewing but not spending



