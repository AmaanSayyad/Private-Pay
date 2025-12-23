#!/bin/bash
# WSL Script to build and deploy the zcash_bridge Solana program to devnet

set -e

# Add paths
export PATH="$HOME/.avm/bin:$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

# Navigate to solana directory
cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "================================================"
echo "  Solana Zcash Bridge - Build & Deploy Script"
echo "================================================"
echo ""

# Step 1: Check Solana CLI installation
echo "[1/7] Checking Solana CLI..."
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Installing..."
    sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"
    export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
fi
solana --version

# Step 2: Check Anchor CLI installation
echo ""
echo "[2/7] Checking Anchor CLI..."
if ! command -v anchor &> /dev/null; then
    echo "❌ Anchor CLI not found. Installing via avm..."
    if ! command -v avm &> /dev/null; then
        cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
    fi
    avm install 0.29.0
    avm use 0.29.0
fi
anchor --version

# Step 3: Configure Solana for devnet
echo ""
echo "[3/7] Configuring Solana for devnet..."
solana config set --url https://api.devnet.solana.com

# Step 4: Check wallet
echo ""
echo "[4/7] Checking wallet configuration..."
if [ ! -f "$HOME/.config/solana/id.json" ]; then
    echo "⚠️  No wallet found. Generating new keypair..."
    solana-keygen new --no-bip39-passphrase -o "$HOME/.config/solana/id.json"
fi

WALLET_ADDRESS=$(solana address)
echo "Wallet address: $WALLET_ADDRESS"

# Step 5: Check balance and airdrop if needed
echo ""
echo "[5/7] Checking SOL balance..."
BALANCE=$(solana balance --url devnet | grep -oP '^\d+(\.\d+)?')
echo "Current balance: $BALANCE SOL"

if (( $(echo "$BALANCE < 2" | bc -l) )); then
    echo "⚠️  Balance too low, requesting airdrop..."
    solana airdrop 2 --url devnet || echo "Airdrop failed (may need to try again or use faucet)"
    sleep 5
    BALANCE=$(solana balance --url devnet)
    echo "New balance: $BALANCE"
fi

# Step 6: Build the program
echo ""
echo "[6/7] Building zcash_bridge program..."
anchor build

# Check if build was successful
if [ -f "target/deploy/zcash_bridge.so" ]; then
    echo "✅ Build successful!"
    ls -la target/deploy/*.so
else
    echo "❌ Build failed - zcash_bridge.so not found"
    ls -la target/deploy/ 2>/dev/null || echo "No deploy directory"
    exit 1
fi

# Get the generated program ID (keypair)
echo ""
echo "Getting program ID from keypair..."
if [ -f "target/deploy/zcash_bridge-keypair.json" ]; then
    PROGRAM_ID=$(solana-keygen pubkey target/deploy/zcash_bridge-keypair.json)
    echo "Program ID from keypair: $PROGRAM_ID"
else
    echo "Generating new program keypair..."
    solana-keygen new --no-bip39-passphrase -o target/deploy/zcash_bridge-keypair.json
    PROGRAM_ID=$(solana-keygen pubkey target/deploy/zcash_bridge-keypair.json)
    echo "New Program ID: $PROGRAM_ID"
fi

# Step 7: Deploy to devnet
echo ""
echo "[7/7] Deploying to Solana Devnet..."
echo "This may take a few minutes..."

solana program deploy \
    --url devnet \
    --program-id target/deploy/zcash_bridge-keypair.json \
    target/deploy/zcash_bridge.so

echo ""
echo "================================================"
echo "  🎉 Deployment Complete!"
echo "================================================"
echo ""
echo "Program ID: $PROGRAM_ID"
echo ""
echo "Next steps:"
echo "1. Update your .env file with:"
echo "   VITE_ZCASH_BRIDGE_PROGRAM_ID=$PROGRAM_ID"
echo ""
echo "2. Update Anchor.toml [programs.devnet] section:"
echo "   zcash_bridge = \"$PROGRAM_ID\""
echo ""
echo "3. Update lib.rs declare_id! if different:"
echo "   declare_id!(\"$PROGRAM_ID\");"
echo ""
echo "4. Initialize the bridge (run this command):"
echo "   anchor run init-bridge"
echo ""
