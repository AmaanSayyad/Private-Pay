#!/bin/bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
echo "Checking program info..."
solana program show HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5 --url devnet
