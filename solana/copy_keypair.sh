#!/bin/bash
# Copy keypair to Windows format and run init

export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"

# Copy keypair
cp /home/enliven/.config/solana/id.json /mnt/c/Users/enliven/Desktop/Private-Pay/solana/keypair.json

echo "Keypair copied successfully"
cat /mnt/c/Users/enliven/Desktop/Private-Pay/solana/keypair.json | head -c 100
echo "..."
