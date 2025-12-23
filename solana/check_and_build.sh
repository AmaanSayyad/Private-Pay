#!/bin/bash
# Check anchor version and build the zcash_bridge program

export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"

echo "Checking tools..."
echo "Solana: $(solana --version 2>/dev/null || echo 'not found')"
echo "Anchor: $(anchor --version 2>/dev/null || echo 'not found')"
echo "Cargo: $(cargo --version 2>/dev/null || echo 'not found')"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

# If anchor not found, try installing it
if ! command -v anchor &> /dev/null; then
    echo "Anchor not found. Installing via avm..."
    $HOME/.cargo/bin/avm install latest
    $HOME/.cargo/bin/avm use latest
    export PATH="$HOME/.avm/bin:$PATH"
fi

echo ""
echo "Attempting to build zcash_bridge program..."
anchor build -p zcash_bridge

echo ""
echo "Build results:"
ls -la target/deploy/*.so 2>/dev/null || echo "No .so files found"
ls -la target/deploy/*-keypair.json 2>/dev/null || echo "No keypair files found"
ls -la target/idl/*.json 2>/dev/null || echo "No IDL files found"
