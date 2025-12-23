#!/bin/bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo "Current balance:"
solana balance --url devnet

echo ""
echo "Requesting airdrop (2 SOL)..."
solana airdrop 2 --url devnet

echo ""
echo "Waiting 10 seconds..."
sleep 10

echo "Requesting another airdrop (2 SOL)..."
solana airdrop 2 --url devnet

echo ""
echo "Final balance:"
solana balance --url devnet
