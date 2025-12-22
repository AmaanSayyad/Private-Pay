#!/bin/bash
set -e

export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
source ~/.cargo/env 2>/dev/null || true

echo "=== Checking installations ==="
echo "Rust: $(rustc --version 2>&1 || echo 'Not installed')"
echo "Cargo: $(cargo --version 2>&1 || echo 'Not installed')"
echo "Solana: $(solana --version 2>&1 || echo 'Not installed')"
echo "Arcium: $(arcium --version 2>&1 || echo 'Not installed')"

echo ""
echo "=== Setting up Solana for devnet ==="
solana config set --url https://api.devnet.solana.com

echo ""
echo "=== Checking/Creating Solana keypair ==="
if [ ! -f ~/.config/solana/id.json ]; then
    echo "Creating new keypair..."
    solana-keygen new --no-bip39-passphrase -o ~/.config/solana/id.json
else
    echo "Keypair exists"
fi

echo ""
echo "=== Solana address ==="
solana address

echo ""
echo "=== Requesting airdrop ==="
solana airdrop 2 || echo "Airdrop might have failed (rate limited)"

echo ""
echo "=== Setup complete ==="








