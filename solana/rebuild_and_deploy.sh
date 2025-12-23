#!/bin/bash
# Rebuild and redeploy zcash_bridge with correct program ID

export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

PROGRAM_ID="HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5"

echo "================================================"
echo "  Rebuilding zcash_bridge with correct ID"
echo "================================================"
echo ""
echo "Program ID: $PROGRAM_ID"
echo ""

# Check what's in the lib.rs
echo "Checking declare_id in lib.rs..."
grep -n "declare_id" programs/zcash_bridge/src/lib.rs

echo ""
echo "Building program..."
cd programs/zcash_bridge
cargo build-sbf --manifest-path Cargo.toml 2>&1

cd ../..

echo ""
echo "Build complete. Checking results..."
ls -la target/deploy/zcash_bridge.so 2>/dev/null

if [ -f "target/deploy/zcash_bridge.so" ]; then
    echo ""
    echo "Upgrading program on devnet..."
    solana program deploy \
        --url devnet \
        --program-id target/deploy/zcash_bridge-keypair.json \
        target/deploy/zcash_bridge.so \
        --with-compute-unit-price 10000
    
    echo ""
    echo "✅ Program upgraded successfully!"
else
    echo "❌ Build failed!"
fi
