#!/bin/bash

export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
source ~/.cargo/env 2>/dev/null || true

echo "========================================="
echo "Environment Verification"
echo "========================================="
echo ""
echo "Rust:     $(rustc --version 2>&1)"
echo "Cargo:    $(cargo --version 2>&1)"
echo "Solana:   $(solana --version 2>&1)"
echo "Anchor:   $(anchor --version 2>&1 || echo 'Not installed')"
echo "Arcium:   $(arcium --version 2>&1 || echo 'Not installed')"
echo ""
echo "========================================="
echo "Solana Configuration"
echo "========================================="
echo ""
solana config get
echo ""
echo "Wallet Address: $(solana address 2>&1)"
echo "Balance: $(solana balance 2>&1)"
echo ""
echo "========================================="












