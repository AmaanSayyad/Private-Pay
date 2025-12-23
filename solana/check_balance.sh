#!/bin/bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
echo "=== Wallet Balance ==="
solana balance --url devnet

echo ""
echo "=== Program Status ==="
solana program show HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5 --url devnet
