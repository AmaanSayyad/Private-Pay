# Aleo Private DeFi - Leo Programs

This directory contains the Leo programs that implement privacy-preserving DeFi features on the Aleo blockchain.

## Programs

### Core Trading Programs
- `dark_pool.aleo` - Private order matching and dark pool trading
- `shielded_amm.aleo` - Automated market maker with encrypted liquidity positions

### Credit and Lending Programs  
- `zk_credit.aleo` - Zero-knowledge credit scoring system
- `private_lending.aleo` - Privacy-preserving lending pools

### Cross-Chain Programs
- `cross_chain_vault.aleo` - Multi-chain yield farming with private positions
- `bridge_manager.aleo` - Cross-chain asset bridging with cryptographic proofs

### Treasury and Compliance Programs
- `treasury_management.aleo` - Multi-signature treasury with private allocations
- `compliance_module.aleo` - Selective disclosure for regulatory compliance

## Development

### Prerequisites
- Leo compiler (install from https://developer.aleo.org/leo/installation)
- Aleo CLI tools

### Building Programs
```bash
# Build all programs
npm run leo:build

# Build specific program
cd programs/dark_pool && leo build
```

### Testing Programs
```bash
# Run all tests
npm run leo:test

# Test specific program
cd programs/dark_pool && leo test
```

### Deployment
```bash
# Deploy to testnet
leo deploy --network testnet

# Deploy to mainnet (when available)
leo deploy --network mainnet
```

## Program Structure

Each program follows this structure:
```
programs/
├── program_name/
│   ├── src/
│   │   └── main.leo
│   ├── inputs/
│   │   └── program_name.in
│   ├── program.json
│   └── README.md
```

## Integration with Frontend

The Leo programs are integrated with the React frontend through:
- `src/lib/aleo/` - JavaScript SDK wrappers
- `src/components/aleo/` - React components for each program
- `src/pages/` - Page-level components for major features

## Security Considerations

- All private data is encrypted using Aleo's record model
- ZK proofs ensure computation privacy
- View keys enable selective disclosure for compliance
- Multi-signature schemes protect treasury operations