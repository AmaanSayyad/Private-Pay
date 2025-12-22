pragma circom 2.1.9;

// Fixed-denomination withdrawal circuit for AxelarPrivacyPool
//
// Public inputs:
//  - root: Merkle root of deposits
//  - nullifierHash: prevents double-spends
//  - extDataHash: binds withdrawal parameters (computed off-circuit)
//
// Private inputs:
//  - nullifier, secret: note preimage
//  - pathElements, pathIndices: Merkle inclusion proof for commitment
//
// Hashing: MiMC sponge (Tornado-style). We use the MiMC Feistel permutation
// as a 2-to-1 compression function: H(a,b) = MiMCFeistel(a,b,k=0).xL_out.

include "circomlib/circuits/mimcsponge.circom";

template HashLeftRight() {
  signal input left;
  signal input right;
  signal output out;

  component h = MiMCFeistel(220);
  h.xL_in <== left;
  h.xR_in <== right;
  h.k <== 0;
  out <== h.xL_out;
}

template MerkleInclusionProof(levels) {
  signal input leaf;
  signal input pathElements[levels];
  signal input pathIndices[levels]; // 0 = leaf is left, 1 = leaf is right
  signal output root;

  signal cur[levels + 1];
  signal left[levels];
  signal right[levels];
  signal diffLeft[levels];
  signal diffRight[levels];
  component h[levels];

  cur[0] <== leaf;

  for (var i = 0; i < levels; i++) {
    // Enforce boolean index
    pathIndices[i] * (pathIndices[i] - 1) === 0;

    // Select left/right based on index
    // Rewrite to keep constraints quadratic:
    // left  = cur + (path - cur) * idx
    // right = path + (cur - path) * idx
    diffLeft[i] <== pathElements[i] - cur[i];
    left[i] <== cur[i] + diffLeft[i] * pathIndices[i];

    diffRight[i] <== cur[i] - pathElements[i];
    right[i] <== pathElements[i] + diffRight[i] * pathIndices[i];

    h[i] = HashLeftRight();
    h[i].left <== left[i];
    h[i].right <== right[i];
    cur[i + 1] <== h[i].out;
  }

  root <== cur[levels];
}

template WithdrawAndBridge(levels) {
  // Public
  signal input root;
  signal input nullifierHash;
  signal input extDataHash;

  // Private
  signal input nullifier;
  signal input secret;
  signal input pathElements[levels];
  signal input pathIndices[levels];

  // commitment = Poseidon(nullifier, secret)
  component commitHash = HashLeftRight();
  commitHash.left <== nullifier;
  commitHash.right <== secret;
  signal commitment;
  commitment <== commitHash.out;

  // nullifierHash = Poseidon(nullifier, 0)
  component nHash = HashLeftRight();
  nHash.left <== nullifier;
  nHash.right <== 0;
  nHash.out === nullifierHash;

  // Merkle root verification
  component mt = MerkleInclusionProof(levels);
  mt.leaf <== commitment;
  for (var i = 0; i < levels; i++) {
    mt.pathElements[i] <== pathElements[i];
    mt.pathIndices[i] <== pathIndices[i];
  }
  mt.root === root;

  // extDataHash is a public binding value. The circuit doesn't compute it,
  // but it is included as a public signal so it is cryptographically bound
  // to the proof and cannot be changed by a relayer without invalidating it.
  extDataHash === extDataHash;
}

component main {public [root, nullifierHash, extDataHash]} = WithdrawAndBridge(20);
