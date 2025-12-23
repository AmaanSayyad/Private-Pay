#!/bin/bash
# Deploy only (program already built)
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "Balance: $(solana balance --url devnet)"
echo ""

echo "Program file:"
ls -la target/deploy/zcash_bridge.so
echo ""

echo "Deploying new program..."
solana program deploy \
    --url devnet \
    --program-id target/deploy/zcash_bridge_new-keypair.json \
    target/deploy/zcash_bridge.so \
    --with-compute-unit-price 50000

echo ""
echo "Final balance: $(solana balance --url devnet)"
