import {ethers} from "ethers";

export const SNARK_SCALAR_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

export const TREE_LEVELS = 20;

export const AXELAR_PRIVACY_POOL_ABI = [
  "function token() view returns (address)",
  "function denomination() view returns (uint256)",
  "function axelarStealthBridge() view returns (address)",
  "function gmpSymbol() view returns (string)",
  "function itsTokenId() view returns (bytes32)",
  "function nextIndex() view returns (uint32)",
  "function getLastRoot() view returns (uint256)",
  "function deposit(uint256 commitment) external",
  "function withdrawAndBridgeGMP(uint256 root,uint256 nullifierHash,uint256 relayerFee,string destinationChain,address stealthAddress,bytes ephemeralPubKey,bytes1 viewHint,uint32 k,uint256[2] a,uint256[2][2] b,uint256[2] c) external payable",
  "function withdrawAndBridgeITS(uint256 root,uint256 nullifierHash,uint256 relayerFee,string destinationChain,address stealthAddress,bytes ephemeralPubKey,bytes1 viewHint,uint32 k,uint256[2] a,uint256[2][2] b,uint256[2] c) external payable",
  "event Deposit(uint256 indexed commitment, uint32 leafIndex, uint256 timestamp)",
];

export function modField(x) {
  const r = x % SNARK_SCALAR_FIELD;
  return r >= 0n ? r : r + SNARK_SCALAR_FIELD;
}

export async function buildMimcHash2() {
  try {
    const {buildMimcSponge} = await import("circomlibjs");
    const mimc = await buildMimcSponge();
    const F = mimc.F;
    return (a, b) => BigInt(F.toObject(mimc.hash(a, b, 0).xL));
  } catch (error) {
    console.error("Failed to load circomlibjs:", error);
    throw new Error("Privacy pool cryptographic library failed to load. Please refresh the page.");
  }
}

export function randomBigInt31() {
  const bytes = new Uint8Array(31);
  crypto.getRandomValues(bytes);
  let x = 0n;
  for (const b of bytes) x = (x << 8n) + BigInt(b);
  return x;
}

export async function generatePoolNote() {
  const hash2 = await buildMimcHash2();
  const nullifier = modField(randomBigInt31());
  const secret = modField(randomBigInt31());
  const commitment = hash2(nullifier, secret);
  const nullifierHash = hash2(nullifier, 0n);
  return {
    nullifier: nullifier.toString(),
    secret: secret.toString(),
    commitment: commitment.toString(),
    nullifierHash: nullifierHash.toString(),
    createdAt: new Date().toISOString(),
  };
}

export function getExtDataHashGMP({
  destinationChain,
  stealthAddress,
  ephemeralPubKeyBytes,
  viewHint,
  k,
  amountToBridge,
  relayerFee,
  axelarStealthBridge,
  gmpSymbol,
}) {
  const packed = ethers.solidityPacked(
    ["string", "address", "bytes", "bytes1", "uint32", "uint256", "uint256", "address", "string"],
    [
      destinationChain,
      stealthAddress,
      ephemeralPubKeyBytes,
      viewHint,
      k,
      amountToBridge,
      relayerFee,
      axelarStealthBridge,
      gmpSymbol,
    ]
  );
  return modField(BigInt(ethers.keccak256(packed)));
}

export function getExtDataHashITS({
  destinationChain,
  stealthAddress,
  ephemeralPubKeyBytes,
  viewHint,
  k,
  amountToBridge,
  relayerFee,
  axelarStealthBridge,
  itsTokenId,
}) {
  const packed = ethers.solidityPacked(
    ["string", "address", "bytes", "bytes1", "uint32", "uint256", "uint256", "address", "bytes32"],
    [
      destinationChain,
      stealthAddress,
      ephemeralPubKeyBytes,
      viewHint,
      k,
      amountToBridge,
      relayerFee,
      axelarStealthBridge,
      itsTokenId,
    ]
  );
  return modField(BigInt(ethers.keccak256(packed)));
}

export async function fetchDepositLeaves({
  provider,
  pool,
  fromBlock = 0,
}) {
  const poolAddress = await pool.getAddress();
  const nextIndex = Number(await pool.nextIndex());
  const iface = pool.interface;
  const topic = iface.getEvent("Deposit").topicHash;

  const logs = await provider.getLogs({
    address: poolAddress,
    fromBlock,
    toBlock: "latest",
    topics: [topic],
  });

  const leaves = new Array(nextIndex).fill(0n);
  for (const l of logs) {
    const parsed = iface.parseLog(l);
    const leafIndex = Number(parsed.args.leafIndex);
    const commitment = BigInt(parsed.args.commitment);
    if (leafIndex < nextIndex) leaves[leafIndex] = commitment;
  }
  return {leaves, nextIndex};
}

export async function buildMerkleProof({
  provider,
  pool,
  commitment,
  fromBlock = 0,
}) {
  const hash2 = await buildMimcHash2();

  const {leaves} = await fetchDepositLeaves({provider, pool, fromBlock});

  const commitmentBig = BigInt(commitment);
  const leafIndex = leaves.findIndex((x) => x === commitmentBig);
  if (leafIndex < 0) throw new Error("Commitment not found in pool deposits (wrong note or fromBlock too high)");

  const zeros = [];
  zeros[0] = hash2(0n, 0n);
  for (let i = 1; i < TREE_LEVELS; i++) zeros[i] = hash2(zeros[i - 1], zeros[i - 1]);

  const pathElements = [];
  const pathIndices = [];

  let layer = leaves.slice();
  for (let level = 0; level < TREE_LEVELS; level++) {
    const isRight = (leafIndex >> level) & 1;
    const siblingIndex = (leafIndex >> level) ^ 1;
    const sibling = siblingIndex < layer.length ? layer[siblingIndex] : zeros[level];
    pathElements[level] = sibling;
    pathIndices[level] = isRight;

    const next = [];
    const size = Math.max(1, Math.ceil(layer.length / 2));
    for (let i = 0; i < size; i++) {
      const left = i * 2 < layer.length ? layer[i * 2] : zeros[level];
      const right = i * 2 + 1 < layer.length ? layer[i * 2 + 1] : zeros[level];
      next[i] = hash2(left, right);
    }
    layer = next;
  }

  const rootOffchain = layer[0];
  const rootOnchain = BigInt(await pool.getLastRoot());
  if (rootOffchain !== rootOnchain) {
    throw new Error("Merkle root mismatch (pool state changed during proof build?)");
  }

  return {
    root: rootOnchain,
    leafIndex,
    pathElements,
    pathIndices,
  };
}

export async function proveWithdraw({
  root,
  nullifierHash,
  extDataHash,
  nullifier,
  secret,
  pathElements,
  pathIndices,
  wasmUrl,
  zkeyUrl,
}) {
  const snarkjs = await import("snarkjs");

  const input = {
    root: root.toString(),
    nullifierHash: nullifierHash.toString(),
    extDataHash: extDataHash.toString(),
    nullifier: modField(BigInt(nullifier)).toString(),
    secret: modField(BigInt(secret)).toString(),
    pathElements: pathElements.map((x) => BigInt(x).toString()),
    pathIndices: pathIndices.map((x) => x.toString()),
  };

  const {proof, publicSignals} = await snarkjs.groth16.fullProve(input, wasmUrl, zkeyUrl);
  const callData = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
  const [a, b, c] = JSON.parse(`[${callData}]`);
  return {a, b, c, publicSignals};
}
