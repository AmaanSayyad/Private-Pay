#!/bin/bash
# Install Solana CLI

echo "Installing Solana CLI..."
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Add to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# Verify installation
echo "Verifying Solana installation..."
solana --version

# Configure for devnet
echo "Configuring for devnet..."
solana config set --url https://api.devnet.solana.com

# Check if keypair exists, create if not
if [ ! -f "$HOME/.config/solana/id.json" ]; then
    echo "Creating new keypair..."
    solana-keygen new --no-bip39-passphrase -o "$HOME/.config/solana/id.json"
fi

# Show wallet address
echo "Wallet address:"
solana address

# Check balance
echo "Balance:"
solana balance --url devnet

echo ""
echo "Solana CLI installed successfully!"
echo "Run 'source ~/.bashrc' to update your PATH"
