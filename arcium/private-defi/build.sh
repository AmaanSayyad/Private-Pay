#!/bin/bash
set -e

echo "Building Arcium Private DeFi programs..."

# Add Solana and Cargo to PATH
export PATH="$HOME/.local/share/solana/install/active_release/bin:$HOME/.cargo/bin:$PATH"

# Navigate to project directory
cd "$(dirname "$0")"

# Build with Anchor
echo "Running anchor build..."
anchor build

echo "Build complete!"
echo ""
echo "Program IDs:"
echo "  Private Pay: 7oNtYFkJ9sgDBLCEN8mYjLCYQUQ3ZvPRnTRAV9kb5QhP"
echo "  Private Swap: 6qqmuL4qmRMXrpPsUPsKLzabsbSoiKHRdhH817xFE1aa"
echo "  Dark Pool: ExmtDaTNpjZbgx2qABKG4AkxV5NTKbg5P7WY1iThqJAG"
