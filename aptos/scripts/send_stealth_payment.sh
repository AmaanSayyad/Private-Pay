#!/bin/bash
# SQUIDL Aptos - Send Stealth Payment Example
# This script demonstrates how to send a stealth payment

MODULE_ADDRESS="0x86c46b435a128d6344d42e832ef22066133d39a8a1f8e42b02107b8b246e280c"
ACCOUNT_ADDRESS="0x86c46b435a128d6344d42e832ef22066133d39a8a1f8e42b02107b8b246e280c"

echo "=========================================="
echo "SQUIDL Aptos - Send Stealth Payment"
echo "=========================================="
echo ""
echo "This script demonstrates sending a stealth payment."
echo "First, generate stealth address using Python:"
echo ""
echo "  python scripts/offchain_helper.py"
echo ""
echo "Then use the generated values in the command below:"
echo ""
echo "Example command:"
echo "  aptos move run \\"
echo "    --function-id ${MODULE_ADDRESS}::payment_manager::send_private_payment \\"
echo "    --type-args 0x1::aptos_coin::AptosCoin \\"
echo "    --args address:${ACCOUNT_ADDRESS} u64:0 u64:1000000 u32:0 \\"
echo "           vector:0x[EPHEMERAL_PUB_KEY] address:0x[STEALTH_ADDRESS] \\"
echo "    --profile testnet"
echo ""
echo "Parameters:"
echo "  - recipient: Recipient's address"
echo "  - recipient_meta_index: Index of recipient's meta address (usually 0)"
echo "  - amount: Amount in octas (1 APT = 100000000 octas)"
echo "  - k: Stealth address index (usually 0)"
echo "  - ephemeral_pub_key: Generated ephemeral public key"
echo "  - stealth_address: Generated stealth address"
echo ""





