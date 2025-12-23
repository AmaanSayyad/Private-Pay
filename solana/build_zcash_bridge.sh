#!/bin/bash
# Build zcash_bridge program with current Anchor version

export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "================================================"
echo "  Building zcash_bridge with Anchor 0.32.1"
echo "================================================"
echo ""

# Clean previous build artifacts
echo "Cleaning previous builds..."
rm -rf target/deploy/zcash_bridge* 2>/dev/null
rm -rf target/idl/zcash_bridge* 2>/dev/null

# Update Cargo.lock
echo "Updating dependencies..."
cargo update -p anchor-lang -p anchor-spl 2>&1

echo ""
echo "Building zcash_bridge program..."
anchor build -p zcash_bridge 2>&1

echo ""
echo "================================================"
echo "  Build Results"
echo "================================================"
echo ""

if [ -f "target/deploy/zcash_bridge.so" ]; then
    echo "✅ Program built successfully!"
    ls -la target/deploy/zcash_bridge*.so
    ls -la target/deploy/zcash_bridge*-keypair.json 2>/dev/null
    ls -la target/idl/zcash_bridge.json 2>/dev/null
    
    echo ""
    echo "Program keypair pubkey:"
    solana-keygen pubkey target/deploy/zcash_bridge-keypair.json 2>/dev/null || echo "Keypair not found"
else
    echo "❌ Build failed!"
    echo "Check the output above for errors."
fi
