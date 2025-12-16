---
description: Verify and test the Mina Protocol Integration features
---

# Test Mina Protocol Integration

1. **Verify Environment**
   - Ensure the development server is running: `npm run dev`
   - You need the **Auro Wallet** extension installed in your browser.
   - Switch Auro Wallet to **Devnet** or **Mainnet** (Devnet recommended for testing).

2. **Open Mina Dashboard**
   - Navigate to [http://localhost:5173/mina](http://localhost:5173/mina).

3. **Test Wallet Connection**
   - Click **Connect Auro Wallet**.
   - Approve the connection request in the Auro popup.
   - **Verify**:
     - "Wallet Details" card appears.
     - Your address (B62...) is displayed correctly.
     - Your real balance (from chain) is shown.

4. **Test Balance Simulation (Optional)**
   - If you previously tested the Bridge, check if there is a green "+ Simulated (Bridge)" badge under the balance.
   - This verifies that local simulated state is working.

5. **Test Sending Transaction**
   - **Recipient**: Enter a validity Mina address (or paste your own).
   - **Amount**: Enter `0.1`.
   - **Memo**: Enter "Test Transaction".
   - Click **Send Transaction**.
   - **Verify**:
     - Auro Wallet popup opens to sign the transaction.
     - After signing, a success toast appears.
     - A link to "View on Explorer" (Minascan) is provided.

6. **Troubleshooting**
   - **"Wallet not found"**: Ensure the Auro extension is enabled and you refreshed the page.
   - **Transaction fails**: Check if you have enough gas fees on the selected network.
