import {ethers, network} from "hardhat";
import * as fs from "fs";
import * as path from "path";

const SNARK_FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;
const TREE_LEVELS = 20;

function modField(x: bigint): bigint {
  const r = x % SNARK_FIELD;
  return r >= 0n ? r : r + SNARK_FIELD;
}

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function getOptionalEnv(name: string): string | undefined {
  const v = process.env[name];
  return v && v.length > 0 ? v : undefined;
}

async function main() {
  const networkName = network.name;
  const deploymentsPath = path.join(__dirname, "../../deployments/axelar-pool.json");
  if (!fs.existsSync(deploymentsPath)) throw new Error("deployments/axelar-pool.json not found");
  const deployments = JSON.parse(fs.readFileSync(deploymentsPath, "utf8"));
  const dep = deployments?.[networkName];
  if (!dep?.pool) throw new Error(`No pool deployment for ${networkName}`);

  const poolAddress = dep.pool as string;
  const bridgeAddress = dep.bridge as string;
  const mode = dep.mode as "ITS" | "GMP";
  const itsTokenId = dep.itsTokenId as string;
  const gmpSymbol = dep.gmpSymbol as string;

  const notePath = getEnv("AXELAR_NOTE_PATH");
  const note = JSON.parse(fs.readFileSync(notePath, "utf8"));
  const nullifier = BigInt(note.nullifier);
  const secret = BigInt(note.secret);

  const destinationChain = getEnv("AXELAR_DESTINATION_CHAIN"); // e.g. "polygon-sepolia"
  const stealthAddress = getEnv("AXELAR_STEALTH_ADDRESS"); // 0x...
  const ephemeralPubKeyHex = getEnv("AXELAR_EPHEMERAL_PUBKEY"); // 0x + 33 bytes
  const viewHint = getEnv("AXELAR_VIEW_HINT"); // 0x?? (bytes1)
  const k = Number(getEnv("AXELAR_K"));
  const relayerFeeHuman = getEnv("AXELAR_RELAYER_FEE"); // human units (same decimals as token)
  const gasValueWei = BigInt(getOptionalEnv("AXELAR_GAS_VALUE_WEI") || "0");

  const snarkjs = require("snarkjs");
  const {buildMimcSponge} = require("circomlibjs");
  const mimc = await buildMimcSponge();
  const F = mimc.F;
  const hash2 = (a: bigint, b: bigint): bigint =>
    BigInt(F.toObject(mimc.hash(a, b, 0).xL) as unknown as bigint);

  // Load deposits and build the Merkle tree
  const poolAbi = [
    "function nextIndex() view returns (uint32)",
    "function getLastRoot() view returns (uint256)",
    "function denomination() view returns (uint256)",
    "event Deposit(uint256 indexed commitment, uint32 leafIndex, uint256 timestamp)",
  ];
  const pool = new ethers.Contract(poolAddress, poolAbi, ethers.provider);

  const denomination = BigInt(await pool.denomination());

  const tokenAbi = ["function decimals() view returns (uint8)"];
  const token = new ethers.Contract(dep.token as string, tokenAbi, ethers.provider);
  const decimals = await token.decimals();
  const relayerFee = BigInt(ethers.parseUnits(relayerFeeHuman, decimals));
  if (relayerFee > denomination) throw new Error("relayerFee > denomination");
  const amountToBridge = denomination - relayerFee;

  const commitment = hash2(modField(nullifier), modField(secret));
  const nullifierHash = hash2(modField(nullifier), 0n);

  const latest = await pool.getLastRoot();
  const rootOnchain = BigInt(latest);

  const nextIndex = Number(await pool.nextIndex());
  const fromBlock = Number(getOptionalEnv("AXELAR_DEPOSIT_FROM_BLOCK") || "0");
  const logs = await ethers.provider.getLogs({
    address: poolAddress,
    fromBlock,
    toBlock: "latest",
    topics: [pool.interface.getEvent("Deposit").topicHash],
  });

  const leaves: bigint[] = new Array(nextIndex).fill(0n);
  for (const l of logs) {
    const parsed = pool.interface.parseLog(l);
    const leafIndex = Number(parsed.args.leafIndex);
    const c = BigInt(parsed.args.commitment);
    if (leafIndex < nextIndex) leaves[leafIndex] = c;
  }

  const zeros: bigint[] = [];
  zeros[0] = hash2(0n, 0n);
  for (let i = 1; i < TREE_LEVELS; i++) zeros[i] = hash2(zeros[i - 1], zeros[i - 1]);

  const leafIndex = leaves.findIndex((x) => x === commitment);
  if (leafIndex < 0) throw new Error("Commitment not found in on-chain deposits (check note/pool)");

  const pathElements: bigint[] = [];
  const pathIndices: number[] = [];

  // Build tree layers iteratively to compute sibling hashes
  let layer: bigint[] = leaves.slice();
  for (let level = 0; level < TREE_LEVELS; level++) {
    const isRight = (leafIndex >> level) & 1;
    const siblingIndex = (leafIndex >> level) ^ 1;
    const sib = siblingIndex < layer.length ? layer[siblingIndex] : zeros[level];
    pathElements[level] = sib;
    pathIndices[level] = isRight;

    const next: bigint[] = [];
    const size = Math.max(1, Math.ceil(layer.length / 2));
    for (let i = 0; i < size; i++) {
      const left = i * 2 < layer.length ? layer[i * 2] : zeros[level];
      const right = i * 2 + 1 < layer.length ? layer[i * 2 + 1] : zeros[level];
      next[i] = hash2(left, right);
    }
    layer = next;
  }
  const rootOffchain = layer[0];
  if (rootOffchain !== rootOnchain) {
    throw new Error(`Root mismatch. offchain=${rootOffchain.toString()} onchain=${rootOnchain.toString()}`);
  }

  // extDataHash must match the pool's on-chain abi.encodePacked scheme
  const packed = mode === "ITS"
    ? ethers.solidityPacked(
        ["string", "address", "bytes", "bytes1", "uint32", "uint256", "uint256", "address", "bytes32"],
        [
          destinationChain,
          stealthAddress,
          ephemeralPubKeyHex,
          viewHint,
          k,
          amountToBridge,
          relayerFee,
          bridgeAddress,
          itsTokenId,
        ]
      )
    : ethers.solidityPacked(
        ["string", "address", "bytes", "bytes1", "uint32", "uint256", "uint256", "address", "string"],
        [
          destinationChain,
          stealthAddress,
          ephemeralPubKeyHex,
          viewHint,
          k,
          amountToBridge,
          relayerFee,
          bridgeAddress,
          gmpSymbol,
        ]
      );
  const extDataHash = modField(BigInt(ethers.keccak256(packed)));

  const wasmPath =
    getOptionalEnv("AXELAR_ZK_WASM") ||
    path.resolve(__dirname, "../../circuits/axelar-pool/build/WithdrawAndBridge_js/WithdrawAndBridge.wasm");
  const zkeyPath =
    getOptionalEnv("AXELAR_ZK_ZKEY") ||
    path.resolve(__dirname, "../../circuits/axelar-pool/build/WithdrawAndBridge_final.zkey");

  console.log(`\nProving using:`);
  console.log(`- wasm: ${wasmPath}`);
  console.log(`- zkey: ${zkeyPath}`);
  console.log(`Pool: ${poolAddress}`);
  console.log(`Mode: ${mode}`);
  console.log(`Leaf index: ${leafIndex}`);

  const input = {
    root: rootOnchain.toString(),
    nullifierHash: nullifierHash.toString(),
    extDataHash: extDataHash.toString(),
    nullifier: modField(nullifier).toString(),
    secret: modField(secret).toString(),
    pathElements: pathElements.map((x) => x.toString()),
    pathIndices: pathIndices.map((x) => x.toString()),
  };

  const {proof, publicSignals} = await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath);
  const callData = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
  const [a, b, c, inputs] = JSON.parse(`[${callData}]`);

  // Relay tx
  const [relayer] = await ethers.getSigners();
  const poolWrite = await ethers.getContractAt("AxelarPrivacyPool", poolAddress, relayer);

  const fn = mode === "ITS" ? "withdrawAndBridgeITS" : "withdrawAndBridgeGMP";
  console.log(`\nRelaying ${fn}...`);

  const tx = await (poolWrite as any)[fn](
    rootOnchain,
    nullifierHash,
    relayerFee,
    destinationChain,
    stealthAddress,
    ethers.getBytes(ephemeralPubKeyHex),
    viewHint,
    k,
    a,
    b,
    c,
    {value: gasValueWei}
  );
  const receipt = await tx.wait();
  console.log(`Tx: ${receipt.hash}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

