#!/bin/bash
# High priority upgrade
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "Balance: $(solana balance --url devnet)"
echo ""
echo "Trying with very high priority fee..."

solana program deploy \
    --url devnet \
    --program-id HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5 \
    target/deploy/zcash_bridge.so \
    --upgrade-authority ~/.config/solana/id.json \
    --with-compute-unit-price 500000

echo ""
echo "Final balance: $(solana balance --url devnet)"
echo ""
echo "Program status:"
solana program show HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5 --url devnet
