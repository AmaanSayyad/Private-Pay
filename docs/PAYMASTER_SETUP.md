# Paymaster Setup Guide

## What is a Paymaster?

A **paymaster** is a wallet that pays for gas fees on behalf of users. In PrivatePay, the paymaster wallet is used to pay for gas fees when users register their meta addresses on the Sapphire network. This allows users to register without needing ROSE tokens in their wallet.

---

## How to Get VITE_PAYMASTER_PK

### Step 1: Generate a Private Key

You can generate a private key using several methods:

#### Option A: Using Node.js/ethers.js

```javascript
const { ethers } = require("ethers");

// Generate a new random wallet
const wallet = ethers.Wallet.createRandom();

console.log("Private Key:", wallet.privateKey);
console.log("Address:", wallet.address);
```

#### Option B: Using Hardhat

```bash
cd hardhat
npx hardhat run scripts/generate-seed.ts
```

#### Option C: Using Online Tools (for testnet only)

⚠️ **Warning**: Only use for testnet! Never use online tools for mainnet private keys.

1. Visit: https://vanity-eth.tk/ (or similar tool)
2. Generate a random private key
3. Copy the private key (64-character hex string starting with `0x`)

---

### Step 2: Fund the Paymaster Wallet

The paymaster wallet needs ROSE tokens to pay for gas fees.

#### For Sapphire Testnet:

1. **Get the wallet address** from the private key:
   ```javascript
   const { ethers } = require("ethers");
   const wallet = new ethers.Wallet("YOUR_PRIVATE_KEY");
   console.log("Address:", wallet.address);
   ```

2. **Request testnet ROSE tokens**:
   - Visit: https://faucet.sapphire.oasis.dev/
   - Enter your paymaster wallet address
   - Request testnet tokens

3. **Verify balance**:
   - Check on Sapphire Testnet Explorer: https://testnet.explorer.sapphire.oasis.io
   - Search for your wallet address

#### For Sapphire Mainnet:

1. Transfer ROSE tokens from your main wallet to the paymaster address
2. Ensure sufficient balance for expected gas costs

---

### Step 3: Set Environment Variable

#### Local Development (.env file):

```bash
# Add to your .env file
VITE_PAYMASTER_PK=0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

**Important**: 
- The private key must be a 64-character hex string
- It must start with `0x`
- Never commit this to git (it's already in `.gitignore`)

#### Vercel Deployment:

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `VITE_PAYMASTER_PK`
   - **Value**: Your private key (starting with `0x`)
   - **Environment**: Production, Preview, Development (as needed)
4. Click **Save**
5. Redeploy your application

---

## Security Best Practices

### ⚠️ Critical Security Notes:

1. **Never share your private key** - Anyone with your private key can control the wallet
2. **Use separate wallets** - Don't use your main wallet as the paymaster
3. **Monitor balance** - Regularly check the paymaster wallet balance
4. **Set limits** - Consider implementing spending limits in production
5. **Testnet vs Mainnet** - Use different wallets for testnet and mainnet

### Recommended Setup:

- **Testnet**: Use a dedicated testnet wallet with limited funds
- **Mainnet**: Use a hardware wallet or secure key management system
- **Monitoring**: Set up alerts for low balance or unusual activity

---

## Verification

After setting up, verify the paymaster is working:

1. **Check the wallet is valid**:
   ```javascript
   const { ethers } = require("ethers");
   const wallet = new ethers.Wallet(process.env.VITE_PAYMASTER_PK);
   console.log("Paymaster Address:", wallet.address);
   ```

2. **Check balance**:
   - Visit Sapphire Explorer
   - Search for your paymaster address
   - Verify it has ROSE tokens

3. **Test in application**:
   - Try registering a meta address
   - The transaction should be paid by the paymaster
   - Check the transaction on the explorer

---

## Troubleshooting

### Error: "Paymaster private key not configured"

- Ensure `VITE_PAYMASTER_PK` is set in your `.env` file
- Restart your dev server after adding the variable
- Check the variable name is exactly `VITE_PAYMASTER_PK`

### Error: "Invalid paymaster private key format"

- Ensure the private key starts with `0x`
- Check it's exactly 66 characters (0x + 64 hex characters)
- Verify there are no extra spaces or newlines

### Error: "Insufficient funds"

- Check the paymaster wallet has ROSE tokens
- For testnet, request tokens from the faucet
- For mainnet, transfer ROSE tokens to the paymaster address

### Transaction Fails

- Verify the paymaster wallet has sufficient balance
- Check network connectivity to Sapphire
- Ensure the contract address is correct

---

## Example Private Key Format

```
✅ Valid: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
❌ Invalid: 1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef (missing 0x)
❌ Invalid: 0x1234567890abcdef (too short)
❌ Invalid: [REDACTED] (placeholder value)
```

---

## Additional Resources

- [Sapphire Network Documentation](https://docs.oasis.io/dapp/sapphire/)
- [Sapphire Testnet Faucet](https://faucet.sapphire.oasis.dev/)
- [Sapphire Explorer](https://testnet.explorer.sapphire.oasis.io)
- [Ethers.js Wallet Documentation](https://docs.ethers.org/v6/api/wallet/)

---

## Quick Reference

```bash
# Generate private key (Node.js)
node -e "const {ethers} = require('ethers'); console.log(ethers.Wallet.createRandom().privateKey)"

# Check wallet address from private key
node -e "const {ethers} = require('ethers'); const w = new ethers.Wallet('YOUR_PRIVATE_KEY'); console.log(w.address)"

# Set in .env
echo "VITE_PAYMASTER_PK=0x..." >> .env
```

