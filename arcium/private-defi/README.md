# Private DeFi - Arcium MPC Protocols

Privacy-preserving DeFi protocols built on Solana using Arcium's Multi-Party Computation (MPC).

## Programs

### 1. Private Swap
MEV-protected token swaps where swap amounts are encrypted and processed by MPC nodes.

**Features:**
- Encrypted swap amounts
- Protection from front-running and sandwich attacks
- Constant product AMM (x * y = k)
- Configurable fees

### 2. Dark Pool
Private order book trading where order details (price, size) remain hidden until matched.

**Features:**
- Encrypted order book
- Hidden order details
- Fair price matching at mid-price
- MEV protection

## Building

```bash
# Install dependencies
yarn install

# Build programs
anchor build

# Build encrypted instructions
cd encrypted-ixs
cargo build --release
cd ..
```

## Testing

```bash
# Run tests
yarn test
```

## Deployment

### Devnet
```bash
# Deploy to Solana devnet
anchor deploy --provider.cluster devnet

# Or use the script
yarn deploy:devnet
```

### Localnet (with Arcium)
```bash
# Start Arcium localnet
arcium localnet start

# Deploy programs
anchor deploy --provider.cluster localnet

# Or use the script
yarn deploy:localnet
```

## Program IDs

- **Private Swap**: `SwapPr1vat3D3f1AAAAAAAAAAAAAAAAAAAAAAAAAAAA`
- **Dark Pool**: `DarkP001Pr1vat3AAAAAAAAAAAAAAAAAAAAAAAAAAAA`

## Architecture

### Private Swap Flow
1. User submits encrypted swap amount
2. MPC nodes compute output amount using AMM formula
3. Slippage check performed in encrypted environment
4. Trade executed if slippage acceptable
5. Only final amounts revealed on-chain

### Dark Pool Flow
1. User submits encrypted order (price + size)
2. Order added to encrypted order book
3. Matching engine runs in MPC environment
4. Orders matched at mid-price
5. Only matched trades revealed on-chain

## Security

- All sensitive data encrypted using x25519 key exchange
- Computations performed in MPC environment
- No single party can decrypt user data
- MEV protection through encrypted mempool

## License

MIT
