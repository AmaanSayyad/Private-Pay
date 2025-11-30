# 🦑 SQUIDL Aptos - Usage Guide

## 📋 Overview

These contracts enable completely private (stealth) payments on the Aptos blockchain. Payment source and destination cannot be identified on-chain.

## 🔑 Core Concepts

### Meta Address
- Each user has one or more **meta addresses**
- A meta address contains two public keys:
  - **Spend Public Key**: Used to withdraw funds from stealth addresses
  - **Viewing Public Key**: Used to detect stealth addresses

### Stealth Address
- A unique **stealth address** is created for each payment
- This address cannot be linked between sender and recipient
- Only the person with the viewing key can detect that the stealth address belongs to them

## 🚀 Step-by-Step Usage

### 1. Meta Address Registration

First, you need to register a meta address to receive payments:

```move
// Generate spend and viewing key pairs off-chain
let (spend_priv_key, spend_pub_key) = generate_keypair();
let (viewing_priv_key, viewing_pub_key) = generate_keypair();

// Register meta address on-chain
payment_manager::register_for_payments(
    account,
    spend_pub_key,
    viewing_pub_key,
);
```

### 2. Stealth Address Generation (Off-chain)

To create a stealth address, you need to use ECDH cryptography off-chain:

```python
# Python example (off-chain)
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend
import hashlib

def generate_stealth_address(spend_pub, viewing_pub, ephemeral_priv, k=0):
    # 1. Compute ECDH shared secret
    shared_secret = ephemeral_priv * viewing_pub
    
    # 2. Compute tweak: hash(shared_secret || k)
    tweak = hashlib.sha256(shared_secret + k.to_bytes(4, 'big')).digest()
    
    # 3. Stealth public key: spend_pub + tweak * G
    stealth_pub = spend_pub + (tweak * G)
    
    # 4. Derive address
    stealth_address = derive_address(stealth_pub)
    
    # 5. View hint (first byte)
    view_hint = shared_secret[0:1]
    
    return stealth_address, view_hint
```

### 3. Sending Payment

To send a payment:

```move
// Compute stealth address off-chain
let stealth_addr = compute_stealth_address_off_chain(...);

// Send payment on-chain
payment_manager::send_private_payment<AptosCoin>(
    sender,
    recipient_address,
    recipient_meta_index,
    amount,
    k,
    ephemeral_pub_key,
    stealth_addr,  // Computed off-chain
);
```

### 4. Payment Detection (Off-chain)

The recipient can detect payments sent to them using the viewing key:

```python
# Off-chain scanning
def scan_for_payments(viewing_priv_key, spend_pub_key):
    # Scan all ephemeral public keys on the blockchain
    for ephemeral_pub in blockchain.scan_ephemeral_keys():
        # Compute shared secret
        shared_secret = viewing_priv_key * ephemeral_pub
        
        # View hint check (fast filtering)
        if shared_secret[0] != view_hint:
            continue  # This payment is not for you
        
        # Compute stealth address
        stealth_addr = compute_stealth_address(...)
        
        # Check if this address has balance
        if has_balance(stealth_addr):
            return stealth_addr
```

### 5. Withdrawing Funds

To withdraw funds from a stealth address:

```move
// Compute stealth address off-chain
let stealth_addr = compute_stealth_address_off_chain(...);

// Withdraw funds on-chain
payment_manager::withdraw_from_stealth<AptosCoin>(
    account,
    meta_index,
    ephemeral_pub_key,
    view_hint,
    k,
    stealth_addr,  // Computed off-chain
    amount,
);
```

## 🔐 Security Notes

1. **Private Keys**: Never share your spend and viewing private keys
2. **Off-chain Computation**: Stealth address calculations must be done off-chain
3. **Ephemeral Keys**: Use a new ephemeral key for each payment
4. **View Hint**: View hint speeds up scanning by 256x without reducing privacy

## 📝 Important Notes

- **Address Computation**: Direct address derivation is not possible in Move. Stealth addresses must be computed off-chain.
- **Account Registration**: In Aptos, an address must register its coin store before it can receive coins.
- **ECDH Implementation**: Proper ECDH cryptography should be used in production (current code is a simplified example).

## 🛠️ Off-chain Helper Script

It is recommended to create a JavaScript/Python helper script for stealth address calculations:

```javascript
// Example: stealth-address-helper.js
const { generateStealthAddress, scanForPayments } = require('./stealth-crypto');

// Generate stealth address
const stealthAddr = generateStealthAddress(
    recipientSpendPub,
    recipientViewingPub,
    ephemeralPriv,
    k
);

// Scan for payments
const payments = scanForPayments(
    viewingPrivKey,
    spendPubKey
);
```

## 📚 References

- [Aptos Move Documentation](https://aptos.dev/move/move-on-aptos/)
- [Stealth Addresses (ERC-5564)](https://eips.ethereum.org/EIPS/eip-5564)
- [ECDH Cryptography](https://en.wikipedia.org/wiki/Elliptic-curve_Diffie%E2%80%93Hellman)





