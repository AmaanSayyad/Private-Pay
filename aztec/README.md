# Aztec Smart Contracts

This directory contains Aztec Noir smart contracts for the Zcash-Aztec bridge and stablecoin.

## Contracts

### 1. ZcashBridge.nr
Bi-directional bridge contract for transferring ZEC between Zcash and Aztec.

**Key Functions**:
- `register_deposit()` - Register Zcash deposit
- `claim_bzec()` - Claim bridged ZEC (bZEC) tokens
- `burn_bzec()` - Burn bZEC to withdraw to Zcash
- `process_withdrawal()` - Process withdrawal (operator)

### 2. DummyZEC.nr
Dummy ZEC token contract for testing bridge functionality.

**Key Functions**:
- `mint()` - Mint tokens (bridge only)
- `burn()` - Burn tokens
- `transfer()` - Private transfer

### 3. PZUSD.nr
Zcash-backed stablecoin contract.

**Key Functions**:
- `mint()` - Mint stablecoin with ZEC collateral
- `burn()` - Burn stablecoin to redeem ZEC
- `check_collateralization()` - Check user's collateralization ratio
- `liquidate()` - Liquidate undercollateralized positions

## Setup

### Prerequisites

```bash
# Install Aztec CLI
npm install -g @aztec/cli

# Verify installation
aztec --version
```

### Build Contracts

```bash
cd aztec
aztec build
```

### Deploy Contracts

```bash
# Deploy to testnet
aztec deploy ZcashBridge
aztec deploy DummyZEC
aztec deploy PZUSD
```

## Testing

```bash
# Run tests
aztec test
```

## Notes

- Contracts use placeholder proof verification (needs zk-SNARK integration)
- Oracle integration is simplified (needs actual oracle contract)
- Governance functions need proper access control in production



