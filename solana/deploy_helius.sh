#!/bin/bash
# Deploy using Helius RPC for better reliability
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

# Use Helius RPC URL (more reliable)
HELIUS_RPC="https://devnet.helius-rpc.com/?api-key=a6b87d91-6513-46df-bb02-9c068731082d"

echo "Balance: $(solana balance --url $HELIUS_RPC)"
echo ""

echo "Deploying with Helius RPC..."
solana program deploy \
    --url "$HELIUS_RPC" \
    --program-id target/deploy/zcash_bridge_new-keypair.json \
    target/deploy/zcash_bridge.so \
    --with-compute-unit-price 200000

RESULT=$?

echo ""
echo "Exit code: $RESULT"
echo "Final balance: $(solana balance --url devnet)"

if [ $RESULT -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "SUCCESS! Program deployed!"
    echo "Program ID: CofWCu36QKNwD7xy7TDtx6KBQJ2oN7aL5DszZwz89tvS"
    echo "================================================"
fi
