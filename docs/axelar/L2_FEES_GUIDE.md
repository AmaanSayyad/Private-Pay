# L2 Fee Handling for Axelar Cross-Chain Transfers

## Overview

When sending cross-chain transactions to L2 networks (Arbitrum, Optimism, Base), additional fees are incurred for posting transaction data back to the L1 chain. This guide explains how these fees are handled in our implementation.

## L2 Chains Supported

| Chain            | Chain ID | L1 Posting Fee |
| ---------------- | -------- | -------------- |
| Arbitrum Sepolia | 421614   | ✅ Yes         |
| Optimism Sepolia | 11155420 | ✅ Yes         |
| Base Sepolia     | 84532    | ✅ Yes         |

## Fee Breakdown

The total gas fee for L2 destinations consists of:

1. **Base Fee** - Axelar network fee
2. **Execution Fee** - Gas for contract execution on L2
3. **L1 Data Posting Fee** - Cost to post calldata to Ethereum L1

```
Total Fee = Base Fee + Execution Fee + L1 Posting Fee
```

## Implementation Details

### 1. Automatic L1 Fee Calculation

Our gas estimation automatically includes L1 fees for L2 chains:

```javascript
// src/lib/axelar/index.js
if (isL2Chain(destinationChain) && executeData) {
  requestBody.executeData = executeData;
}
```

The `isL2Chain` function checks if the destination is an L2:

```javascript
function isL2Chain(chainKey) {
  return ["arbitrum", "optimism", "base"].includes(chainKey);
}
```

### 2. ExecuteData Parameter

For accurate L1 fee calculation, we pass the actual calldata that will be executed:

```javascript
// Encode the payload before gas estimation
const payload = ethers.AbiCoder.defaultAbiCoder().encode(
  ["address", "bytes", "bytes1", "uint32"],
  [stealthAddress, ephemeralPubKeyBytes, viewHintByte, k]
);

// Include in gas estimation
const gasEstimate = await estimateCrossChainGas({
  sourceChain,
  destinationChain,
  gasLimit: 350000,
  executeData: payload, // Critical for L2 accuracy
});
```

### 3. API Response Handling

The Axelar API returns a detailed fee breakdown for L2 chains:

```javascript
// Handle detailed response with L1 fee
if (data && data.baseFee && data.executionFeeWithMultiplier) {
  const baseFee = BigInt(data.baseFee);
  const executionFee = BigInt(data.executionFeeWithMultiplier);
  // L1 fee automatically included for L2 destinations
  const l1Fee = data.l1ExecutionFeeWithMultiplier
    ? BigInt(data.l1ExecutionFeeWithMultiplier)
    : 0n;
  return (baseFee + executionFee + l1Fee).toString();
}
```

## Cost Examples (Testnet)

| Source → Destination | Typical Gas Fee | L1 Portion |
| -------------------- | --------------- | ---------- |
| Ethereum → Polygon   | 0.001 ETH       | 0%         |
| Ethereum → Arbitrum  | 0.0025 ETH      | ~40%       |
| Ethereum → Optimism  | 0.0023 ETH      | ~35%       |
| Ethereum → Base      | 0.0022 ETH      | ~33%       |

_Values are estimates and vary with network congestion_

## Best Practices

### 1. Always Include ExecuteData for L2s

```javascript
// ✅ Correct - includes executeData for L2 chains
const gasEstimate = await estimateCrossChainGas({
  sourceChain: "ethereum",
  destinationChain: "arbitrum",
  gasLimit: 350000,
  executeData: payload, // Required!
});

// ❌ Incorrect - missing executeData
const gasEstimate = await estimateCrossChainGas({
  sourceChain: "ethereum",
  destinationChain: "arbitrum",
  gasLimit: 350000,
  // Missing executeData - will underestimate!
});
```

### 2. Use Higher Gas Multiplier for L2s

```javascript
// L2 chains benefit from higher multiplier due to L1 volatility
const multiplier = isL2Chain(destinationChain) ? 1.2 : 1.1;
```

### 3. Display Fee Breakdown to Users

```javascript
// Show users why L2 transfers cost more
if (isL2Chain(destinationChain)) {
  showFeeBreakdown({
    execution: "Gas for L2 execution",
    l1Posting: "Fee to post data to Ethereum L1",
    total: "Combined fee",
  });
}
```

## Monitoring L1 Fees

### 1. Track L1 Gas Price

L1 fees are proportional to Ethereum's gas price. Monitor via:

```javascript
const provider = new ethers.JsonRpcProvider(
  "https://eth-sepolia.g.alchemy.com/v2"
);
const gasPrice = await provider.getFeeData();
```

### 2. Fee Estimation API

The latest gas price is included in the API response:

```javascript
{
  "baseFee": "1000000000000000",
  "executionFeeWithMultiplier": "1500000000000000",
  "l1ExecutionFeeWithMultiplier": "1000000000000000",
  "l1GasPrice": "20000000000" // Current L1 gas price
}
```

## Troubleshooting

### "Insufficient Gas" Error on L2

If transactions to L2 chains fail with insufficient gas:

1. **Check executeData is included**: Without it, L1 fees aren't calculated
2. **Increase gas multiplier**: L1 gas prices can be volatile
3. **Verify L1 gas price**: During high congestion, fees spike

### Example Fix:

```javascript
// Before: insufficient gas
const gasEstimate = await estimateCrossChainGas({
  sourceChain: "ethereum",
  destinationChain: "arbitrum",
  gasLimit: 350000,
  executeData: payload,
});

// After: add buffer for L1 volatility
const gasEstimate = await estimateCrossChainGas({
  sourceChain: "ethereum",
  destinationChain: "arbitrum",
  gasLimit: 350000,
  gasMultiplier: 1.3, // Increased from 1.1
  executeData: payload,
});
```

## Future Enhancements

### 1. Dynamic Fee Adjustment

Automatically adjust multiplier based on L1 gas price:

```javascript
const l1GasPrice = await getL1GasPrice();
const multiplier = l1GasPrice > HIGH_GAS_THRESHOLD ? 1.5 : 1.2;
```

### 2. Fee Optimization

Batch multiple payments to share L1 posting costs:

```javascript
// Single L1 posting fee for multiple recipients
const batchPayload = encodeBatchPayments(recipients);
```

### 3. Express Service

For time-sensitive transfers, use Axelar Express:

- Higher fee (~2x)
- Faster execution (~1-2 minutes)
- Same L1 fee calculation applies

## References

- [Axelar Gas Service Docs](https://docs.axelar.dev/dev/gas-service/pay-gas/)
- [L1 Fee Calculation](https://docs.axelar.dev/dev/gas-service/pay-gas/#gas-pricing)
- [Gas Estimation API](https://docs.axelar.dev/dev/axelarjs-sdk/axelar-query-api)
