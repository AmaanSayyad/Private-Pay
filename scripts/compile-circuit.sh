#!/bin/bash

# Circom Circuit Compilation Script for Private-Pay Unstoppable Wallet
# This script compiles the bridge.circom circuit and generates proving/verification keys

set -e  # Exit on error

echo "🔧 Circom Circuit Compilation Script"
echo "======================================"
echo ""

# Check if circom is installed
if ! command -v circom &> /dev/null; then
    echo "❌ Circom not found. Installing..."
    npm install -g circom
fi

# Check if snarkjs is installed
if ! command -v snarkjs &> /dev/null && ! npx snarkjs --version &> /dev/null; then
    echo "❌ snarkjs not found. Installing..."
    npm install -g snarkjs
else
    echo "✅ Using snarkjs via npx"
    SNARKJS="npx snarkjs"
fi

# Use npx if global snarkjs not available
if ! command -v snarkjs &> /dev/null; then
    SNARKJS="npx snarkjs"
else
    SNARKJS="snarkjs"
fi

# Create directories
echo "📁 Creating directories..."
mkdir -p build/circuits
mkdir -p keys
mkdir -p public/circuits

# Navigate to circuits directory
cd src/circuits

echo ""
echo "⚙️  Step 1: Compiling bridge.circom..."
circom bridge.circom --r1cs --wasm --sym -l ../../node_modules -o ../../build/circuits

echo ""
echo "⚙️  Step 2: Generating witness calculator..."
# The witness calculator is already generated in the --wasm output

echo ""
echo "⚙️  Step 3: Starting Powers of Tau ceremony (Phase 1)..."
cd ../../build/circuits

# Phase 1: Powers of Tau
if [ ! -f "../../keys/pot12_final.ptau" ]; then
    echo "   Creating new Powers of Tau file..."
    snarkjs powersoftau new bn128 12 pot12_0000.ptau -v
    
    echo "   Contributing to Powers of Tau..."
    snarkjs powersoftau contribute pot12_0000.ptau pot12_0001.ptau --name="First contribution" -v -e="$(date +%s)"
    
    echo "   Preparing Phase 2..."
    snarkjs powersoftau prepare phase2 pot12_0001.ptau ../../keys/pot12_final.ptau -v
    
    echo "   Cleaning up intermediate files..."
    rm pot12_0000.ptau pot12_0001.ptau
else
    echo "   ✅ Using existing Powers of Tau file"
fi

echo ""
echo "⚙️  Step 4: Phase 2 - Circuit-specific setup..."
echo "   Generating proving key..."
snarkjs groth16 setup bridge.r1cs ../../keys/pot12_final.ptau bridge_0000.zkey

echo "   Contributing to circuit-specific ceremony..."
snarkjs zkey contribute bridge_0000.zkey ../../keys/bridge_final.zkey --name="Second contribution" -v -e="$(date +%s)"

echo "   Cleaning up..."
rm bridge_0000.zkey

echo ""
echo "⚙️  Step 5: Exporting verification key..."
snarkjs zkey export verificationkey ../../keys/bridge_final.zkey ../../keys/verifying_key.json

echo ""
echo "⚙️  Step 6: Exporting Solidity verifier (optional)..."
snarkjs zkey export solidityverifier ../../keys/bridge_final.zkey ../../keys/BridgeVerifier.sol

echo ""
echo "⚙️  Step 7: Copying WASM to public directory..."
cp bridge_js/bridge.wasm ../../public/circuits/

echo ""
echo "✅ Circuit compilation complete!"
echo ""
echo "📦 Generated files:"
echo "   - build/circuits/bridge.r1cs (Rank-1 Constraint System)"
echo "   - build/circuits/bridge_js/bridge.wasm (Witness calculator)"
echo "   - keys/bridge_final.zkey (Proving key)"
echo "   - keys/verifying_key.json (Verification key)"
echo "   - keys/BridgeVerifier.sol (Solidity verifier contract)"
echo "   - public/circuits/bridge.wasm (Frontend-accessible WASM)"
echo ""
echo "🎯 Next steps:"
echo "   1. Test proof generation with snarkjs"
echo "   2. Deploy BridgeVerifier.sol if using on-chain verification"
echo "   3. Update PROOF_CONFIG paths in src/lib/zcash/proofs.js"
echo ""
