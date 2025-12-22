#!/bin/bash
export PATH="$HOME/.avm/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "==========================================="
echo "Private Pay - Full Build Process"
echo "==========================================="
echo ""

# Step 1: Build Arcium circuits
echo "Step 1: Building Arcium encrypted circuits..."
echo "Running: arcium build"
arcium build 2>&1

if [ $? -ne 0 ]; then
    echo "Arcium build failed. Trying alternative..."
    # Alternative: compile encrypted-ixs separately
    echo "Compiling encrypted-ixs crate..."
    cd encrypted-ixs
    cargo build --release 2>&1
    cd ..
fi

echo ""
echo "Checking for .arcis files..."
ls -la build/*.arcis 2>&1 || echo "No .arcis files found in build/"

echo ""
echo "Step 2: Building Anchor program..."
echo "Running: anchor build"
anchor build 2>&1

echo ""
echo "==========================================="
echo "Build Complete"
echo "==========================================="
echo ""

# Check results
echo "Checking build outputs..."
ls -la target/deploy/*.so 2>&1 || echo "No .so files found"
ls -la target/deploy/*.json 2>&1 || echo "No .json files found"
ls -la target/idl/*.json 2>&1 || echo "No IDL files found"








