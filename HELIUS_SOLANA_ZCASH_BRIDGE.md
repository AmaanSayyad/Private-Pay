# Helius Integration: Solana-Zcash Privacy Bridge

## Overview

This document describes the Helius integration for PrivatePay's cross-chain privacy bridge between Solana and Zcash. The integration leverages Helius APIs for enhanced transaction monitoring, priority fee optimization, and webhook-based event processing.

## Architecture

```mermaid
graph TB
    subgraph Frontend["Frontend (React + Vite)"]
        SP[SolanaProvider]
        HC[HeliusClient]
        BC[BridgeClient]
        BP[BridgePage]
    end

    subgraph Helius["Helius Services"]
        RPC[Helius RPC]
        PF[Priority Fee API]
        ET[Enhanced Transactions API]
        WH[Webhooks]
    end

    subgraph Solana["Solana Blockchain"]
        ZB[Zcash Bridge Program]
        PDAs[PDAs]
        Vault[Token Vault]
    end

    subgraph Backend["Backend Services"]
        WHH[Webhook Handler]
        BO[Bridge Operator]
        OR[Oracle]
    end

    subgraph Zcash["Zcash Network"]
        ZN[Zcash Node]
        SA[Shielded Addresses]
    end

    SP --> HC
    HC --> RPC
    HC --> PF
    HC --> ET
    BC --> HC
    BP --> BC

    WH --> WHH
    WHH --> BO
    BO --> ZB
    BO --> ZN

    ZB --> PDAs
    ZB --> Vault

    ZN --> SA
```

## Component Structure

```mermaid
graph LR
    subgraph src/lib/helius
        A[index.js] --> B[HeliusClient]
        C[bridgeMonitor.js] --> D[HeliusBridgeMonitor]
    end

    subgraph src/lib/solanaZcashBridge
        E[index.js] --> F[Stealth Addresses]
        E --> G[PDA Derivation]
        E --> H[Zcash Validation]
        I[client.js] --> J[SolanaZcashBridgeClient]
    end

    subgraph backend/services
        K[heliusWebhook.js] --> L[HeliusWebhookHandler]
    end

    subgraph solana/programs
        M[zcash_bridge] --> N[Anchor Program]
    end

    B --> J
    D --> L
    J --> N
```

## Data Flow

### Deposit Flow (Solana → Zcash)

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant Helius
    participant Solana
    participant Backend
    participant Zcash

    User->>Frontend: Initiate Deposit
    Frontend->>Helius: Get Priority Fee Estimate
    Helius-->>Frontend: Fee Recommendation
    Frontend->>Frontend: Build Transaction + Add Priority Fee
    Frontend->>Solana: Submit Transaction
    Solana-->>Frontend: Signature
    
    Solana->>Helius: Transaction Confirmed
    Helius->>Backend: Webhook Event
    Backend->>Backend: Parse Deposit Details
    Backend->>Zcash: Send Shielded Transaction
    Zcash-->>Backend: Zcash TX ID
    Backend->>Solana: Update Deposit Status
    
    Frontend->>Helius: Poll Transaction Status
    Helius-->>Frontend: Deposit Complete
    Frontend-->>User: Success Notification
```

### Withdrawal Flow (Zcash → Solana)

```mermaid
sequenceDiagram
    participant User
    participant Zcash
    participant Backend
    participant Helius
    participant Solana
    participant Frontend

    User->>Zcash: Send to Bridge Address
    Zcash-->>Backend: Shielded TX Detected
    Backend->>Backend: Generate ZK Proof
    Backend->>Solana: Initiate Withdrawal
    
    Solana->>Helius: Transaction Event
    Helius->>Backend: Webhook Notification
    Backend->>Backend: Verify Proof
    Backend->>Solana: Process Withdrawal
    
    Solana->>Helius: Withdrawal Complete
    Helius-->>Frontend: Enhanced TX Data
    Frontend-->>User: Funds Available
