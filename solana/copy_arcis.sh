#!/bin/bash
cd /mnt/c/Users/enliven/Desktop/Private-Pay/solana/build

for f in *.arcis.ir; do
    base="${f%.arcis.ir}"
    echo "Copying $f to ${base}.arcis"
    cp "$f" "${base}.arcis"
done

echo ""
echo "Files created:"
ls -la *.arcis 2>/dev/null || echo "No .arcis files created"








