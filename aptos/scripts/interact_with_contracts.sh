#!/bin/bash
# SQUIDL Aptos - Interact with Deployed Contracts
# This script demonstrates how to call Move functions

MODULE_ADDRESS="0x86c46b435a128d6344d42e832ef22066133d39a8a1f8e42b02107b8b246e280c"
ACCOUNT_ADDRESS="0x86c46b435a128d6344d42e832ef22066133d39a8a1f8e42b02107b8b246e280c"

echo "=========================================="
echo "SQUIDL Aptos - Contract Interaction"
echo "=========================================="
echo ""
echo "Module Address: $MODULE_ADDRESS"
echo "Account Address: $ACCOUNT_ADDRESS"
echo ""

# Example 1: Initialize payment registry
echo "1. Initializing payment registry..."
aptos move run \
  --function-id ${MODULE_ADDRESS}::payment_manager::initialize \
  --profile testnet \
  --assume-yes

echo ""
echo "2. To register a meta address, use:"
echo "   aptos move run \\"
echo "     --function-id ${MODULE_ADDRESS}::payment_manager::register_for_payments \\"
echo "     --args vector:0x[SPEND_PUB_KEY] vector:0x[VIEWING_PUB_KEY] \\"
echo "     --profile testnet"
echo ""
echo "3. View on Explorer:"
echo "   https://explorer.aptoslabs.com/account/${MODULE_ADDRESS}?network=testnet"
echo ""





