// circuits/bridge.circom
// Simplified version without circomlib dependencies
pragma circom 2.0.0;

template ZcashBridge() {
    // Public inputs
    signal input root;
    signal input nullifierHash;
    signal input commitmentHash;
    
    // Private witness inputs (not exposed publicly)
    signal input nullifier;
    signal input secret;
    signal input amount;
    signal input recipient;
    
    // Simple hash constraint using built-in multiplication
    // In production, use proper Pedersen hash from circomlib
    signal intermediateCommitment;
    intermediateCommitment <== amount + secret;
    signal computedCommitment;
    computedCommitment <== intermediateCommitment + recipient;
    
    // Verify commitment matches
    commitmentHash === computedCommitment;
    
    // Simple nullifier verification
    signal computedNullifier;
    computedNullifier <== nullifier + secret;
    nullifierHash === computedNullifier;
    
    // Merkle root check (simplified - just pass through for now)
    signal rootCheck;
    rootCheck <== root;
    rootCheck * 1 === root;
}

component main {public [root, nullifierHash, commitmentHash]} = ZcashBridge();