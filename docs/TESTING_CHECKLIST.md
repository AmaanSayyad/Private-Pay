# Axelar Integration - Testing Checklist

**Before Production Deployment**

This checklist ensures all fixes and improvements are properly tested before mainnet deployment.

---

## ✅ PRE-DEPLOYMENT CHECKLIST

### 🔴 CRITICAL TESTS (Must Pass)

#### 1. Gateway Address Verification
- [ ] **Arbitrum Sepolia**: Verify transactions succeed with new gateway address
  - Test address: `0xe1cE95479C84e9809269227C7F8524aE051Ae77a`
  - Send small test transaction (0.01 aUSDC)
  - Confirm on [Arbiscan Sepolia](https://sepolia.arbiscan.io)

#### 2. Token Validation
- [ ] **Valid Token**: Test with aUSDC (should succeed)
- [ ] **Invalid Token**: Test with unsupported token (should fail with clear error)
- [ ] **Zero Address**: Verify runtime check catches invalid tokens

#### 3. Cross-Chain Payment Flow
- [ ] **Ethereum → Base**: Same gateway, lowest risk
  - Amount: 1 aUSDC
  - Expected time: 15-30 minutes
  - Verify on [Axelarscan Testnet](https://testnet.axelarscan.io)

- [ ] **Ethereum → Avalanche**: Different gateway, medium risk
  - Amount: 1 aUSDC
  - Expected time: 15-30 minutes
  - Check token address differs between chains

- [ ] **Arbitrum → Optimism**: L2 to L2 (tests L1 fee calculation)
  - Amount: 1 aUSDC
  - Expected time: 20-40 minutes
  - Verify L1 data posting fees included

#### 4. Error Message Testing
- [ ] **Insufficient Balance**:
  - Try to send more than wallet balance
  - Expected: `"Insufficient aUSDC balance. Required: X, Available: Y"`

- [ ] **Insufficient Gas**:
  - Send with very low gas (0.0001 ETH)
  - Expected: `"NOT ENOUGH GAS - Insufficient gas for executing the transaction"`

- [ ] **Unsupported Token**:
  - Try to send token not on gateway
  - Expected: `"Token WXYZ is not supported on [Chain]. Please select a different token..."`

---

### 🟡 HIGH PRIORITY TESTS (Should Pass)

#### 5. Gas Recovery Function
- [ ] **Simulate Stuck Transaction**:
  1. Send transaction with insufficient gas
  2. Wait for "insufficient_fee" status
  3. Call `addNativeGas()` with additional gas
  4. Verify transaction completes

```javascript
await addNativeGas({
  txHash: "0xSTUCK_TX_HASH",
  logIndex: 0,
  chainKey: "ethereum",
  signer: yourSigner,
  additionalGas: ethers.parseEther("0.01")
});
```

#### 6. Transaction Status Tracking
- [ ] **Successful Transaction**: Status progresses to "executed"
- [ ] **Failed Transaction**: Error message matches official patterns
- [ ] **Insufficient Gas**: Correctly identifies and suggests recovery

#### 7. Balance Display
- [ ] **Sufficient Balance**: Shows available balance correctly
- [ ] **Insufficient Balance**: Shows both required and available amounts

---

### 🟢 NICE TO HAVE TESTS (Optional)

#### 8. Express Service (Optional Premium Feature)
- [ ] **Estimate Express Gas**:
```javascript
const regularGas = await estimateCrossChainGas({
  sourceChain: "ethereum",
  destinationChain: "base",
  express: false
});

const expressGas = await estimateCrossChainGas({
  sourceChain: "ethereum",
  destinationChain: "base",
  express: true
});

console.log("Express premium:", expressGas - regularGas);
```

- [ ] **Compare Execution Times**:
  - Regular: ~15-30 minutes
  - Express: ~5-15 minutes (expected)

#### 9. Supported Chains Verification
- [ ] **Ethereum Sepolia**: ✅ Available
- [ ] **Avalanche Fuji**: ✅ Available
- [ ] **Arbitrum Sepolia**: ✅ Available (newly fixed)
- [ ] **Optimism Sepolia**: ✅ Available
- [ ] **Base Sepolia**: ✅ Available
- [ ] **Blast Sepolia**: ✅ Available
- [ ] **Fantom Testnet**: ✅ Available
- [ ] **Scroll Sepolia**: ✅ Available
- [ ] **Polygon Amoy**: ❌ Should NOT appear (unsupported)

---

## 🧪 TEST SCENARIOS

### Scenario 1: Normal Cross-Chain Payment
**Goal**: Verify basic functionality works end-to-end

**Steps**:
1. Connect MetaMask to Ethereum Sepolia
2. Select Base Sepolia as destination
3. Enter recipient address or generate stealth address
4. Select aUSDC token
5. Enter amount: 1 aUSDC
6. Review gas estimate
7. Confirm transaction
8. Monitor status until "Completed"

**Expected Result**:
- Transaction confirmed on source chain
- Status shows "Bridging"
- After 15-30 mins, status shows "Complete"
- Funds received on destination chain

---

### Scenario 2: Insufficient Gas Recovery
**Goal**: Verify gas recovery function works

**Steps**:
1. Send payment with deliberately low gas (0.0001 ETH)
2. Wait for transaction to show "insufficient_fee" status
3. Note the transaction hash
4. Call `addNativeGas()` with proper gas amount
5. Monitor transaction status

**Expected Result**:
- Initial transaction fails with "NOT ENOUGH GAS" message
- After adding gas, transaction completes successfully

---

### Scenario 3: Error Handling
**Goal**: Verify all error messages are clear and actionable

**Tests**:

| Test | Action | Expected Error |
|------|--------|----------------|
| Invalid Token | Select unsupported token | `"Token X is not supported on [Chain]..."` |
| Low Balance | Send more than available | `"Insufficient balance. Required: X, Available: Y"` |
| Rejected TX | Decline in MetaMask | `"Transaction rejected by user"` |
| Network Error | Disconnect during TX | Retry suggestion with clear message |

---

## 📊 VERIFICATION TOOLS

### Chain Explorers
- **Ethereum Sepolia**: https://sepolia.etherscan.io
- **Arbitrum Sepolia**: https://sepolia.arbiscan.io
- **Avalanche Fuji**: https://testnet.snowtrace.io
- **Base Sepolia**: https://sepolia.basescan.org
- **Optimism Sepolia**: https://sepolia-optimism.etherscan.io

### Axelar Tools
- **Axelarscan Testnet**: https://testnet.axelarscan.io
- **GMP Tracker**: https://testnet.axelarscan.io/gmp/{TX_HASH}

### Contract Verification
- **Gateway Addresses**: [testnet.json](https://github.com/axelarnetwork/axelar-contract-deployments/blob/main/axelar-chains-config/info/testnet.json)
- **Token Addresses**: Check via `gateway.tokenAddresses("aUSDC")`

---

## 🔍 DEBUGGING CHECKLIST

If a test fails:

1. **Check Gateway Address**
   ```javascript
   console.log(AXELAR_CHAINS[chainKey].gateway);
   // Compare with official testnet.json
   ```

2. **Verify Token Support**
   ```javascript
   const tokenAddress = await gateway.tokenAddresses("aUSDC");
   console.log(tokenAddress); // Should NOT be 0x0000...
   ```

3. **Check Gas Estimate**
   ```javascript
   const gas = await estimateCrossChainGas({...});
   console.log(ethers.formatEther(gas)); // Should be > 0.001 ETH typically
   ```

4. **Monitor Axelarscan**
   - Go to: https://testnet.axelarscan.io/gmp/{TX_HASH}
   - Check status progression
   - Look for error messages

5. **Check Console Logs**
   - Look for "Token X verified at 0x..." confirmation
   - Check for warning messages
   - Verify gas calculation logs

---

## 🚦 TEST RESULTS TEMPLATE

Copy and fill out:

```markdown
## Test Results - [Date]

### Environment
- Network: Testnet
- Wallet: [Address]
- Browser: [Chrome/Firefox/Safari]

### Critical Tests
- [ ] Arbitrum Gateway: PASS / FAIL
- [ ] Token Validation: PASS / FAIL
- [ ] ETH → Base Payment: PASS / FAIL
- [ ] ETH → AVAX Payment: PASS / FAIL
- [ ] ARB → OP Payment: PASS / FAIL
- [ ] Error Messages: PASS / FAIL

### High Priority Tests
- [ ] Gas Recovery: PASS / FAIL / SKIPPED
- [ ] Status Tracking: PASS / FAIL
- [ ] Balance Display: PASS / FAIL

### Issues Found
1. [Description of any issues]
2. [Include error messages and screenshots]

### Notes
[Any additional observations]
```

---

## ✅ SIGN-OFF

Before deploying to mainnet:

- [ ] All critical tests passed
- [ ] All error messages verified
- [ ] Gas recovery function tested
- [ ] Documentation reviewed
- [ ] Code reviewed by second developer
- [ ] Security audit completed (if required)

**Signed off by**: _______________
**Date**: _______________

---

## 📞 SUPPORT

If tests fail or you encounter issues:

1. Check [Axelar Discord](https://discord.gg/axelar) #testnet-support channel
2. Review [Official Docs](https://docs.axelar.dev)
3. Check [GitHub Issues](https://github.com/axelarnetwork/axelar-gmp-sdk-solidity/issues)
4. Refer to `AXELAR_FIXES_AND_IMPROVEMENTS.md` for implementation details

---

**Last Updated**: December 16, 2025
