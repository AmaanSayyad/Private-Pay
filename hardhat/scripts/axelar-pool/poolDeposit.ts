import {ethers, network} from "hardhat";
import * as fs from "fs";
import * as path from "path";

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
  if (!dep?.pool || !dep?.token) throw new Error(`No pool deployment for ${networkName}`);

  const poolAddress = dep.pool as string;
  const tokenAddress = dep.token as string;

  const [user] = await ethers.getSigners();
  console.log(`\nPool deposit on ${networkName}`);
  console.log(`User: ${user.address}`);
  console.log(`Pool: ${poolAddress}`);
  console.log(`Token: ${tokenAddress}`);

  const {buildMimcSponge} = require("circomlibjs");
  const mimc = await buildMimcSponge();
  const F = mimc.F;
  const hash2 = (a: bigint, b: bigint): bigint =>
    BigInt(F.toObject(mimc.hash(a, b, 0).xL) as unknown as bigint);

  // Generate a note (nullifier + secret)
  const crypto = await import("crypto");
  const nullifier = BigInt("0x" + crypto.randomBytes(31).toString("hex"));
  const secret = BigInt("0x" + crypto.randomBytes(31).toString("hex"));
  const commitment = hash2(nullifier, secret);

  const note = {
    nullifier: nullifier.toString(),
    secret: secret.toString(),
    commitment: commitment.toString(),
    network: networkName,
    pool: poolAddress,
    createdAt: new Date().toISOString(),
  };

  const noteOut = getOptionalEnv("AXELAR_NOTE_OUT") || `axelar-note-${networkName}-${Date.now()}.json`;
  fs.writeFileSync(noteOut, JSON.stringify(note, null, 2));
  console.log(`\nSaved note: ${noteOut}`);
  console.log(`Commitment: ${commitment.toString()}`);

  const tokenAbi = [
    "function approve(address spender,uint256 amount) returns (bool)",
    "function allowance(address owner,address spender) view returns (uint256)",
  ];
  const poolAbi = [
    "function denomination() view returns (uint256)",
    "function deposit(uint256 commitment) external",
    "event Deposit(uint256 indexed commitment, uint32 leafIndex, uint256 timestamp)",
  ];

  const token = new ethers.Contract(tokenAddress, tokenAbi, user);
  const pool = new ethers.Contract(poolAddress, poolAbi, user);
  const denomination: bigint = BigInt(await pool.denomination());

  const allowance: bigint = BigInt(await token.allowance(user.address, poolAddress));
  if (allowance < denomination) {
    console.log("Approving pool...");
    const txA = await token.approve(poolAddress, denomination);
    await txA.wait();
  }

  console.log("Depositing...");
  const tx = await pool.deposit(commitment);
  const receipt = await tx.wait();
  const evt = receipt.logs
    .map((l: any) => {
      try {
        return pool.interface.parseLog(l);
      } catch {
        return null;
      }
    })
    .find((x: any) => x && x.name === "Deposit");

  if (evt) console.log(`Leaf index: ${evt.args.leafIndex.toString()}`);
  console.log(`Tx: ${receipt.hash}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

