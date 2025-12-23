#!/bin/bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo "Current balance: $(solana balance --url devnet)"
echo ""
echo "Requesting airdrop..."
solana airdrop 1 --url devnet

echo ""
echo "New balance: $(solana balance --url devnet)"
