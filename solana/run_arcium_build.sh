#!/bin/bash
export PATH="$HOME/.avm/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "=== Starting Arcium Build ==="
echo ""

arcium build 2>&1

echo ""
echo "=== Build Complete ==="
echo ""
echo "Build directory contents:"
ls -la build/ 2>/dev/null || echo "No build directory"












