#!/bin/bash
export PATH="$HOME/.avm/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

echo "==========================================="
echo "Environment Check"
echo "==========================================="
echo ""
echo "Anchor: $(anchor --version 2>&1)"
echo "Solana: $(solana --version 2>&1)"
echo "Arcium: $(arcium --version 2>&1)"
echo ""
echo "Solana Balance: $(solana balance --url devnet 2>&1)"
echo ""
echo "==========================================="











