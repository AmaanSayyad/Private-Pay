# Axelar ITS Stealth Payment Updates

**Date:** December 16, 2025  
**Status:** Implemented & Tested

## Overview

This update adds support for cross-chain stealth payments using Axelar's Interchain Token Service (ITS) for custom tokens like TUSDC.

## Key Changes

### 1. EVM Stealth Address Generator

**File:** `src/lib/evm/stealthAddress.js` (NEW)

Created a separate EVM-specific stealth address generator that uses:

- **keccak256** hash function (EVM standard)
- **20-byte addresses** (EVM format)

This differs from the Aptos generator which uses SHA3-256 and 16-byte addresses.

```javascript
// EVM address derivation
const pubKeyWithoutPrefix = stealthPubKeyBytes.slice(1); // Skip 0x04 prefix
const addressHash = keccak_256(pubKeyWithoutPrefix);
const addressBytes = addressHash.slice(-20); // Last 20 bytes
```

### 2. ITS Token Support

**File:** `src/hooks/useAxelarPayment.js`

Added support for ITS tokens (tokens deployed via Axelar Interchain Token Service):

```javascript
const ITS_TOKENS = {
  TUSDC: {
    symbol: "TUSDC",
    name: "Test USDC",
    decimals: 6,
    address: "0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B",
    tokenManagerAddress: "0x1e2f2E68ea65212Ec6F3D91f39E6B644fE41e29B",
    deployedChains: ["ethereum-sepolia", "base-sepolia"],
  },
};
```

**ITS Contract:** `0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C` (same on all chains)

### 3. Direct ITS Transfers for Stealth

For ITS tokens, we bypass the bridge contract and call ITS directly:

```javascript
tx = await itsContract.interchainTransfer(
  tokenId,
  destinationChain,
  destinationAddressBytes, // 32-byte padded stealth address
  amountInWei,
  "0x", // empty metadata
  gasFee,
  { value: gasFee }
);
```

**Why?** The bridge contract uses `callContractWithToken` which only works with Gateway-registered tokens. ITS tokens require calling `ITS.interchainTransfer()` directly.

### 4. Auto-Lookup Stealth Keys

**File:** `src/pages/CrossChainPaymentPage.jsx`

Added automatic stealth key lookup when user enters recipient address:

1. User enters recipient's regular address (e.g., `0xaa44...`)
2. System calls `bridge.getMetaAddress(recipientAddress)`
3. If keys found → Stealth mode enabled
4. If not found → Direct mode (no privacy)

```javascript
const [spendPubKey, viewingPubKey] = await bridgeContract.getMetaAddress(
  recipientAddress
);
```

### 5. Registration UI

Added UI for users to register their stealth keys:

- **Generate Keys** button - Creates spend/viewing key pairs
- **Modal** - Displays keys with warning to save private keys
- **Register** button - Calls `bridge.registerMetaAddress()`

Visual indicators:

- 🔒 Green chip: "Stealth Mode - Private Transfer"
- ⚠️ Yellow chip: "Direct Mode - Recipient not registered"

## Deployment Status

### Contracts

| Network          | Bridge Address                               | Status      |
| ---------------- | -------------------------------------------- | ----------- |
| Ethereum Sepolia | `0x1764681c26D04f0E9EBb305368cfda808A9F6f8f` | ✅ Deployed |
| Base Sepolia     | `0x1764681c26D04f0E9EBb305368cfda808A9F6f8f` | ✅ Deployed |
| Polygon Amoy     | `0x1764681c26D04f0E9EBb305368cfda808A9F6f8f` | ✅ Deployed |

### Trusted Remotes Configured

- Ethereum Sepolia ↔ Base Sepolia ✅
- Ethereum Sepolia ↔ Polygon Amoy ✅

### TUSDC Token

| Network    | Address                                      | Token Manager                                |
| ---------- | -------------------------------------------- | -------------------------------------------- |
| All Chains | `0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B` | `0x1e2f2E68ea65212Ec6F3D91f39E6B644fE41e29B` |

## Flow Diagram

```
User enters recipient address (0xaa44...)
           │
           ▼
    ┌──────────────────┐
    │ Lookup meta keys │
    │ from bridge      │
    └──────────────────┘
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
Keys Found    No Keys
    │             │
    ▼             ▼
STEALTH       DIRECT
MODE          MODE
    │             │
    ▼             ▼
Generate      Send to
unique        regular
stealth       address
address
    │
    ▼
Call ITS.interchainTransfer()
with stealth address
    │
    ▼
Tokens arrive at stealth address
on destination chain
```

## Testing

### Verified Transactions

1. **Direct Transfer (no stealth):**

   - TX: `0xa5f891ddee8b1d05a0c45bfc3da1a68796fe718bb70aefdfa14c4990802772c6`
   - Result: ✅ Success

2. **Stealth Transfer:**
   - TX: `0x760d58b3a29977c0d836d086e2059c35106055662073f714c82be0ac608119ca`
   - Stealth Address: `0x992613d87aefd67eaf5079ccba0c3cfec2e27b06`
   - Result: ✅ Processing on Axelarscan

## Files Modified

| File                                     | Changes                             |
| ---------------------------------------- | ----------------------------------- |
| `src/lib/evm/stealthAddress.js`          | NEW - EVM stealth address generator |
| `src/hooks/useAxelarPayment.js`          | ITS support, EVM stealth import     |
| `src/pages/CrossChainPaymentPage.jsx`    | Registration UI, auto-lookup        |
| `hardhat/scripts/setup-base-sepolia.js`  | Bridge deployment script            |
| `hardhat/deployments/axelar-bridge.json` | Deployment addresses                |

## Environment Variables

```env
VITE_AXELAR_BRIDGE_ADDRESS=0x1764681c26D04f0E9EBb305368cfda808A9F6f8f
VITE_NETWORK=testnet
```

## Future Improvements

1. **Claim UI** - Add interface for recipients to scan and claim stealth payments
2. **More ITS Tokens** - Add support for additional ITS-deployed tokens
3. **Mainnet Deployment** - Deploy to mainnet chains
4. **Gas Optimization** - Optimize gas usage for stealth transfers
