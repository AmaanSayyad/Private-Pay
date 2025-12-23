#!/bin/bash
# Recover SOL from abandoned buffers
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo "Current balance: $(solana balance --url devnet)"
echo ""

echo "Closing abandoned buffers to recover SOL..."

# Close the buffers mentioned in previous error messages
solana program close DYy2drRvSjoSRkKMHLoRKaAboy2ZJiAwq7ig2y7Ne9BN --url devnet 2>/dev/null && echo "Closed DYy2..." || echo "Could not close DYy2..."
solana program close 5HyzpCxv3uEgJWaAutXzQvkxqrHTnBnRiw12z3nrxxtj --url devnet 2>/dev/null && echo "Closed 5Hyz..." || echo "Could not close 5Hyz..."
solana program close 3dR4MTFWbzgiFfFKe6njxaUXMQ72ymGuiAymdQxn6SVU --url devnet 2>/dev/null && echo "Closed 3dR4..." || echo "Could not close 3dR4..."
solana program close 4S5HxDmauT7sugezSSbC5NuHR6h68bkrZXzPX8qvpfnK --url devnet 2>/dev/null && echo "Closed 4S5H..." || echo "Could not close 4S5H..."

echo ""
echo "New balance: $(solana balance --url devnet)"
