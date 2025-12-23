#!/bin/bash
# Full redeploy with program upgrade
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "Current program status:"
solana program show HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5 --url devnet

echo ""
echo "Upgrading program with the rebuilt binary..."
solana program deploy \
    --url devnet \
    --program-id HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5 \
    target/deploy/zcash_bridge.so \
    --upgrade-authority ~/.config/solana/id.json

echo ""
echo "Program status after upgrade:"
solana program show HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5 --url devnet
