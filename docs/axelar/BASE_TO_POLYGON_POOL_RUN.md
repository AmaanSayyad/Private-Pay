# Base → Polygon Privacy Pool Run (Dec 2025)

This doc captures exactly what we executed in the Dec 2025 session to validate the anonymity-set Axelar path and to wire it into the `/cross-chain` page.

## 1. Smart-Contract + Hardhat Runbook

1. **Switched pool to ITS mode** so we can mint/manage liquidity (TUSDC):
   - Env (temporary when running the script):
     ```bash
     AXELAR_POOL_MODE=ITS
     AXELAR_POOL_DENOMINATION=10
     AXELAR_ITS_TOKEN_MANAGER=0x1e2f2E68ea65212Ec6F3D91f39E6B644fE41e29B
     AXELAR_BRIDGE_ADDRESS=0x955a7a85B346b0d49E3BC451774DdcDb11805788
     ```
   - Command: `npx hardhat run scripts/axelar-pool/deployAxelarPrivacyPool.ts --network base-sepolia`
   - New deployment written to `hardhat/deployments/axelar-pool.json`:
     | Item | Address |
     |------|---------|
     | Pool | `0xc303c1329AF68C2cED80464AE9f84BB4D8B8a93d` |
     | Hasher | `0x5E3b1Ae2C3ec081759A4A335870030eBB0C16003` |
     | Verifier | `0xf88a43A873Bd9e56CC25Fc960464bBc2321f3e7a` |
     | Bridge | `0x955a7a85B346b0d49E3BC451774DdcDb11805788` |
     | Mode | `ITS`, symbol `TUSDC`, tokenId `0x8bb6…12bf`, denomination `10` |

2. **Deposited a note** (wallet `0xD25a…Fe3B` already had TUSDC):
   - `npx hardhat run scripts/axelar-pool/poolDeposit.ts --network base-sepolia`
   - Output note file `axelar-note-base-sepolia-1766137509930.json`
   - Tx hash `0x93780365e699da390a7cb2106ca423f2b64ce0bc6fd5562e269d32d652dbdf3d` (block `35184615`)

3. **Withdrew + bridged to Polygon Sepolia** (stealth recipient set to the same wallet for verification):
   ```bash
   AXELAR_NOTE_PATH=axelar-note-base-sepolia-1766137509930.json \
   AXELAR_DESTINATION_CHAIN=polygon-sepolia \
   AXELAR_STEALTH_ADDRESS=0xD25a9d413285Ed8963C46397c6f36C844330Fe3B \
   AXELAR_EPHEMERAL_PUBKEY=0x021111111111111111111111111111111111111111111111111111111111111111 \
   AXELAR_VIEW_HINT=0x11 \
   AXELAR_K=0 \
   AXELAR_RELAYER_FEE=0 \
   AXELAR_GAS_VALUE_WEI=2000000000000000 \
   AXELAR_DEPOSIT_FROM_BLOCK=35184000 \
   npx hardhat run scripts/axelar-pool/poolWithdrawAndBridge.ts --network base-sepolia
   ```
   - Tx hash `0x1c2e6356f64d1b5bb8758ee8ace6dde325ed3304093f1d9ba516d7fd47d2d011` (block `35184650`).
   - Gas refund tx `0x1cba77b4cbb1d46612babff96100ddb91ec8102bb7c2d452519cc55f4fb43876`.
   - Axelar status: https://testnet.axelarscan.io/gmp/0x1c2e6356f64d1b5bb8758ee8ace6dde325ed3304093f1d9ba516d7fd47d2d011 shows the message as **executed** (child message `0x05c710c68c73cd9c642d0c88e9790c132e41f46a53380319fa55bd5d05d4141e-333025914`).

## 2. Frontend Wiring ( `/cross-chain` )

- Added route detection (`sourceChain === "base" && destinationChain === "polygon"`) and a transfer-mode toggle. Base→Polygon now defaults to **Privacy Pool** mode.
- When privacy mode is active:
  - The standard “Send” button is disabled with a toast prompting the user to use the pool controls.
  - A new UI block renders the privacy-pool card (`AxelarPrivacyPoolPanel`) with context copy and a manual toggle back to “Direct Bridge.”
  - Token selection is fixed to `TUSDC` (pool uses ITS `TUSDC`), and the dropdown is disabled in pool mode.
- Other routes retain the original direct Axelar flow.

### 2.1 Receive-Tab Scan Fix (Smart + Fast)

We fixed the “scan forever / eth_getLogs max block range” issue by making stealth-payment scanning incremental and bounded:

- `scanStealthPayments` now:
  - **Resumes from a localStorage checkpoint** per `(chainId, bridgeAddress, viewingKey fingerprint)`.
  - **Falls back to contract deployment block** (best-effort) and caches it, if the RPC supports historical `eth_getCode`.
  - **Falls back to a bounded lookback window** (default `90_000` blocks) to avoid RPC max-range errors.
  - **Auto-reduces chunk size** when the RPC returns “query exceeds max block range …”.
- `/cross-chain` Receive tab now prefers a dedicated `JsonRpcProvider` (from `AXELAR_CHAINS[*].rpcUrl`) for scanning logs, since wallet providers commonly enforce stricter log limits.

Optional env vars:

- `VITE_AXELAR_STEALTH_SCAN_LOOKBACK_BLOCKS=90000`
- `VITE_AXELAR_STEALTH_SCAN_REORG_SAFETY_BLOCKS=20`

## 3. Build Status

`npm run build` currently fails on this machine with Node 25 due to heap exhaustion while bundling (see stack trace in terminal output: “Allocation failed - JavaScript heap out of memory”). Re-run with an LTS Node + higher `--max-old-space-size` to produce production assets.

## 4. Outstanding Follow-Ups

- Expose the new pool address & WASM/ZKey paths via env (`VITE_AXELAR_PRIVACY_POOL_BASE_SEPOLIA`, `VITE_AXELAR_POOL_WASM_URL`, `VITE_AXELAR_POOL_ZKEY_URL`) so the UI points at the ITS pool by default.
- Stand up a relayer service so end users don’t need Hardhat to submit `withdrawAndBridgeITS`.
- Once the child message’s Polygon tx hash is available, add it here for auditing.
- Update Browserslist DB / adjust Node memory to unblock `npm run build` CI.
