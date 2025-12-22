#!/bin/bash
export PATH="$HOME/.avm/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "Building Anchor program..."
anchor build 2>&1

echo ""
echo "Checking results..."
ls -la target/deploy/*.so 2>/dev/null || echo "No .so files found"
ls -la target/idl/*.json 2>/dev/null || echo "No IDL files found"







