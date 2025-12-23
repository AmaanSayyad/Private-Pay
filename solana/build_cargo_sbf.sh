#!/bin/bash
# Build zcash_bridge using cargo (bypassing anchor CLI version issues)

export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "================================================"
echo "  Building zcash_bridge with Cargo + SPL BPF"
echo "================================================"
echo ""

echo "Solana: $(solana --version)"
echo "Cargo: $(cargo --version)"
echo ""

# Check current config
echo "Solana config:"
solana config get
echo ""

# Build with cargo-build-sbf (Solana Build Framework)
echo "Building with cargo-build-sbf..."
cd programs/zcash_bridge

# Make sure we have the right Solana version for BPF building
cargo build-sbf --manifest-path Cargo.toml 2>&1

cd ../..

echo ""
echo "================================================"
echo "  Build Results" 
echo "================================================"
echo ""

if [ -f "target/deploy/zcash_bridge.so" ]; then
    echo "✅ Program built successfully!"
    ls -la target/deploy/zcash_bridge*.so
    
    # Generate keypair if not exists
    if [ ! -f "target/deploy/zcash_bridge-keypair.json" ]; then
        echo "Generating program keypair..."
        solana-keygen new --no-bip39-passphrase -o target/deploy/zcash_bridge-keypair.json
    fi
    
    echo ""
    echo "Program keypair pubkey:"
    solana-keygen pubkey target/deploy/zcash_bridge-keypair.json
else
    echo "❌ Build may have failed. Checking sbf-solana-solana target..."
    find target -name "*.so" 2>/dev/null | head -10
fi
