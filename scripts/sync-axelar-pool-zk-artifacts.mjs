import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = process.cwd();

const srcDir = path.join(repoRoot, "hardhat", "circuits", "axelar-pool", "build");
const dstDir = path.join(repoRoot, "public", "zk", "axelar-pool");

const files = [
  {
    from: path.join(srcDir, "WithdrawAndBridge_js", "WithdrawAndBridge.wasm"),
    to: path.join(dstDir, "WithdrawAndBridge.wasm"),
  },
  {
    from: path.join(srcDir, "WithdrawAndBridge_final.zkey"),
    to: path.join(dstDir, "WithdrawAndBridge_final.zkey"),
  },
];

async function main() {
  await fs.mkdir(dstDir, {recursive: true});

  for (const f of files) {
    await fs.copyFile(f.from, f.to);
    const stat = await fs.stat(f.to);
    console.log(`Copied ${path.relative(repoRoot, f.to)} (${stat.size} bytes)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
