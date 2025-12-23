#!/bin/bash
# Deploy as a completely new program
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "================================================"
echo "  Deploy New Program Instance"
echo "================================================"
echo ""

# Generate new keypair for new program
echo "Generating new program keypair..."
solana-keygen new --no-bip39-passphrase -o target/deploy/zcash_bridge_v2-keypair.json --force

NEW_PROGRAM_ID=$(solana-keygen pubkey target/deploy/zcash_bridge_v2-keypair.json)
echo "New Program ID: $NEW_PROGRAM_ID"
echo ""

# We need to update the lib.rs with this new ID, rebuild, then deploy
echo "Updating declare_id in lib.rs..."
sed -i "s/declare_id!(\"HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5\")/declare_id!(\"$NEW_PROGRAM_ID\")/" programs/zcash_bridge/src/lib.rs

# Verify the change
echo "Verifying lib.rs:"
grep "declare_id" programs/zcash_bridge/src/lib.rs

echo ""
echo "Rebuilding program with new ID..."
cd programs/zcash_bridge
cargo build-sbf --manifest-path Cargo.toml 2>&1 | tail -20

cd ../..
echo ""
echo "Deploying new program..."
solana program deploy \
    --url devnet \
    --program-id target/deploy/zcash_bridge_v2-keypair.json \
    target/deploy/zcash_bridge.so \
    --with-compute-unit-price 100000

echo ""
echo "================================================"
echo "  New Program Info"
echo "================================================"
solana program show $NEW_PROGRAM_ID --url devnet 2>/dev/null || echo "Checking..."

echo ""
echo "NEW PROGRAM ID: $NEW_PROGRAM_ID"
echo ""
echo "Update your .env with:"
echo "VITE_ZCASH_BRIDGE_PROGRAM_ID=$NEW_PROGRAM_ID"
