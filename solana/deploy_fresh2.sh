#!/bin/bash
# Deploy fresh with correct PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

NEW_PROGRAM_ID="CofWCu36QKNwD7xy7TDtx6KBQJ2oN7aL5DszZwz89tvS"

echo "Balance: $(solana balance --url devnet)"
echo "New Program ID: $NEW_PROGRAM_ID"
echo ""

# Verify lib.rs has new ID
echo "Checking lib.rs:"
grep "declare_id" programs/zcash_bridge/src/lib.rs
echo ""

# Rebuild
echo "Rebuilding program..."
cd programs/zcash_bridge
cargo build-sbf 2>&1 | tail -10

cd ../..
echo ""
echo "Build result:"
ls -la target/deploy/zcash_bridge.so

# Deploy
echo ""
echo "Deploying..."
solana program deploy \
    --url devnet \
    --program-id target/deploy/zcash_bridge_new-keypair.json \
    target/deploy/zcash_bridge.so \
    --with-compute-unit-price 100000

echo ""
echo "================================================"
echo "NEW PROGRAM ID: $NEW_PROGRAM_ID"
echo "================================================"
echo ""
echo "Balance: $(solana balance --url devnet)"
