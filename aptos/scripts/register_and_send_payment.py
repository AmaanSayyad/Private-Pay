#!/usr/bin/env python3
"""
SQUIDL Aptos - Register Meta Address and Send Stealth Payment
Complete workflow demonstration
"""

import sys
import io
import subprocess
import json

if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Import our helper
sys.path.insert(0, 'scripts')
from offchain_helper import generate_keypair, generate_stealth_address

MODULE_ADDRESS = "0x86c46b435a128d6344d42e832ef22066133d39a8a1f8e42b02107b8b246e280c"
ACCOUNT_ADDRESS = "0x86c46b435a128d6344d42e832ef22066133d39a8a1f8e42b02107b8b246e280c"

print("=" * 70)
print("SQUIDL Aptos - Complete Payment Workflow")
print("=" * 70)

# Step 1: Generate keys for recipient
print("\n[Step 1] Generating keys for recipient...")
spend_priv, spend_pub = generate_keypair()
viewing_priv, viewing_pub = generate_keypair()

print(f"Spend Public Key: 0x{spend_pub.hex()}")
print(f"Viewing Public Key: 0x{viewing_pub.hex()}")

# Step 2: Register meta address
print("\n[Step 2] Registering meta address on-chain...")
spend_pub_hex = spend_pub.hex()
viewing_pub_hex = viewing_pub.hex()

# Use hex format for vector<u8> arguments
cmd = [
    "aptos", "move", "run",
    "--function-id", f"{MODULE_ADDRESS}::payment_manager::register_for_payments",
    "--args", f"hex:0x{spend_pub_hex}", f"hex:0x{viewing_pub_hex}",
    "--profile", "testnet",
    "--assume-yes"
]

print(f"Command: {' '.join(cmd)}")
result = subprocess.run(cmd, capture_output=True, text=True)

if result.returncode == 0:
    print("[OK] Meta address registered successfully!")
    try:
        output = json.loads(result.stdout)
        if "Result" in output and "transaction_hash" in output["Result"]:
            tx_hash = output["Result"]["transaction_hash"]
            print(f"Transaction: https://explorer.aptoslabs.com/txn/{tx_hash}?network=testnet")
    except:
        print(result.stdout)
else:
    print(f"[ERROR] Failed to register meta address:")
    print(result.stderr)
    sys.exit(1)

# Step 3: Generate stealth address for payment
print("\n[Step 3] Generating stealth address for payment...")
ephemeral_priv, _ = generate_keypair()
stealth_addr, view_hint, ephemeral_pub = generate_stealth_address(
    spend_pub,
    viewing_pub,
    ephemeral_priv,
    k=0
)

print(f"Stealth Address: 0x{stealth_addr.hex()}")
print(f"View Hint: 0x{view_hint.hex()}")
print(f"Ephemeral Pub Key: 0x{ephemeral_pub.hex()}")

# Step 4: Send stealth payment
print("\n[Step 4] Sending stealth payment...")
print("Note: This requires the stealth address to be registered for AptosCoin")
print("For demonstration, we'll show the command:")

ephemeral_pub_hex = ephemeral_pub.hex()
stealth_addr_hex = stealth_addr.hex()

cmd_send = [
    "aptos", "move", "run",
    "--function-id", f"{MODULE_ADDRESS}::payment_manager::send_private_payment",
    "--type-args", "0x1::aptos_coin::AptosCoin",
    "--args",
    f"address:{ACCOUNT_ADDRESS}",  # recipient (same as sender for demo)
    "u64:0",  # recipient_meta_index
    "u64:1000000",  # amount (0.01 APT)
    "u32:0",  # k
    f"hex:0x{ephemeral_pub_hex}",  # ephemeral_pub_key
    f"address:0x{stealth_addr_hex}",  # stealth_address
    "--profile", "testnet",
    "--assume-yes"
]

print(f"Executing payment command...")
result_send = subprocess.run(cmd_send, capture_output=True, text=True)

if result_send.returncode == 0:
    print("[OK] Stealth payment sent successfully!")
    try:
        output = json.loads(result_send.stdout)
        if "Result" in output and "transaction_hash" in output["Result"]:
            tx_hash = output["Result"]["transaction_hash"]
            print(f"Transaction: https://explorer.aptoslabs.com/txn/{tx_hash}?network=testnet")
    except:
        print(result_send.stdout)
else:
    print(f"[WARNING] Payment may have failed:")
    print(result_send.stderr)
    if "not registered" in result_send.stderr.lower() or "coin store" in result_send.stderr.lower():
        print("\nNote: Stealth addresses need to register their coin store before receiving.")
        print("This is a limitation of Aptos - accounts must be registered before receiving coins.")

# Ask if user wants to send
print("\n" + "=" * 70)
print("Summary:")
print("=" * 70)
print(f"Recipient Address: {ACCOUNT_ADDRESS}")
print(f"Stealth Address: 0x{stealth_addr_hex}")
print(f"Amount: 0.01 APT (1000000 octas)")
print(f"\nView on Explorer:")
print(f"  Account: https://explorer.aptoslabs.com/account/{ACCOUNT_ADDRESS}?network=testnet")
print(f"  Module: https://explorer.aptoslabs.com/account/{MODULE_ADDRESS}?network=testnet")

