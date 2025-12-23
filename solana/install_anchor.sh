#!/bin/bash
# Install Anchor CLI for Solana development

export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"

echo "================================================"
echo "  Installing Anchor CLI"
echo "================================================"

# Check if Rust is installed
if ! command -v cargo &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

echo "Rust version:"
cargo --version

# Install AVM (Anchor Version Manager)
echo ""
echo "Installing AVM..."
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force

# Install Anchor 0.29.0 (matching Anchor.toml)
echo ""
echo "Installing Anchor 0.29.0..."
$HOME/.cargo/bin/avm install 0.29.0
$HOME/.cargo/bin/avm use 0.29.0

echo ""
echo "Anchor version:"
$HOME/.avm/bin/anchor --version

echo ""
echo "================================================"
echo "  Anchor CLI installed successfully!"
echo "================================================"
