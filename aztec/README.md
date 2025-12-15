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
# Deploy all Aztec contracts to testnet using the deployment script
cd aztec
node scripts/deploy.js testnet

# Or deploy individually with the Aztec CLI (addresses will still be picked up by the script)
aztec deploy ZcashBridge --network testnet
aztec deploy DummyZEC --network testnet
aztec deploy PZUSD --network testnet
```

## Testing

```bash
# Run tests
aztec test
```

## Notes

- ZK proof verification hooks are defined in the Noir contracts, but you still need to wire them to your concrete zk-SNARK verifier and proving keys.
- Oracle calls in `PZUSD.nr` expect a real Aztec oracle contract to be deployed and configured.
- Governance and operator roles must be configured according to your production requirements before mainnet deployment.




