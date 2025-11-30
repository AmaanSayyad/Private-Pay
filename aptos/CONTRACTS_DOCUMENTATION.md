# 📜 Aptos Smart Contracts - Documentation

## Overview

This directory contains the Move smart contracts for PrivatePay's stealth payment system on Aptos blockchain.

---

## 📁 Contract Files

### 1. `stealth_address.move`
**Core stealth address protocol implementation**

#### Structures:
- **`MetaAddress`**: Contains spend and viewing public keys
  ```move
  struct MetaAddress {
      spend_pub_key: vector<u8>,    // 33 bytes
      viewing_pub_key: vector<u8>,  // 33 bytes
      created_at: u64
  }
  ```

- **`PaymentRegistry`**: Stores user's meta addresses
  ```move
  struct PaymentRegistry has key {
      meta_addresses: vector<MetaAddress>,
      announcement_events: EventHandle<PaymentAnnouncementEvent>
  }
  ```

#### Key Functions:
- `initialize(account)` - Initialize payment registry
- `register_meta_address(account, spend_pub, viewing_pub)` - Register new meta address
- `get_meta_address(address, index)` - Retrieve meta address
- `announce_payment(...)` - Emit payment announcement event
- `is_registered(address)` - Check if address has meta addresses

---

### 2. `payment_manager.move`
**High-level interface for sending/receiving payments**

#### Key Functions:
- `register_for_payments(account, spend_pub, viewing_pub)` 
  - Register an account to receive stealth payments
  - Creates meta address with cryptographic keys

- `send_private_payment<CoinType>(...)`
  - Send payment to a stealth address
  - **Parameters:**
    - `sender` - Account sending payment
    - `recipient_address` - Original recipient address (for events)
    - `recipient_meta_index` - Index of recipient's meta address
    - `amount` - Amount in coin's base units (octas for APT)
    - `k` - Derivation index
    - `ephemeral_pub_key` - 33-byte ephemeral public key
    - `stealth_address` - Pre-computed stealth address

- `send_private_payment_apt(...)`
  - Convenience function for sending APT

- `is_registered(address)` - Check registration status
- `get_meta_address_keys(address, index)` - Get public keys

---

### 3. `crypto_utils.move`
**Cryptography helper utilities**

#### Functions:
- `validate_compressed_pubkey(pubkey)` 
  - Validates secp256k1 compressed public key
  - Must be 33 bytes, starting with 0x02 or 0x03

- `compute_view_hint(viewing_pub, ephemeral_pub)`
  - Computes view hint for efficient scanning
  - Returns first 32 bits of SHA3-256 hash

- `bytes_to_hex(bytes)` - Convert bytes to hex (debugging)

---

## 🔄 Payment Flow

### Step 1: Recipient Registration
```move
// Recipient generates keys off-chain and registers
payment_manager::register_for_payments(
    recipient_account,
    spend_pub_key,     // 33 bytes
    viewing_pub_key    // 33 bytes
);
```

### Step 2: Stealth Address Generation (Off-Chain)
```python
# Sender computes stealth address using ECDH
stealth_address = generate_stealth_address(
    recipient_spend_pub,
    recipient_viewing_pub,
    ephemeral_private_key,
    k=0
)
```

### Step 3: Send Payment
```move
// Sender sends to computed stealth address
payment_manager::send_private_payment<AptosCoin>(
    sender_account,
    recipient_address,
    0,  // meta_index
    1000000000,  // 10 APT (in octas)
    0,  // k
    ephemeral_pub_key,
    stealth_address
);
```

### Step 4: Recipient Detection (Off-Chain)
```python
# Recipient scans blockchain for payments
for announcement in payment_announcements:
    if is_payment_for_me(announcement, my_viewing_key):
        compute_stealth_private_key(...)
        withdraw_funds(...)
```

---

## 🔐 Cryptographic Design

### Key Generation
```
Recipient generates:
├─ Spend Key Pair (spendPriv, spendPub)
└─ Viewing Key Pair (viewingPriv, viewingPub)

Meta Address = (spendPub, viewingPub)
```

### Stealth Address Derivation
```
1. Sender generates ephemeral key pair (ephemeralPriv, ephemeralPub)
2. Compute shared secret: ECDH(ephemeralPriv, viewingPub)
3. Compute tweak: SHA256(sharedSecret || k)
4. Compute stealth public key: stealthPub = spendPub + (tweak * G)
5. Derive Aptos address: SHA3_256(stealthPub)[0:16]
```

### Payment Detection
```
1. Recipient scans PaymentAnnouncementEvent
2. Compute shared secret: ECDH(viewingPriv, ephemeralPub)
3. Check if view_hint matches (quick filter)
4. Compute expected stealth address
5. Check if funds exist at that address
```

### Fund Withdrawal
```
1. Compute stealth private key: stealthPriv = spendPriv + tweak
2. Use stealthPriv to sign withdrawal transaction
3. Transfer funds to main wallet
```

