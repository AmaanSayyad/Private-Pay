#!/usr/bin/env python3
"""
SQUIDL Aptos - Test Contract Interactions
This script demonstrates how to interact with deployed contracts
"""

import sys
import io
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from offchain_helper import generate_keypair, generate_stealth_address

# Module address from deployment
MODULE_ADDRESS = "0x86c46b435a128d6344d42e832ef22066133d39a8a1f8e42b02107b8b246e280c"

print("=" * 60)
print("SQUIDL Aptos - Contract Interaction Test")
print("=" * 60)

print(f"\nModule Address: {MODULE_ADDRESS}")
print(f"Explorer: https://explorer.aptoslabs.com/account/{MODULE_ADDRESS}?network=testnet")

print("\n" + "=" * 60)
print("Available Move Functions:")
print("=" * 60)

print("""
1. stealth_address::initialize(account: &signer)
   - Initialize payment registry for a user

2. stealth_address::register_meta_address(
     account: &signer,
     spend_pub_key: vector<u8>,
     viewing_pub_key: vector<u8>
   )
   - Register a meta address for receiving payments

3. payment_manager::register_for_payments(
     account: &signer,
     spend_pub_key: vector<u8>,
     viewing_pub_key: vector<u8>
   )
   - High-level function to register for payments

4. payment_manager::send_private_payment<CoinType>(
     sender: &signer,
     recipient: address,
     recipient_meta_index: u64,
     amount: u64,
     k: u32,
     ephemeral_pub_key: vector<u8>,
     stealth_address: address
   )
   - Send a private payment to a stealth address

5. stealth_address::get_meta_address_count(owner: address): u64
   - Get number of meta addresses for a user
""")

print("\n" + "=" * 60)
print("Example: Generate Stealth Address for Payment")
print("=" * 60)

# Generate keys
spend_priv, spend_pub = generate_keypair()
viewing_priv, viewing_pub = generate_keypair()
ephemeral_priv, _ = generate_keypair()

print(f"\nSpend Public Key: 0x{spend_pub.hex()}")
print(f"Viewing Public Key: 0x{viewing_pub.hex()}")

# Generate stealth address
stealth_addr, view_hint, ephemeral_pub = generate_stealth_address(
    spend_pub,
    viewing_pub,
    ephemeral_priv,
    k=0
)

print(f"\nGenerated Stealth Address: 0x{stealth_addr.hex()}")
print(f"View Hint: 0x{view_hint.hex()}")
print(f"Ephemeral Pub Key: 0x{ephemeral_pub.hex()}")

print("\n" + "=" * 60)
print("Next Steps:")
print("=" * 60)
spend_pub_hex = spend_pub.hex()
viewing_pub_hex = viewing_pub.hex()

print(f"""
1. Use Aptos CLI to call Move functions:
   
   aptos move run \\
     --function-id {MODULE_ADDRESS}::payment_manager::register_for_payments \\
     --args vector:0x{spend_pub_hex} vector:0x{viewing_pub_hex} \\
     --profile testnet

2. Or use Aptos SDK (TypeScript/Python) to interact programmatically

3. View on Explorer:
   https://explorer.aptoslabs.com/account/{MODULE_ADDRESS}?network=testnet
""")

