#!/bin/bash
# Resume deploy from buffer
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana

echo "Balance: $(solana balance --url devnet)"
echo ""

# Try to recover and continue from the last buffer
echo "Recovering last buffer keypair..."
# We'll use solana-keygen recover with the seed phrase

# Actually, let's just retry the full deploy with lower priority
echo "Retrying full deploy..."
solana program deploy \
    --url devnet \
    --program-id target/deploy/zcash_bridge_new-keypair.json \
    target/deploy/zcash_bridge.so

RESULT=$?
echo ""
echo "Exit code: $RESULT"
echo "Final balance: $(solana balance --url devnet)"

if [ $RESULT -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "SUCCESS!"
    echo "Program ID: CofWCu36QKNwD7xy7TDtx6KBQJ2oN7aL5DszZwz89tvS"
    echo "================================================"
fi