---

## ⚙️ Deployment

### 1. Configure Address
Edit `Move.toml`:
```toml
[addresses]
squidl_aptos = "YOUR_DEPLOYER_ADDRESS"
```

### 2. Compile
```bash
aptos move compile \
    --named-addresses squidl_aptos=YOUR_ADDRESS
```

### 3. Test
```bash
aptos move test \
    --named-addresses squidl_aptos=YOUR_ADDRESS
```

### 4. Deploy to Testnet
```bash
aptos move publish \
    --named-addresses squidl_aptos=YOUR_ADDRESS \
    --profile testnet \
    --assume-yes
```

### 5. Deploy to Mainnet
```bash
aptos move publish \
    --named-addresses squidl_aptos=YOUR_ADDRESS \
    --profile mainnet \
    --assume-yes
```

---

## 🧪 Testing

### Run All Tests
```bash
aptos move test
```

### Run Specific Test
```bash
aptos move test --filter test_register_for_payments
```

### With Coverage
```bash
aptos move test --coverage
```

---

## 📊 Events

### PaymentAnnouncementEvent
Emitted when a stealth payment is sent:

```move
struct PaymentAnnouncementEvent {
    recipient_address: address,      // Original recipient
    meta_address_index: u64,         // Index of meta address used
    ephemeral_pub_key: vector<u8>,   // Ephemeral public key (33 bytes)
    stealth_address: address,        // Where funds were sent
    view_hint: u32,                  // Quick filter for recipients
    k: u32,                          // Derivation index
    amount: u64,                     // Amount sent
    timestamp: u64                   // When payment was made
}
```

### Querying Events
```typescript
// Using Aptos SDK
const events = await aptos.getAccountEvents({
  accountAddress: recipientAddress,
  eventType: `${MODULE_ADDRESS}::stealth_address::PaymentAnnouncementEvent`
});
```

---

## 🔒 Security Considerations

### ⚠️ Important Notes

1. **Off-Chain Computation Required**
   - Stealth address derivation MUST be done off-chain
   - Move doesn't have secp256k1 ECDH built-in
   - Use @noble/secp256k1 or similar libraries

2. **Account Registration**
   - Stealth addresses must register coin stores before receiving
   - Consider pre-registering or using account creation transactions

3. **Private Key Security**
   - Never store private keys on-chain
   - Spend and viewing keys must remain secret
   - Use secure key management practices

4. **View Hint Optimization**
   - Current implementation uses placeholder
   - Production should use proper SHA3-256 hash
   - Enables 256x faster payment scanning

5. **Gas Costs**
   - Payment announcements emit events (small gas cost)
   - Consider batching multiple payments
   - Optimize for high-volume use cases

6. **Privacy Considerations**
   - Amount is visible on-chain (in transaction)
   - Consider using confidential transactions in future
   - Metadata in events is minimal for privacy

---

## 🔄 Upgrade Path

### Version 1.0 (Current)
- ✅ Basic stealth address protocol
- ✅ Payment announcements
- ✅ Event-based detection

### Version 1.1 (Planned)
- 🔜 Proper view hint computation
- 🔜 Multi-coin support
- 🔜 Batch payment support

### Version 2.0 (Future)
- 🔮 Confidential amounts
- 🔮 Ring signatures
- 🔮 Zero-knowledge proofs

---

## 📚 References

- [Aptos Move Documentation](https://aptos.dev/move/move-on-aptos/)
- [BIP-0352: Silent Payments](https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki)
- [EIP-5564: Stealth Addresses](https://eips.ethereum.org/EIPS/eip-5564)
- [ECDH on secp256k1](https://en.wikipedia.org/wiki/Elliptic-curve_Diffie%E2%80%93Hellman)

---

## 🐛 Troubleshooting

### Common Issues

1. **"Module not found"**
   ```bash
   # Ensure address is correct in Move.toml
   # Re-compile and deploy
   aptos move publish --named-addresses squidl_aptos=YOUR_ADDRESS
   ```

2. **"Public key validation failed"**
   ```bash
   # Ensure keys are 33 bytes compressed secp256k1
   # Format: 0x02/0x03 + 32 bytes
   ```

3. **"Coin store not found"**
   ```bash
   # Stealth address needs to register coin store
   # Use account creation transaction first
   ```

4. **"Event not found"**
   ```bash
   # Check recipient has PaymentRegistry initialized
   # Verify event query uses correct module address
   ```

---

## 📞 Support

For issues or questions:
- GitHub Issues: [github.com/your-repo/issues](https://github.com)
- Documentation: See USAGE.md for detailed examples
- Frontend Integration: See squidl-frontend/src/lib/aptos.js

---

**Status**: ✅ Ready for Testnet Deployment
**Audit Status**: ⚠️ Not audited - Use at your own risk
**License**: MIT (Hackathon Project)

