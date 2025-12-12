# Zcash-Aztec Bridge Architecture

## Overview

A bi-directional, privacy-preserving bridge between Zcash and Aztec that enables users to transfer ZEC between networks while maintaining complete privacy.

## Architecture Design

### Core Components

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Zcash Chain   │◄────────┤  Bridge Operator  │────────►│  Aztec Network  │
│                 │         │  (MPC/EigenLayer)  │         │                 │
│ Shielded Tx     │         │                   │         │ Encrypted Notes │
│ Partial Notes   │         │  - Validates      │         │ Private State   │
│ Viewing Keys    │         │  - Processes      │         │ bZEC Tokens     │
└─────────────────┘         │  - Audits         │         └─────────────────┘
                             └──────────────────┘
```

### Key Features

1. **Privacy-Preserving**: Uses partial notes and encrypted proofs
2. **Decentralized**: MPC or EigenLayer AVS for validation
3. **Auditable**: Viewing keys for authorized audit access
4. **Bi-Directional**: Supports both Zcash→Aztec and Aztec→Zcash

## Deposit Flow (Zcash → Aztec)

### Step 1: User Creates Deposit Intent

```javascript
// User generates partial note from Zcash transaction
const partialNote = generatePartialNote(zcashNote);

// Create ticket ID for claiming
const ticketId = generateTicketId();

// Include ticket ID in Zcash memo field
const zcashTx = await zcashWallet.sendShieldedTransaction(
  fromAddress,
  [{ address: bridgeAddress, amount, memo: ticketId }]
);
```

### Step 2: Bridge Operator Monitors

```javascript
// Operator scans Zcash blockchain using viewing keys
const deposits = await scanZcashDeposits(bridgeAddress);

// For each deposit:
// 1. Extract ticket ID from memo
// 2. Verify partial note proof
// 3. Register ticket on Aztec
```

### Step 3: User Claims bZEC

```javascript
// User creates zk-SNARK proof of deposit
const proof = await createPartialNoteProof(partialNote, provingKey);

// Submit claim to Aztec bridge contract
const txHash = await aztecBridge.claimBZEC({
  ticketId,
  proof,
  recipient: aztecAddress
});
```

### Step 4: Bridge Contract Validates

```javascript
// On Aztec:
// 1. Verify zk-SNARK proof
// 2. Check ticket not already claimed
// 3. Mint bZEC tokens to recipient
// 4. Mark ticket as claimed
```

## Withdrawal Flow (Aztec → Zcash)

### Step 1: User Burns bZEC

```javascript
// User creates encrypted withdrawal note
const withdrawalNote = new EncryptedNote(
  commitment,
  nullifier,
  bzecAmount,
  zcashAddress, // Encrypted Zcash address
  BZEC_ASSET_ID
);

// Burn bZEC on Aztec
const aztecTx = await aztecBridge.burnBZEC({
  amount: bzecAmount,
  withdrawalNote: withdrawalNote.toJSON()
});
```

### Step 2: Bridge Operator Processes

```javascript
// Operator monitors Aztec for burn events
const burns = await scanAztecBurns(bridgeContract);

// For each burn:
// 1. Decrypt withdrawal note (using operator key)
// 2. Extract Zcash address
// 3. Send ZEC to address on Zcash
```

### Step 3: Operator Sends ZEC

```javascript
// Operator creates shielded transaction
const zcashTx = await zcashWallet.sendShieldedTransaction(
  bridgeAddress,
  [{ address: recipientAddress, amount }]
);
```

## Security Mechanisms

### 1. Partial Notes

- **Purpose**: Prove ownership without revealing full transaction details
- **Implementation**: zk-SNARK proofs of note commitments
- **Privacy**: Only commitment and nullifier revealed, value encrypted

### 2. MPC/EigenLayer AVS

**Option A: Multi-Party Computation (MPC)**
- Multiple operators share key material
- No single point of failure
- Threshold signatures required

**Option B: EigenLayer AVS**
- Decentralized validation network
- Economic security through staking
- Slashing for misbehavior

### 3. Viewing Keys for Auditability

- Authorized parties can view transactions
- Does not compromise user privacy
- Enables regulatory compliance

## Smart Contract Design

### Aztec Bridge Contract

```rust
// Pseudo-code structure
contract ZcashBridge {
    // State
    mapping(ticketId => Deposit) deposits;
    mapping(aztecTxId => Withdrawal) withdrawals;
    
    // Events
    event DepositRegistered(ticketId, amount);
    event BZECClaimed(ticketId, recipient);
    event BZECBurned(aztecTxId, amount);
    event WithdrawalProcessed(aztecTxId, zcashAddress);
    
    // Functions
    function registerDeposit(ticketId, proof) public;
    function claimBZEC(ticketId, proof, recipient) public;
    function burnBZEC(amount, withdrawalNote) public;
    function processWithdrawal(aztecTxId, proof) public;
}
```

## Operator Architecture

### Monitoring Service

```javascript
class BridgeOperator {
  async monitorZcash() {
    // Scan for deposits to bridge address
    // Extract ticket IDs from memos
    // Verify partial note proofs
    // Register tickets on Aztec
  }
  
  async monitorAztec() {
    // Scan for bZEC burns
    // Decrypt withdrawal notes
    // Process withdrawals to Zcash
  }
  
  async validateProof(proof) {
    // Verify zk-SNARK proof
    // Check against registered deposits
  }
}
```

## Risk Management

### 1. Double Spending Prevention

- Nullifier tracking on both chains
- Ticket ID uniqueness enforcement
- Proof verification before minting

### 2. Operator Misbehavior

- MPC threshold prevents single operator attack
- EigenLayer slashing for misbehavior
- Viewing keys enable audit trail

### 3. Bridge Solvency

- Reserve tracking
- Real-time balance monitoring
- Circuit breakers for large withdrawals

## Implementation Phases

### Phase 1: Basic Bridge (Current)
- ✅ Partial notes structure
- ✅ Bridge manager implementation
- ✅ Encrypted notes management

### Phase 2: Proof System
- [ ] zk-SNARK circuit for partial notes
- [ ] Proof generation/verification
- [ ] Integration with Aztec contract

### Phase 3: Operator Infrastructure
- [ ] MPC setup or EigenLayer integration
- [ ] Monitoring services
- [ ] Automated processing

### Phase 4: Security & Audit
- [ ] Security audit
- [ ] Penetration testing
- [ ] Mainnet deployment

## Next Steps

1. Implement zk-SNARK proof generation
2. Deploy Aztec bridge contract
3. Set up operator infrastructure
4. Conduct security audit



