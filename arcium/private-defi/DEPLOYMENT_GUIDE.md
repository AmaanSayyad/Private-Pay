# Arcium MPC Programs Deployment Guide

## Prerequisites

1. **Rust & Cargo** - Already installed ✓
2. **Solana CLI** - Already installed ✓
3. **Anchor CLI** - Already installed ✓
4. **Clang/LLVM** - Already installed ✓

## Build Process

### Step 1: Build Encrypted Instructions

The encrypted instructions need to be compiled to WASM first:

```bash
cd encrypted-ixs
cargo build --release --target wasm32-unknown-unknown
```

This creates `.arcis` files that contain the MPC circuit definitions.

### Step 2: Build Anchor Programs

Once encrypted instructions are built, build the Anchor programs:

```bash
anchor build
```

### Step 3: Deploy to Devnet

```bash
# Set Solana to devnet
solana config set --url devnet

# Airdrop SOL for deployment (if needed)
solana airdrop 2

# Deploy programs
anchor deploy --provider.cluster devnet
```

## Program IDs

- **Private Pay**: `7oNtYFkJ9sgDBLCEN8mYjLCYQUQ3ZvPRnTRAV9kb5QhP`
- **Private Swap**: `6qqmuL4qmRMXrpPsUPsKLzabsbSoiKHRdhH817xFE1aa`
- **Dark Pool**: `ExmtDaTNpjZbgx2qABKG4AkxV5NTKbg5P7WY1iThqJAG`

## Current Issues

1. **WASM Build Errors**: The encrypted-ixs crate has dependency conflicts with `mio` for WASM target
2. **Solution**: Need to exclude network-related dependencies or use `no-default-features`

## Next Steps

1. Fix encrypted-ixs dependencies
2. Build successfully
3. Deploy to Arcium devnet
4. Test with frontend
5. Verify on Arcium explorer
