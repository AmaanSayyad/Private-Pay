#!/bin/bash
# Careful program upgrade with available SOL
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "Current balance: $(solana balance --url devnet)"
echo ""

# Check current lib.rs
echo "Current declare_id in lib.rs:"
grep "declare_id" programs/zcash_bridge/src/lib.rs
echo ""

echo "Upgrading program..."
solana program deploy \
    --url devnet \
    --program-id HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5 \
    target/deploy/zcash_bridge.so \
    --upgrade-authority ~/.config/solana/id.json \
    --with-compute-unit-price 5000

echo ""
echo "Balance after: $(solana balance --url devnet)"
echo ""
echo "Program status:"
solana program show HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5 --url devnet