```

### Stealth Address Flow

```mermaid
sequenceDiagram
    participant Sender
    participant Frontend
    participant Helius
    participant Solana
    participant Recipient

    Recipient->>Solana: Register Meta-Address
    Solana-->>Recipient: Meta-Address PDA Created
    
    Sender->>Frontend: Get Recipient Meta-Address
    Frontend->>Frontend: Generate Ephemeral Keypair
    Frontend->>Frontend: Derive Stealth Address
    Frontend->>Helius: Get Priority Fee
    Frontend->>Solana: Send to Stealth Address
    
    Solana->>Helius: Stealth Payment Event
    Helius->>Recipient: Webhook (View Tag Match)
    Recipient->>Recipient: Derive Stealth Private Key
    Recipient->>Solana: Claim Funds
```

## File Structure

```
Private-Pay/
├── src/
│   ├── lib/
│   │   ├── helius/
│   │   │   ├── index.js          # HeliusClient - Core SDK
│   │   │   └── bridgeMonitor.js  # Bridge event monitoring
│   │   └── solanaZcashBridge/
│   │       ├── index.js          # Utilities, PDAs, stealth addresses
│   │       └── client.js         # Frontend bridge client
│   ├── providers/
│   │   └── SolanaProvider.jsx    # Helius-enhanced Solana context
│   └── pages/
│       └── SolanaZcashBridgePage.jsx  # Bridge UI
├── backend/
│   ├── index.js                  # Server entry point
│   ├── .env.example              # Backend environment template
│   └── services/
│       └── heliusWebhook.js      # Webhook event handler
├── solana/
│   └── programs/
│       └── zcash_bridge/
│           ├── Cargo.toml
│           └── src/
│               └── lib.rs        # Anchor program
└── HELIUS_SOLANA_ZCASH_BRIDGE.md      # This file (root level)
```

## Implementation Details

### HeliusClient (src/lib/helius/index.js)

Core client for Helius API interactions:

| Method | Purpose |
|--------|---------|
| `getPriorityFeeEstimate()` | Get recommended priority fees |
| `addPriorityFee()` | Add compute budget instructions |
| `getTransactionHistory()` | Fetch parsed transaction history |
| `parseTransactions()` | Parse raw signatures to enhanced format |
| `createWebhook()` | Create transaction webhooks |
| `createBridgeWebhook()` | Bridge-specific webhook setup |
| `getTokenBalances()` | Get SPL token balances |
| `sendTransactionWithRetry()` | Retry-enabled transaction sending |
| `confirmTransaction()` | Enhanced confirmation polling |

### HeliusBridgeMonitor (src/lib/helius/bridgeMonitor.js)

Real-time bridge monitoring via webhooks:

| Method | Purpose |
|--------|---------|
| `initialize()` | Set up webhook for bridge program |
| `processWebhookEvent()` | Parse incoming webhook events |
| `classifyTransaction()` | Identify transaction type |
| `on(eventType, handler)` | Register event handlers |
| `emit(eventType, data)` | Dispatch events to handlers |

### SolanaZcashBridgeClient (src/lib/solanaZcashBridge/client.js)

Frontend client for bridge operations:

| Method | Purpose |
|--------|---------|
| `initiateDeposit()` | Start Solana → Zcash transfer |
| `initiateWithdrawal()` | Start Zcash → Solana transfer |
| `registerStealthMetaAddress()` | Register for private payments |
| `sendStealthPayment()` | Send to stealth address |
| `claimStealthPayment()` | Claim from stealth address |
| `getDepositStatus()` | Check deposit ticket status |
| `getWithdrawalStatus()` | Check withdrawal ticket status |
| `getBridgeStats()` | Get bridge statistics |
| `estimatePriorityFee()` | Estimate fees for bridge operations |

### Anchor Program (solana/programs/zcash_bridge)

On-chain bridge program with accounts:

```mermaid
erDiagram
    BridgeState ||--o{ DepositTicket : "tracks"
    BridgeState ||--o{ WithdrawalTicket : "tracks"
    BridgeState ||--|| Vault : "owns"
    User ||--o{ StealthMetaAddress : "registers"
    User ||--o{ StealthAddress : "receives"

    BridgeState {
        Pubkey authority
        Pubkey operator
        Pubkey wrapped_zec_mint
        Pubkey vault
        u64 deposit_nonce
        u64 withdrawal_nonce
        u64 total_deposited
        u64 total_withdrawn
        bool is_paused
        u64 min_deposit
        u64 max_deposit
        u16 protocol_fee_bps
        u8 bump
    }

    DepositTicket {
        u64 ticket_id
        Pubkey depositor
        u64 amount
        u64 fee
        bytes78 zcash_shielded_address
        bytes64 memo
        DepositStatus status
        i64 created_at
        i64 processed_at
        bytes32 zcash_tx_id
        u8 bump
    }

    WithdrawalTicket {
        u64 ticket_id
        Pubkey recipient
        u64 amount
        u64 fee
        bytes32 partial_note_commitment
        bytes32 partial_note_nullifier
        bytes32 encrypted_value
        WithdrawalStatus status
        i64 created_at
        i64 processed_at
        u8 bump
    }

    StealthMetaAddress {
        Pubkey owner
        bytes33 spend_pub_key
        bytes33 viewing_pub_key
        bool is_active
        i64 created_at
        u8 bump
    }

    StealthAddress {
        Pubkey owner
        bytes33 ephemeral_pub_key
        u8 view_hint
        u32 k
        bool is_spent
        i64 created_at
        u8 bump
    }
```

## PDA Derivation

```mermaid
graph TD
    subgraph PDAs
        BS["Bridge State<br/>seeds: [b'bridge']"]
        V["Vault<br/>seeds: [b'vault']"]
        DT["Deposit Ticket<br/>seeds: [b'deposit', ticket_id]"]
        WT["Withdrawal Ticket<br/>seeds: [b'withdrawal', ticket_id]"]
        SMA["Stealth Meta Address<br/>seeds: [b'stealth_meta', owner]"]
        SA["Stealth Address<br/>seeds: [b'stealth', ephemeral_pub_key]"]
    end

    Program[Bridge Program ID] --> BS
    Program --> V
    Program --> DT
    Program --> WT
    Program --> SMA
    Program --> SA
```

## Environment Variables

### Frontend (.env) – frontend-only mode

```env
# Helius API Key (from helius.dev)
VITE_HELIUS_API_KEY=your_helius_api_key

# Solana Network
VITE_SOLANA_NETWORK=devnet

# Deployed Bridge Program ID
VITE_ZCASH_BRIDGE_PROGRAM_ID=HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5

# USDC Mint (devnet)
VITE_USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Optional: custom RPC fallback (used if no Helius key)
VITE_SOLANA_RPC_URL=https://api.devnet.solana.com
```

If you run **frontend-only** (no backend webhook handler), these variables are sufficient. The app will use Helius RPC for priority fees, enhanced transaction parsing, and status polling directly from the browser.

### Backend (backend/.env)

```env
# Helius Configuration
HELIUS_API_KEY=your_helius_api_key
SOLANA_NETWORK=devnet

# Bridge Program
ZCASH_BRIDGE_PROGRAM_ID=HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5

# Operator (for automated processing)
BRIDGE_OPERATOR_PRIVATE_KEY=your_base58_private_key

# Zcash RPC
ZCASH_RPC_URL=http://localhost:18232
ZCASH_RPC_USER=zcashuser
ZCASH_RPC_PASSWORD=zcashpass
```

## Verified Program IDs

All hardcoded program IDs are official Solana programs verified via Solscan:

| Program | ID | Verification |
|---------|----|----|
| SPL Token | `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` | [Solscan](https://solscan.io/account/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA) |
| SPL Memo | `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr` | [Solscan](https://solscan.io/account/MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr) |
| USDC (Mainnet) | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | [Solscan](https://solscan.io/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v) |

## Webhook Event Processing

```mermaid
stateDiagram-v2
    [*] --> Received: Webhook Event
    Received --> Validated: Signature Check
    Validated --> Classified: Parse Instructions
    
    Classified --> DepositHandler: DEPOSIT_INITIATED
    Classified --> WithdrawalHandler: WITHDRAWAL_INITIATED
    Classified --> StealthHandler: STEALTH_PAYMENT
    Classified --> Ignored: UNKNOWN
    
    DepositHandler --> ZcashTransfer: Extract Details
    ZcashTransfer --> UpdateStatus: TX Confirmed
    UpdateStatus --> [*]
    
    WithdrawalHandler --> VerifyProof: Extract Proof
    VerifyProof --> ProcessPayout: Valid
    VerifyProof --> Rejected: Invalid
    ProcessPayout --> [*]
    
    StealthHandler --> NotifyRecipient: Match View Tag
    NotifyRecipient --> [*]
    
    Ignored --> [*]
    Rejected --> [*]
```

## Stealth Address Cryptography

```mermaid
graph LR
    subgraph Registration
        A[Generate Spend Keypair] --> B[Generate Viewing Keypair]
        B --> C[Create Meta-Address]
        C --> D[Register on Solana]
    end

    subgraph Sending
        E[Get Meta-Address] --> F[Generate Ephemeral Keypair]
        F --> G[Compute Shared Secret]
        G --> H[Derive Stealth Address]
        H --> I[Send Funds]
        I --> J[Publish Ephemeral Pubkey + View Tag]
    end

    subgraph Receiving
        K[Scan View Tags] --> L{Tag Match?}
        L -->|Yes| M[Compute Shared Secret]
        L -->|No| N[Skip]
        M --> O[Derive Stealth Private Key]
        O --> P[Claim Funds]
    end
```

## Build & Deploy Commands

```bash
# Build the Anchor program
cd solana
anchor build -p zcash_bridge

# Deploy to devnet
cd target/deploy
solana program deploy zcash_bridge.so --program-id zcash_bridge-keypair.json -u devnet

# Start frontend
cd ../..
npm run dev

# Start backend
cd backend
npm install
npm run dev
```

## Testing

```bash
# Frontend dev server
npm run dev

# Backend server (separate terminal)
cd backend && npm run dev

# Connect wallet and navigate to /solana-zcash-bridge
```

## Security Considerations

1. **No Fabricated Values**: All program IDs are either from environment variables or verified official Solana programs
2. **Dynamic Configuration**: Bridge program ID loaded from environment at runtime
3. **Proof Verification**: ZK proofs required for withdrawals
4. **Stealth Addresses**: Privacy-preserving payment mechanism using ECDH
5. **Webhook Authentication**: Verify webhook signatures before processing

## Dependencies

### Frontend
- `@solana/web3.js` - Solana JavaScript SDK
- `@solana/spl-token` - SPL Token operations
- `@coral-xyz/anchor` - Anchor client
- `axios` - HTTP client for Helius API
- `@noble/hashes` - Cryptographic hashing
- `@noble/secp256k1` - Elliptic curve operations
- `bs58` - Base58 encoding

### Backend
- `express` - HTTP server
- `@coral-xyz/anchor` - Anchor client
- `@solana/web3.js` - Solana SDK
- `dotenv` - Environment configuration

### Solana Program
- `anchor-lang = "0.29.0"` - Anchor framework
- `anchor-spl = "0.29.0"` - SPL integrations

## Future Enhancements

1. **Helius DAS API**: Add digital asset standard support for NFT bridging
2. **Priority Fee Caching**: Reduce API calls with intelligent caching
3. **Multi-token Support**: Bridge additional SPL tokens
4. **Cross-chain Messaging**: Integrate with Wormhole/LayerZero
5. **Audit Trail**: Enhanced logging and monitoring
