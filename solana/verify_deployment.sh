#!/bin/bash
# Initialize the zcash_bridge on Solana Devnet
# This script creates the bridge state account

export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"

PROGRAM_ID="HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5"

echo "================================================"
echo "  Initialize Zcash Bridge"
echo "================================================"
echo ""
echo "Program ID: $PROGRAM_ID"
echo "Wallet: $(solana address)"
echo "Balance: $(solana balance --url devnet)"
echo ""

# Check if program is deployed
echo "Checking if program is deployed..."
PROGRAM_INFO=$(solana program show $PROGRAM_ID --url devnet 2>&1)

if echo "$PROGRAM_INFO" | grep -q "Program Id"; then
    echo "✅ Program is deployed on devnet"
else
    echo "❌ Program not found on devnet:"
    echo "$PROGRAM_INFO"
    exit 1
fi

echo ""
echo "================================================"
echo "  Bridge State Information"
echo "================================================"
echo ""

# Derive the bridge state PDA
# seeds: ["bridge"]
# The PDA is derived from the program ID

# For now, just verify the program exists
# The actual initialization requires a client SDK

echo "Program is deployed and ready!"
echo ""
echo "To initialize the bridge, you need to:"
echo "1. Update your .env file with:"
echo "   VITE_ZCASH_BRIDGE_PROGRAM_ID=$PROGRAM_ID"
echo ""
echo "2. Create a wrapped ZEC token mint on devnet"
echo ""
echo "3. Call the initialize instruction from the frontend"
echo "   or run a TypeScript initialization script"
echo ""
echo "For testing, the bridge will show as uninitialized"
echo "until the initialize() instruction is called."
