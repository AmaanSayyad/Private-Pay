#!/bin/bash
# Buffer-based program upgrade
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "================================================"
echo "  Buffer-based Program Upgrade"
echo "================================================"
echo ""

# First, write the program to a buffer
echo "Step 1: Writing program to buffer..."
solana program write-buffer \
    --url devnet \
    target/deploy/zcash_bridge.so \
    --buffer-authority ~/.config/solana/id.json \
    --with-compute-unit-price 50000

# Get the buffer address from the output
echo ""
echo "Step 2: Deploying from buffer..."
# The buffer address will be printed, we need to use it

# For now, let's try a simpler approach - use retry
echo ""
echo "Retrying with higher priority fee..."
solana program deploy \
    --url devnet \
    --program-id HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5 \
    target/deploy/zcash_bridge.so \
    --upgrade-authority ~/.config/solana/id.json \
    --with-compute-unit-price 100000 \
    --max-sign-attempts 20

echo ""
echo "Final status:"
solana program show HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5 --url devnet
