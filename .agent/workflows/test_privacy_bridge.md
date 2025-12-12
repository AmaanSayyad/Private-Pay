---
description: Verify and test the Privacy Bridge functionality
---

# Test Privacy Bridge Flow

1. **Verify Backend/Frontend Status**
   - Ensure the development server is running: `npm run dev`
   - Check terminal output for `Local: http://localhost:5173/`

2. **Open Bridge Interface**
   - Navigate to [http://localhost:5173/bridge](http://localhost:5173/bridge) in Chrome.

3. **Test Flow: Aptos to Mina**
   - **Source**: Select `Aptos`.
   - **Dest**: Select `Mina`.
   - **Connect**: Connect Petra (Source) and Auro (Dest).
   - **Action**: Enter `10` -> Click "Bridge Assets".
   - **Verify**:
     - Check Aptos Explorer for the lock transaction.
     - Wait for "Verifying Proof".
     - Click "Simulate Claim".
     - Check `Mina Wallet` balance on the UI (should show `+10 Simulated`).

4. **Test PoC: Zcash to Mina**
   - Navigate to [http://localhost:5173/zcash-mina-bridge](http://localhost:5173/zcash-mina-bridge).
   - Click "Initialize Bridge PoC".
   - Follow prompts: Lock -> Generate Proof -> Verify.
   - Confirm "Bridge Successful" message.

5. **Troubleshooting**
   - If balance doesn't update, check Console for `MinaProvider` logs.
   - Run `npm install` if dependencies are missing.
