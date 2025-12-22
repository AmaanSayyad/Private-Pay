#!/bin/bash
export PATH="$HOME/.avm/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"
cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "=== Deploying Private Pay to Devnet ==="
echo ""

# Check balance
echo "Current balance:"
solana balance --url devnet

echo ""
echo "Deploying program..."
solana program deploy --url devnet target/deploy/private_pay.so

echo ""
echo "=== Deployment Complete ==="








