# 🦑 SQUIDL Aptos - Stealth Payment Contracts

Completely private (stealth) payment contracts on the Aptos blockchain. Payment source and destination cannot be identified on-chain.

## 🔐 Features

- ✅ **Stealth Address Generation**: Unique stealth address for each payment
- ✅ **Private Key Management**: Private keys are managed securely
- ✅ **Token Transfers**: Token transfers using Aptos Coin standard
- ✅ **Meta Address System**: Meta address management for users
- ✅ **ECDH Cryptography**: Stealth address derivation using shared secret
- ✅ **View Hint Optimization**: 256x faster address scanning

## 📁 Project Structure

```
squidl-aptos/
├── Move.toml                    # Move project configuration
├── sources/                     # Move modules
│   ├── stealth_address.move     # Core stealth address logic
│   ├── stealth_payment.move     # Token transfer functions
│   └── payment_manager.move     # High-level payment interface
├── tests/                       # Test files
│   └── stealth_address_test.move
├── scripts/                     # Deployment and helper scripts
│   ├── deploy.sh                # Deployment script
│   └── offchain_helper.py       # Off-chain stealth address helper
├── README.md                     # This file
├── USAGE.md                      # Detailed usage guide
└── EXPLANATION.md                # Project explanation
```

## 🚀 Installation

### Requirements

- Aptos CLI (v1.0+)
- Python 3.8+ (for off-chain helper)
- Move compiler

### Steps

1. **Install Aptos CLI:**
```bash
curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
```

2. **Clone the project:**
```bash
cd squidl-aptos
```

3. **Set your address in Move.toml:**
```toml
[addresses]
squidl_aptos = "0xYOUR_ADDRESS"
```

4. **Run tests:**
```bash
aptos move test --named-addresses squidl_aptos=0xYOUR_ADDRESS
```

5. **Deploy to testnet:**
```bash
aptos move publish \
    --named-addresses squidl_aptos=0xYOUR_ADDRESS \
    --profile testnet
```

## 📖 Usage

### Quick Start

1. **Register Meta Address:**
```move
payment_manager::register_for_payments(
    account,
    spend_pub_key,    // 33 bytes, compressed secp256k1
    viewing_pub_key,  // 33 bytes, compressed secp256k1
);
```

2. **Create Stealth Address (Off-chain):**
```python
from scripts.offchain_helper import generate_stealth_address

stealth_addr, view_hint, ephemeral_pub = generate_stealth_address(
    spend_pub_key,
    viewing_pub_key,
    ephemeral_priv_key,
    k=0
)
```

3. **Send Payment:**
```move
payment_manager::send_private_payment<AptosCoin>(
    sender,
    recipient_address,
    recipient_meta_index,
    amount,
    k,
    ephemeral_pub_key,
    stealth_address,  // Computed off-chain
);
```

For detailed usage, see the [USAGE.md](./USAGE.md) file.

## 🔒 Security

⚠️ **IMPORTANT NOTES:**

1. **Off-chain Computation**: Stealth address calculations must be done off-chain. Direct address derivation is not possible in Move.

2. **ECDH Implementation**: Proper secp256k1 ECDH cryptography should be used in production. Current code is a simplified example.

3. **Private Keys**: Never share your spend and viewing private keys.

4. **Account Registration**: In Aptos, an address must register its coin store before it can receive coins.

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│         Off-chain Computation           │
│  (ECDH, Stealth Address Generation)     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│      On-chain Move Contracts            │
│  ┌──────────────────────────────────┐   │
│  │  stealth_address.move            │   │
│  │  - Meta address registry         │   │
│  │  - Stealth address validation    │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  stealth_payment.move            │   │
│  │  - Token transfers               │   │
│  │  - Payment tracking              │   │
│  └──────────────────────────────────┘   │
│  ┌──────────────────────────────────┐   │
│  │  payment_manager.move            │   │
│  │  - High-level interface          │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## 📚 References

- [Aptos Move Documentation](https://aptos.dev/move/move-on-aptos/)
- [Stealth Addresses (ERC-5564)](https://eips.ethereum.org/EIPS/eip-5564)
- [ECDH Cryptography](https://en.wikipedia.org/wiki/Elliptic-curve_Diffie%E2%80%93Hellman)

## 🤝 Contributing

This project is an Aptos adaptation of the SQUIDL project on Ethereum. We welcome your contributions!

## 📄 License

This project was developed for hackathon purposes. Security audit is required for production use.
