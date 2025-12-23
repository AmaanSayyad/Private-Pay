# Private Pay - Arcium Integration

This directory contains the Solana/Arcium programs for Private Pay's private DeFi features.

## Overview

Private Pay leverages Arcium's Multi-Party Computation (MPC) network to enable:

1. **Private Payments** - Encrypted balance transfers where amounts remain hidden
2. **Private Swap** - Token exchanges with hidden amounts, protected from MEV
3. **Dark Pool** - Private order book trading with encrypted orders

## Architecture

```
solana/
├── Anchor.toml          # Anchor configuration
├── Arcium.toml          # Arcium MXE configuration
├── Cargo.toml           # Rust workspace configuration
├── programs/
│   └── private_pay/     # Main Solana program
│       └── src/lib.rs   # Program implementation
├── encrypted-ixs/       # Arcis encrypted circuits
│   └── src/lib.rs       # MPC computation logic
└── tests/               # Integration tests
    └── private_pay.ts
```

## Prerequisites

### System Requirements

- **Rust** 1.89.0+
- **Solana CLI** 2.3.0+
- **Anchor** 0.30.1+
- **Node.js** 18+
- **Docker** (for running local Arx nodes)

### Install Arcium CLI

```bash
# Install arcup (Arcium version manager)
curl -sSf https://bin.arcium.com/install.sh | sh

# Install Arcium tooling
arcup install

# Verify installation
arcium --version
```

> **Note**: Arcium CLI does not support Windows natively. Use WSL2 on Windows.

## Development Setup

### 1. Set up Solana CLI for Devnet

```bash
solana config set --url https://api.devnet.solana.com
solana-keygen new  # Generate a new keypair if needed
solana airdrop 2   # Get devnet SOL
```

### 2. Build the Programs

```bash
cd solana
arcium build
```

This will:
- Compile the encrypted instructions (circuits) in `encrypted-ixs/`
- Build the Solana program in `programs/private_pay/`
- Generate IDL and TypeScript types

### 3. Deploy to Devnet

```bash
arcium deploy
```

### 4. Run Tests

```bash
# Install dependencies
yarn install

# Run tests
arcium test
```

## Program Instructions

### Private Payments

| Instruction | Description |
|------------|-------------|
| `create_balance_account` | Create a new private balance account |
| `deposit_funds` | Deposit tokens (public amount, private balance) |
| `send_payment` | Send encrypted payment to another account |

### Private Swap

| Instruction | Description |
|------------|-------------|
| `create_pool` | Create a new liquidity pool |
| `execute_swap` | Execute a private token swap |

### Dark Pool

| Instruction | Description |
|------------|-------------|
| `create_order_book` | Initialize a new dark pool |
| `place_order` | Place an encrypted order |
| `match_orders` | Trigger order matching |

## How It Works

### Encryption Flow

1. **Client-side Encryption**: User encrypts data using x25519 key exchange
2. **On-chain Submission**: Encrypted data is submitted to Solana
3. **MPC Computation**: Arcium nodes compute on encrypted data without decryption
4. **Callback**: Results are returned via callback, decryptable only by authorized parties

### Example: Private Swap

```typescript
// Generate encryption keys
const privateKey = x25519.utils.randomSecretKey();
const publicKey = x25519.getPublicKey(privateKey);

// Get shared secret with MXE
const mxePublicKey = await getMXEPublicKey(provider, programId);
const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);

// Encrypt swap amounts
const cipher = new RescueCipher(sharedSecret);
const nonce = randomBytes(16);
const encryptedAmounts = cipher.encrypt([inputAmount, minOutput], nonce);

// Execute swap
await program.methods
  .executeSwap(/* ... encrypted params ... */)
  .rpc();
```

## Security Considerations

- **MPC Security**: Data is split across multiple nodes; no single node sees plaintext
- **MEV Protection**: Order details are never revealed before execution
- **Replay Protection**: Each transaction includes a unique nonce

## Environment Variables

Create a `.env` file:

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
ARCIUM_CLUSTER_OFFSET=0
```

## Testnet Information

- **Network**: Solana Devnet
- **Arcium Status**: Public Testnet
- **MPC Nodes**: 3 nodes minimum

## Resources

- [Arcium Documentation](https://docs.arcium.com)
- [Anchor Documentation](https://www.anchor-lang.com)
- [Solana Documentation](https://docs.solana.com)

## License

MIT











