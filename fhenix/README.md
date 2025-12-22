# Fhenix Integration for Private-Pay

This directory contains the Fhenix blockchain integration for Private-Pay, enabling fully homomorphic encryption (FHE) for confidential payments on Arbitrum Sepolia.

## Architecture

The integration follows the `zec2eth` repository pattern, adapted for Private-Pay:

```
Frontend (React)
  ↓
cofhejs/web (FHE Client)
  ↓
FHPAY.sol (FHERC20 Token)
  ↓
Arbitrum Sepolia Network
  ↓
CoFHE Co-Processor (FHE Operations)
```

## Directory Structure

```
fhenix/
├── contracts/          # Solidity smart contracts
│   ├── FHERC20.sol    # Base FHE token contract
│   └── FHPAY.sol      # Private-Pay confidential token
├── deploy/            # Hardhat deployment scripts
│   └── deployFHPAY.ts
├── hardhat.config.ts  # Hardhat configuration
├── package.json       # Dependencies
└── README.md          # This file
```

## Smart Contracts

### FHERC20.sol

Base contract for FHE-enabled ERC20 tokens. Provides:
- Encrypted balances (`euint64`)
- Confidential transfers (`confidentialTransfer`)
- Access control lists (ACL) for decryption permissions
- Indicated balances (public indicators)

### FHPAY.sol

Private-Pay's confidential payment token, inheriting from `FHERC20`:
- **Name:** Confidential Pay Token
- **Symbol:** FHPAY
- **Decimals:** 6
- **Features:**
  - Confidential minting/burning (controller-only)
  - Owner-controlled dev minting
  - Full FHERC20 functionality

**Deployed Address (Arbitrum Sepolia):**
```
0xf7554dBFdf4633bB4b2c1E708945bB83c9071C12
```

## Deployment

### Prerequisites

1. Node.js 18+ and npm/yarn
2. `.env` file in project root with:
   ```bash
   ARBITRUM_TREASURY_PRIVATE_KEY=your_private_key_here
   ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
   ARBISCAN_API_KEY=your_api_key (optional, for verification)
   ```

3. Funded wallet on Arbitrum Sepolia (for gas fees)

### Deploy FHPAY Contract

```bash
cd fhenix
npm install
npx hardhat deploy --network arb-sepolia --tags FHPAY
```

The deployment will:
1. Compile contracts
2. Deploy FHPAY to Arbitrum Sepolia
3. Save deployment artifacts to `deployments/arb-sepolia/`
4. Attempt verification on Arbiscan (optional)

## Frontend Integration

### Files

- `src/lib/fhenixFhe.ts` - FHE client utilities (encryption, initialization)
- `src/lib/fhenixContracts.ts` - Contract interaction helpers
- `src/hooks/useFhenix.ts` - React hook for FHE client lifecycle
- `src/pages/FhenixPayments.jsx` - UI for confidential payments
- `src/abi/FHPAY.json` - Contract ABI

### Usage Example

```typescript
import { useFhenix } from "@/hooks/useFhenix";
import { confidentialTransfer } from "@/lib/fhenixContracts";

function PaymentComponent() {
  const { isInitialized, encrypt } = useFhenix();
  
  const handleTransfer = async () => {
    // Encrypt amount
    const encrypted = await encrypt(100.5);
    
    // Send confidential transfer
    const txHash = await confidentialTransfer(
      "0x...", // recipient
      encrypted
    );
  };
}
```

## How It Works

1. **Client-Side Encryption:**
   - User enters payment amount
   - `cofhejs` encrypts the amount using FHE
   - Encrypted value is formatted as `InEuint64` struct

2. **On-Chain Transfer:**
   - Encrypted amount is sent to `FHPAY.confidentialTransfer()`
   - Contract performs FHE operations on encrypted balances
   - Only encrypted values are stored on-chain

3. **Decryption:**
   - Recipient can decrypt their balance using `cofhejs.unseal()`
   - Requires proper ACL permissions set via `FHE.allow()`

## Network Configuration

- **Network:** Arbitrum Sepolia
- **Chain ID:** 421614
- **RPC URL:** `https://sepolia-rollup.arbitrum.io/rpc`
- **Explorer:** `https://sepolia.arbiscan.io`

## Testing

Manual E2E testing:
1. Connect MetaMask to Arbitrum Sepolia
2. Navigate to `/fhenix` in the app
3. Ensure FHE client initializes (check status)
4. Enter recipient address and amount
5. Send confidential transfer
6. Verify transaction on Arbiscan

## Troubleshooting

### "FHE client not initialized"
- Ensure MetaMask is connected
- Check browser console for CoFHE errors
- Verify network is Arbitrum Sepolia

### "Insufficient funds"
- Fund your wallet with Arbitrum Sepolia ETH
- Get testnet ETH from: https://faucet.quicknode.com/arbitrum/sepolia

### "Transaction simulation failed"
- Check recipient address format (must be 0x...)
- Verify amount is positive
- Ensure contract is deployed and accessible

## References

- [Fhenix Documentation](https://docs.fhenix.io)
- [CoFHE Contracts](https://github.com/FhenixProtocol/cofhe-contracts)
- [zec2eth Reference](https://github.com/zecmumtaZ/zec2eth)

## License

MIT

