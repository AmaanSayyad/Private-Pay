#!/bin/bash
# Initialize the Zcash Bridge on Solana Devnet using Anchor CLI

export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$HOME/.avm/bin:$PATH"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

PROGRAM_ID="HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5"
WALLET_ADDRESS=$(solana address)

echo "================================================"
echo "  Initializing Zcash Bridge on Devnet"
echo "================================================"
echo ""
echo "Program ID: $PROGRAM_ID"
echo "Wallet: $WALLET_ADDRESS"
echo "Balance: $(solana balance --url devnet)"
echo ""

# First, create a wrapped ZEC token mint for testing
echo "Creating wrapped ZEC token mint..."
MINT_OUTPUT=$(spl-token create-token --url devnet --decimals 8 2>&1)
echo "$MINT_OUTPUT"

# Extract the mint address from the output
WRAPPED_ZEC_MINT=$(echo "$MINT_OUTPUT" | grep "Creating token" | awk '{print $3}')

if [ -z "$WRAPPED_ZEC_MINT" ]; then
    echo "Failed to extract mint address, using a placeholder..."
    # Create mint manually
    WRAPPED_ZEC_MINT=$(spl-token create-token --url devnet --decimals 8 2>&1 | grep -oP 'Creating token \K[A-Za-z0-9]+')
fi

echo ""
echo "Wrapped ZEC Mint: $WRAPPED_ZEC_MINT"

# Now we need to call the initialize instruction
# This requires Anchor or a custom script

echo ""
echo "================================================"
echo "  Bridge Initialization Info"
echo "================================================"
echo ""
echo "The program is deployed but needs initialization."
echo ""
echo "Mint created: $WRAPPED_ZEC_MINT"
echo ""
echo "To complete initialization, add to your .env:"
echo "VITE_WRAPPED_ZEC_MINT=$WRAPPED_ZEC_MINT"
echo ""
echo "The initialize() instruction must be called from"
echo "the frontend or a TypeScript script with the"
echo "following parameters:"
echo ""
echo "  - authority: $WALLET_ADDRESS"
echo "  - operator: $WALLET_ADDRESS"
echo "  - wrappedZecMint: $WRAPPED_ZEC_MINT"
echo "  - minDeposit: 10000 (0.00001 SOL)"
echo "  - maxDeposit: 1000000000000 (1000 SOL)"
echo "  - protocolFeeBps: 30 (0.3%)"
