#!/bin/bash
# Recover ALL SOL from failed buffers
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

echo "Current balance: $(solana balance --url devnet)"
echo ""

echo "Listing all buffer accounts..."
solana program show --buffers --url devnet

echo ""
echo "Closing all buffers to recover SOL..."

# Close all known failed buffers
for buffer in DYy2drRvSjoSRkKMHLoRKaAboy2ZJiAwq7ig2y7Ne9BN \
              5HyzpCxv3uEgJWaAutXzQvkxqrHTnBnRiw12z3nrxxtj \
              3dR4MTFWbzgiFfFKe6njxaUXMQ72ymGuiAymdQxn6SVU \
              4S5HxDmauT7sugezSSbC5NuHR6h68bkrZXzPX8qvpfnK \
              4jfJSUNHjidzsZ7GidiiBanWczew5ezG16GMCNkzmMjK \
              2Xi9kEoV6Ze4reqPPzXYjGUGSQTHs18gAHJyh1co287v \
              3iCM9QGDkqWHyib3jXbJVnuq9Enfcpq2ucVWfDKZPQRa \
              CksWTXUhje21hdGiWBZrH6W6frreAzQRKyXcGB2y6Piw; do
    echo "Closing $buffer..."
    solana program close $buffer --url devnet 2>/dev/null && echo "  Recovered!" || echo "  Already closed or not found"
done

echo ""
echo "Final balance: $(solana balance --url devnet)"
