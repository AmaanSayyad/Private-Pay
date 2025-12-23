#!/bin/bash
# Deploy zcash_bridge to Solana Devnet

export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "================================================"
echo "  Deploying zcash_bridge to Solana Devnet"
echo "================================================"
echo ""

# Check wallet balance
echo "Wallet address: $(solana address)"
BALANCE=$(solana balance --url devnet)
echo "Balance: $BALANCE"
echo ""

# Check if program file exists
if [ ! -f "target/deploy/zcash_bridge.so" ]; then
    echo "❌ Program file not found! Run build first."
    exit 1
fi

echo "Program file size:"
ls -la target/deploy/zcash_bridge.so
echo ""

# Get program ID from keypair
PROGRAM_ID=$(solana-keygen pubkey target/deploy/zcash_bridge-keypair.json)
echo "Program ID: $PROGRAM_ID"
echo ""

# Deploy
echo "Deploying program to devnet..."
echo "This may take a few minutes..."
echo ""

solana program deploy \
    --url devnet \
    --program-id target/deploy/zcash_bridge-keypair.json \
    target/deploy/zcash_bridge.so \
    --with-compute-unit-price 10000

DEPLOY_STATUS=$?

echo ""
if [ $DEPLOY_STATUS -eq 0 ]; then
    echo "================================================"
    echo "  🎉 Deployment Successful!"
    echo "================================================"
    echo ""
    echo "Program ID: $PROGRAM_ID"
    echo ""
    echo "Next steps:"
    echo "1. Update .env with:"
    echo "   VITE_ZCASH_BRIDGE_PROGRAM_ID=$PROGRAM_ID"
    echo ""
    echo "2. Update the declare_id! in lib.rs:"
    echo "   declare_id!(\"$PROGRAM_ID\");"
    echo ""
    echo "3. Update Anchor.toml [programs.devnet]:"
    echo "   zcash_bridge = \"$PROGRAM_ID\""
    echo ""
    echo "4. Initialize the bridge by running:"
    echo "   npx ts-node scripts/init-bridge.ts"
else
    echo "❌ Deployment failed with status $DEPLOY_STATUS"
    echo ""
    echo "Common issues:"
    echo "- Insufficient SOL balance (need ~3 SOL for deployment)"
    echo "- Network congestion (try again later)"
    echo "- Try requesting airdrop: solana airdrop 2 --url devnet"
fi
