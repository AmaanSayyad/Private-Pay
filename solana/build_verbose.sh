#!/bin/bash
export PATH="$HOME/.avm/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "==========================================="
echo "Building Anchor Program with Verbose Output"
echo "==========================================="
echo ""

# Try anchor build
echo "Running: anchor build"
anchor build 2>&1

echo ""
echo "==========================================="
echo "Build Complete - Checking output"
echo "==========================================="
echo ""

# Check if .so file was created
ls -la target/deploy/*.so 2>&1 || echo "No .so files found"
ls -la target/deploy/*.json 2>&1 || echo "No .json files found"






