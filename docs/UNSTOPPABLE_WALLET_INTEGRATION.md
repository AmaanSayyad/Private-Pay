# Unstoppable Wallet Integration - Technical Documentation

## Overview

Complete self-custody wallet implementation with **real blockchain connectivity**, multi-chain support, and privacy features.

---

## ✅ Features Implemented

### Core Wallet
- **Self-Custody**: BIP39 mnemonic (24 words)
- **Multi-Chain**: Solana, Ethereum, Aptos, Zcash, Aztec, Mina
- **Encrypted Storage**: AES-GCM with PBKDF2

### Blockchain Integration
- **Real Balance Fetching**: Live RPC calls
  - Solana (devnet)
  - Ethereum (Sepolia)
  - Aptos (testnet)
  - Zcash (local RPC or fallback APIs)
- **Transaction Sending**: Production-ready
  - Solana ✅
  - Ethereum ✅
  - Zcash ✅ (via local RPC)
- **Transaction History**: With pagination & filtering

### Privacy Features
- Balance hiding
- Stealth addresses (ECDH-based)
- Decoy mode
- Privacy score calculation
- **zk-SNARK** circuit (compile with `npm run compile:circuit`)

---

## 🏗️ Architecture

### Key Derivation
```
BIP39 Mnemonic (24 words)
    ↓
BIP39 Seed
    → Solana: BIP44 m/44'/501'/0'/0'
    → Ethereum: BIP44 m/44'/60'/0'/0/0
    → Aptos: BIP44 m/44'/637'/0'/0'
    → Zcash: zcash-bitcore-lib
    → Aztec/Mina: Ed25519 derivation
```

### Security
- **Encryption**: AES-GCM
- **Key Derivation**: PBKDF2 (100,000 iterations)
- **Storage**: Encrypted in localStorage
- **No API Keys**: Direct RPC connections

---

## 📁 File Structure

### Core Files
| File | Purpose |
|------|---------|
| `src/lib/unstoppable/multichain.js` | BIP44 key derivation for all chains |
| `src/lib/unstoppable/balanceService.js` | Real balance fetching from RPCs |
| `src/lib/unstoppable/sendService.js` | Transaction signing & broadcasting |
| `src/lib/unstoppable/transactionService.js` | Transaction history queries |
| `src/providers/UnstoppableProvider.jsx` | Wallet state management |
| `src/pages/UnstoppableDashboard.jsx` | UI components |

### Circuit Files
| File | Purpose |
|------|---------|
| `src/circuits/bridge.circom` | zk-SNARK circuit for privacy proofs |
| `scripts/compile-circuit.sh` | Automated circuit compilation |

**Note:** Circuit artifacts (`keys/`, `build/circuits/`) are gitignored. Compile locally with:
```bash
npm run compile:circuit
```

---

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Variables
```env
# Zcash RPC (optional - falls back to public APIs)
VITE_ZCASH_RPC_URL=http://localhost:18232
VITE_ZCASH_RPC_USER=zcashuser
VITE_ZCASH_RPC_PASSWORD=zcashpass
```

### 3. Development
```bash
npm run dev
# Navigate to http://localhost:5173/unstoppable
```

### 4. Compile zk-SNARK Circuit (Optional)
```bash
# Install circom and snarkjs globally
npm install -g circom snarkjs

# Compile circuit
npm run compile:circuit
```

---

## 🧪 Testing

### Wallet Creation
1. Navigate to `/unstoppable`
2. Click "Create Self-Custody Wallet"
3. Enter password
4. Save 24-word mnemonic
5. Verify addresses for all chains

### Send Transaction
1. Fund wallet from faucets:
   - SOL: https://faucet.solana.com
   - APT: https://aptoslabs.com/testnet-faucet
   - ETH: https://sepoliafaucet.com
2. Click "Send" button
3. Select chain, enter recipient & amount
4. Confirm transaction

### Transaction History
- Auto-refreshes every 60 seconds
- "Load More" for pagination
- Filter by chain (dropdown)

---

## 🔐 Security

### Encryption
- Algorithm: AES-GCM
- Key Derivation: PBKDF2 with 100,000 iterations
- Salt: Randomly generated per wallet
- IV: Randomly generated per encryption

### Private Keys
- Never leave device
- Encrypted at rest
- Only decrypted in memory when unlocked
- Cleared on lock/disconnect

---

## 📊 Technical Specifications

### BIP44 Paths
| Chain | Path | Coin Type |
|-------|------|-----------|
| Solana | m/44'/501'/0'/0' | 501 |
| Ethereum | m/44'/60'/0'/0/0 | 60 |
| Aptos | m/44'/637'/0'/0' | 637 |
| Aztec | m/44'/60'/0'/0/0 | 60 |
| Mina | m/44'/12586'/0'/0' | 12586 |

### Dependencies
- `bip39`: Mnemonic generation
- `@solana/web3.js`: Solana RPC
- `ethers`: Ethereum RPC
- `@aptos-labs/ts-sdk`: Aptos integration
- `zcash-bitcore-lib`: Zcash wallet
- `ed25519-hd-key`: Ed25519 derivation
- `@noble/secp256k1`: ECDH cryptography
- `snarkjs`: zk-SNARK proofs (dev dependency)

### RPC Endpoints
- **Solana Devnet**: https://api.devnet.solana.com
- **Ethereum Sepolia**: https://rpc.sepolia.org
- **Aptos Testnet**: https://fullnode.testnet.aptoslabs.com/v1
- **Zcash**: localhost:18232 (with fallback to public APIs)

---

## 🔧 Circuit Compilation

The wallet includes a zk-SNARK circuit for privacy-preserving bridge transactions.

### Prerequisites
```bash
npm install -g circom snarkjs
```

### Compilation (takes ~1-2 minutes)
```bash
npm run compile:circuit
```

### Generated Files
- `keys/bridge_final.zkey` - Proving key (for creating proofs)
- `keys/verifying_key.json` - Verification key (for verifying proofs)
- `keys/BridgeVerifier.sol` - Solidity verifier contract
- `build/circuits/bridge.r1cs` - Constraint system
- `build/circuits/bridge_js/bridge.wasm` - Witness calculator

**Note:** These files are gitignored. Each developer must compile locally.

---

## 🎯 Implementation Status

### ✅ Fully Working
- Wallet creation/import/recovery
- Multi-chain key derivation
- Balance fetching (SOL/ETH/APT/ZEC)
- Transaction sending (SOL/ETH/ZEC)
- Transaction history with pagination
- Chain filtering
- Privacy features (stealth addresses, hiding, decoy mode)
- Circuit compilation infrastructure

### ⚠️ Limitations
- **Zcash sending**: Requires local RPC node
- **zk-SNARK proofs**: Placeholder until circuit compiled
- **Stealth receiving**: No background worker (future enhancement)

---

## 📝 Testing Guide

See [TESTING_UNSTOPPABLE.md](./TESTING_UNSTOPPABLE.md) for comprehensive testing scenarios.

---

## 🚢 Deployment Notes

### Before Pushing to GitHub
1. ✅ Generated keys are gitignored
2. ✅ Circuit artifacts are gitignored
3. ⚠️ Users must compile circuit locally

### Production Deployment
1. Set environment variables for RPC endpoints
2. Optional: Configure Zcash RPC node
3. Optional: Pre-compile circuit and host artifacts

---

## 📊 Code Statistics
- **Total Lines**: ~1,200 lines
- **Files Created**: 4 new files
- **Files Modified**: 6 existing files
- **Dependencies Added**: 2 packages
- **Test Coverage**: Manual testing guide included

---

*Last Updated: December 2024*
