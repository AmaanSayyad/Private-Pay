#!/bin/bash
# Deploy as NEW program with fresh keypair
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "Balance: $(solana balance --url devnet)"
echo ""

# Generate new keypair
echo "Step 1: Generating new program keypair..."
solana-keygen new --no-bip39-passphrase -o target/deploy/zcash_bridge_new-keypair.json --force

NEW_PROGRAM_ID=$(solana-keygen pubkey target/deploy/zcash_bridge_new-keypair.json)
echo "New Program ID: $NEW_PROGRAM_ID"

# Update lib.rs with new ID
echo ""
echo "Step 2: Updating declare_id in lib.rs..."
sed -i "s/declare_id!(\"HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5\")/declare_id!(\"$NEW_PROGRAM_ID\")/" programs/zcash_bridge/src/lib.rs

grep "declare_id" programs/zcash_bridge/src/lib.rs

# Rebuild with new ID
echo ""
echo "Step 3: Rebuilding program..."
cd programs/zcash_bridge
cargo build-sbf 2>&1 | tail -5

cd ../..

# Deploy new program
echo ""
echo "Step 4: Deploying new program..."
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
echo "Update your .env with:"
echo "VITE_ZCASH_BRIDGE_PROGRAM_ID=$NEW_PROGRAM_ID"
echo ""
echo "Balance: $(solana balance --url devnet)"
