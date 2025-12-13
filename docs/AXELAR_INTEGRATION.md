# Axelar Network Integration for PrivatePay

## 📚 Table of Contents

1. [What is Axelar Network?](#what-is-axelar-network)
2. [Why Integrate Axelar?](#why-integrate-axelar)
3. [How Axelar Works](#how-axelar-works)
4. [Integration Architecture](#integration-architecture)
5. [Implementation Plan](#implementation-plan)
6. [Smart Contract Implementation](#smart-contract-implementation)
7. [Frontend Integration](#frontend-integration)
8. [Use Cases for PrivatePay](#use-cases-for-privatepay)
9. [Security Considerations](#security-considerations)
10. [Roadmap & Milestones](#roadmap--milestones)

---

## What is Axelar Network?

**Axelar** is a decentralized interoperability network that connects all blockchains, enabling secure cross-chain communication and token transfers. It acts as a universal overlay network that provides:

- **General Message Passing (GMP)**: Send arbitrary data and function calls across chains
- **Interchain Token Service (ITS)**: Create and manage tokens across multiple chains
- **Cross-chain asset transfers**: Move tokens between 60+ supported chains

### Key Components

| Component            | Description                                                 |
| -------------------- | ----------------------------------------------------------- |
| **Gateway Contract** | Entry point on each chain for cross-chain calls             |
| **Gas Service**      | Handles gas payment for destination chain execution         |
| **Relayer Network**  | Decentralized validators that relay messages                |
| **Amplifier**        | Protocol for connecting non-EVM chains (Solana, Aptos, Sui) |

### Supported Chains (Relevant to PrivatePay)

| Chain          | Status           | Notes                                          |
| -------------- | ---------------- | ---------------------------------------------- |
| Ethereum       | ✅ Live          | Primary EVM support                            |
| Polygon        | ✅ Live          | Low-cost transactions                          |
| Avalanche      | ✅ Live          | Fast finality                                  |
| BNB Chain      | ✅ Live          | High throughput                                |
| Arbitrum       | ✅ Live          | L2 scaling                                     |
| Optimism       | ✅ Live          | L2 scaling                                     |
| Base           | ✅ Live          | Coinbase L2                                    |
| Oasis Sapphire | ✅ Live          | Confidential computing (already in PrivatePay) |
| Solana         | 🚧 Via Amplifier | Coming 2025                                    |
| Aptos          | 🚧 Via Amplifier | Move-based chains coming 2025                  |

---

## Why Integrate Axelar?

### 1. **Cross-Chain Privacy Payments**

Currently, PrivatePay works primarily on Aptos. With Axelar:

- Users can send **private payments from any chain** to any other chain
- Stealth addresses can be generated and used across all EVM chains
- The DarkPool mixer can accept funds from multiple chains

### 2. **Enhanced Privacy Through Chain Hopping**

- Funds can be **mixed across chains** before reaching the final destination
- Chain-hopping adds an extra layer of obfuscation
- Trackers cannot follow funds across different blockchain ecosystems

### 3. **Unified Stealth Address System**

- One meta-address works across all chains
- Users don't need separate setups for each blockchain
- Single dashboard for all cross-chain private payments

### 4. **Broader Market Access**

- Access users on Ethereum, Polygon, Arbitrum, etc.
- Support for multiple stablecoins (USDC, USDT, axlUSDC)
- Integration with major DeFi ecosystems

---

## How Axelar Works

### General Message Passing (GMP) Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         SOURCE CHAIN (e.g., Polygon)                      │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  1. User calls PrivatePay contract                                   │ │
│  │  2. Contract calls gateway.callContractWithToken()                   │ │
│  │  3. Gas paid to AxelarGasService                                     │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                           AXELAR NETWORK                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  4. Validators confirm the transaction                               │ │
│  │  5. Message is relayed to destination                                │ │
│  │  6. Tokens are minted/released on destination                        │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────┬─────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      DESTINATION CHAIN (e.g., Oasis)                      │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │  7. Gateway calls _executeWithToken() on destination contract        │ │
│  │  8. Stealth address receives funds                                   │ │
│  │  9. Event emitted for recipient detection                            │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

### Key Functions

```solidity
// Send message only
gateway.callContract(
    destinationChain,      // e.g., "oasis"
    destinationAddress,    // PrivatePay contract on destination
    payload                // Encoded stealth payment data
);

// Send message with tokens
gateway.callContractWithToken(
    destinationChain,
    destinationAddress,
    payload,
    symbol,                // e.g., "axlUSDC"
    amount
);
```

---

## Integration Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PRIVATEPAY FRONTEND                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ Chain Selector│  │Stealth Gen  │  │ Payment Form │  │  Dashboard   │    │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘    │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AXELAR INTEGRATION LAYER                           │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     AxelarStealthBridge.sol                           │   │
│  │  - sendCrossChainStealthPayment()                                     │   │
│  │  - _executeWithToken() - receive cross-chain payments                 │   │
│  │  - registerMetaAddress() - cross-chain meta address sync              │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                    │                                         │
│  ┌─────────────────┐  ┌───────────┴───────────┐  ┌─────────────────┐       │
│  │AxelarJS SDK     │  │  Axelar Gateway       │  │ Gas Service     │       │
│  │- Query API      │  │  - callContract       │  │ - estimateGas   │       │
│  │- Status Track   │  │  - callContractToken  │  │ - payGas        │       │
│  └─────────────────┘  └───────────────────────┘  └─────────────────┘       │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌───────────────┐      ┌───────────────┐      ┌───────────────┐
│   Ethereum    │      │   Polygon     │      │Oasis Sapphire │
│  StealthPay   │      │  StealthPay   │      │  StealthPay   │
│  Contract     │      │  Contract     │      │  (existing)   │
└───────────────┘      └───────────────┘      └───────────────┘
```

### Contract Deployment Architecture

```
                    ┌─────────────────────────────────────┐
                    │     AxelarStealthBridge.sol         │
                    │     (Deployed on ALL chains)        │
                    │                                     │
                    │  - Same address via CREATE2/CREATE3 │
                    │  - Inherits AxelarExecutable        │
                    │  - Integrates existing StealthSigner│
                    └─────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Ethereum       │      │  Polygon        │      │  Oasis          │
│  Gateway:       │      │  Gateway:       │      │  Gateway:       │
│  0x4F4495243... │      │  0x6f015F3F... │      │  0x9B36f165b... │
│                 │      │                 │      │                 │
│  ITS:           │      │  ITS:           │      │  ITS:           │
│  0xB5FB4BE02... │      │  0xB5FB4BE02... │      │  0xB5FB4BE02... │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

---

## Implementation Plan

### Phase 1: Core Infrastructure (Week 1-2)

#### Tasks:

- [ ] Deploy AxelarStealthBridge contract to testnet chains
- [ ] Integrate Axelar SDK into frontend
- [ ] Set up gas estimation and payment
- [ ] Create chain configuration system

#### Deliverables:

1. `AxelarStealthBridge.sol` - Main cross-chain contract
2. `src/lib/axelar/` - Frontend integration library
3. Updated chain configuration in `src/config.js`

### Phase 2: Cross-Chain Stealth Payments (Week 3-4)

#### Tasks:

- [ ] Implement cross-chain stealth address generation
- [ ] Build payment flow UI for multi-chain
- [ ] Integrate with existing DarkPool
- [ ] Add transaction status tracking

#### Deliverables:

1. Cross-chain payment page
2. Multi-chain stealth address scanner
3. Transaction status component

### Phase 3: Privacy Mixing (Week 5-6)

#### Tasks:

- [ ] Implement chain-hopping mixer
- [ ] Add delayed withdrawal support
- [ ] Build privacy score calculator
- [ ] Create mixing strategy selector

#### Deliverables:

1. Privacy mixer with chain-hopping
2. Advanced privacy settings UI
3. Privacy analytics dashboard

### Phase 4: Production & Mainnet (Week 7-8)

#### Tasks:

- [ ] Security audit preparation
- [ ] Mainnet deployment
- [ ] Monitoring and alerting setup
- [ ] Documentation and user guides

---

## Smart Contract Implementation

### AxelarStealthBridge.sol

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AxelarExecutable} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/executable/AxelarExecutable.sol";
import {IAxelarGateway} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGateway.sol";
import {IAxelarGasService} from "@axelar-network/axelar-gmp-sdk-solidity/contracts/interfaces/IAxelarGasService.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AxelarStealthBridge is AxelarExecutable {
    IAxelarGasService public immutable gasService;

    // Stealth payment data structure
    struct StealthPayment {
        address stealthAddress;
        bytes ephemeralPubKey;
        bytes1 viewHint;
        uint32 k;
    }

    // Meta address registry (synced across chains)
    mapping(address => bytes) public metaAddresses;

    // Events
    event CrossChainStealthPayment(
        string indexed destinationChain,
        address indexed sender,
        address stealthAddress,
        uint256 amount,
        string symbol
    );

    event StealthPaymentReceived(
        string indexed sourceChain,
        address stealthAddress,
        uint256 amount,
        bytes ephemeralPubKey,
        bytes1 viewHint
    );

    constructor(
        address gateway_,
        address gasService_
    ) AxelarExecutable(gateway_) {
        gasService = IAxelarGasService(gasService_);
    }

    /**
     * @notice Send a cross-chain stealth payment
     * @param destinationChain The name of the destination chain
     * @param destinationContract The address of the contract on destination
     * @param stealthAddress The generated stealth address
     * @param ephemeralPubKey The ephemeral public key for detection
     * @param viewHint The view hint for fast scanning
     * @param k The index used in stealth generation
     * @param symbol The token symbol (e.g., "axlUSDC")
     * @param amount The amount to send
     */
    function sendCrossChainStealthPayment(
        string calldata destinationChain,
        string calldata destinationContract,
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes1 viewHint,
        uint32 k,
        string calldata symbol,
        uint256 amount
    ) external payable {
        // Encode the stealth payment data
        bytes memory payload = abi.encode(
            StealthPayment({
                stealthAddress: stealthAddress,
                ephemeralPubKey: ephemeralPubKey,
                viewHint: viewHint,
                k: k
            })
        );

        // Get token address and transfer from sender
        address tokenAddress = gateway.tokenAddresses(symbol);
        IERC20(tokenAddress).transferFrom(msg.sender, address(this), amount);
        IERC20(tokenAddress).approve(address(gateway), amount);

        // Pay for gas on destination chain
        gasService.payNativeGasForContractCallWithToken{value: msg.value}(
            address(this),
            destinationChain,
            destinationContract,
            payload,
            symbol,
            amount,
            msg.sender
        );

        // Send cross-chain message with tokens
        gateway.callContractWithToken(
            destinationChain,
            destinationContract,
            payload,
            symbol,
            amount
        );

        emit CrossChainStealthPayment(
            destinationChain,
            msg.sender,
            stealthAddress,
            amount,
            symbol
        );
    }

    /**
     * @notice Called by Axelar when receiving a cross-chain payment
     */
    function _executeWithToken(
        string calldata sourceChain,
        string calldata,
        bytes calldata payload,
        string calldata,
        uint256 amount
    ) internal override {
        // Decode stealth payment data
        StealthPayment memory payment = abi.decode(payload, (StealthPayment));

        // Transfer tokens to the stealth address
        address tokenAddress = gateway.tokenAddresses(tokenSymbol);
        IERC20(tokenAddress).transfer(payment.stealthAddress, amount);

        // Emit event for recipient's scanner to detect
        emit StealthPaymentReceived(
            sourceChain,
            payment.stealthAddress,
            amount,
            payment.ephemeralPubKey,
            payment.viewHint
        );
    }

    /**
     * @notice Register meta address for cross-chain sync
     */
    function registerMetaAddress(bytes calldata metaAddress) external {
        metaAddresses[msg.sender] = metaAddress;
    }

    /**
     * @notice Sync meta address to another chain
     */
    function syncMetaAddress(
        string calldata destinationChain,
        string calldata destinationContract
    ) external payable {
        bytes memory payload = abi.encode(msg.sender, metaAddresses[msg.sender]);

        gasService.payNativeGasForContractCall{value: msg.value}(
            address(this),
            destinationChain,
            destinationContract,
            payload,
            msg.sender
        );

        gateway.callContract(destinationChain, destinationContract, payload);
    }

    /**
     * @notice Handle incoming meta address sync
     */
    function _execute(
        string calldata,
        string calldata,
        bytes calldata payload
    ) internal override {
        (address user, bytes memory metaAddress) = abi.decode(
            payload,
            (address, bytes)
        );
        metaAddresses[user] = metaAddress;
    }
}
```

### Package Dependencies

Add to `hardhat/package.json`:

```json
{
  "dependencies": {
    "@axelar-network/axelar-gmp-sdk-solidity": "^5.10.0",
    "@axelar-network/axelarjs-sdk": "^0.16.0"
  }
}
```

---

## Frontend Integration

### Axelar SDK Setup

Create `src/lib/axelar/index.js`:

```javascript
import {
  AxelarQueryAPI,
  Environment,
  EvmChain,
  GasToken,
} from "@axelar-network/axelarjs-sdk";

// Initialize Axelar Query API
const axelarQuery = new AxelarQueryAPI({
  environment:
    import.meta.env.VITE_NETWORK === "mainnet"
      ? Environment.MAINNET
      : Environment.TESTNET,
});

// Chain configuration
export const AXELAR_CHAINS = {
  ethereum: {
    name: "Ethereum",
    axelarName: "ethereum",
    chainId: 1,
    gateway: "0x4F4495243837681061C4743b74B3eEdf548D56A5",
    gasService: "0x2d5d7d31F671F86C782533cc367F14109a082712",
    tokens: ["axlUSDC", "WETH", "WBTC"],
  },
  polygon: {
    name: "Polygon",
    axelarName: "polygon",
    chainId: 137,
    gateway: "0x6f015F38a1E8b4D0E3B5C7F4f0c1f6e5D4C3B2A1",
    gasService: "0x2d5d7d31F671F86C782533cc367F14109a082712",
    tokens: ["axlUSDC", "WMATIC"],
  },
  avalanche: {
    name: "Avalanche",
    axelarName: "avalanche",
    chainId: 43114,
    gateway: "0x5029C0EFf6C34351a0CEc334542cDb22c7928f78",
    gasService: "0x2d5d7d31F671F86C782533cc367F14109a082712",
    tokens: ["axlUSDC", "WAVAX"],
  },
  oasis: {
    name: "Oasis Sapphire",
    axelarName: "oasis",
    chainId: 23294,
    gateway: "0x9B36f165baB9ebe611d491180418d8De4b8f3a1f",
    gasService: "0x2d5d7d31F671F86C782533cc367F14109a082712",
    tokens: ["axlUSDC"],
  },
};

/**
 * Estimate gas fee for cross-chain transfer
 */
export async function estimateCrossChainGas({
  sourceChain,
  destinationChain,
  gasLimit = 300000,
}) {
  try {
    const gasFee = await axelarQuery.estimateGasFee(
      sourceChain,
      destinationChain,
      GasToken.ETH,
      gasLimit,
      1.5 // Gas multiplier for safety
    );
    return gasFee;
  } catch (error) {
    console.error("Error estimating gas:", error);
    throw error;
  }
}

/**
 * Get supported tokens for a chain pair
 */
export async function getSupportedTokens(sourceChain, destinationChain) {
  const sourceTokens = AXELAR_CHAINS[sourceChain]?.tokens || [];
  const destTokens = AXELAR_CHAINS[destinationChain]?.tokens || [];
  return sourceTokens.filter((token) => destTokens.includes(token));
}

/**
 * Track cross-chain transaction status
 */
export async function trackTransaction(txHash) {
  const response = await fetch(
    `https://api.axelarscan.io/cross-chain/transfers-status?txHash=${txHash}`
  );
  return response.json();
}

export { axelarQuery };
```

### Cross-Chain Payment Hook

Create `src/hooks/useAxelarPayment.js`:

```javascript
import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { estimateCrossChainGas, AXELAR_CHAINS } from "../lib/axelar";
import { generateStealthAddress } from "../lib/aptos/stealthAddress";
import AxelarStealthBridgeABI from "../abi/AxelarStealthBridge.json";

export function useAxelarPayment() {
  const [loading, setLoading] = useState(false);
  const [txStatus, setTxStatus] = useState(null);

  const sendCrossChainPayment = useCallback(
    async ({
      sourceChain,
      destinationChain,
      recipientMetaAddress,
      amount,
      tokenSymbol,
      signer,
    }) => {
      setLoading(true);
      setTxStatus("preparing");

      try {
        // 1. Generate stealth address on destination chain
        const { spendPubKey, viewingPubKey } = recipientMetaAddress;
        const ephemeralKeyPair = generateEphemeralKeyPair();

        const { stealthAddress, ephemeralPubKey, viewHint, k } =
          generateStealthAddress(
            spendPubKey,
            viewingPubKey,
            hexToBytes(ephemeralKeyPair.privateKey),
            0
          );

        // 2. Estimate gas for cross-chain transfer
        const gasFee = await estimateCrossChainGas({
          sourceChain: AXELAR_CHAINS[sourceChain].axelarName,
          destinationChain: AXELAR_CHAINS[destinationChain].axelarName,
        });

        // 3. Get contract instance
        const bridgeContract = new ethers.Contract(
          import.meta.env.VITE_AXELAR_BRIDGE_ADDRESS,
          AxelarStealthBridgeABI,
          signer
        );

        // 4. Approve token spending
        setTxStatus("approving");
        const tokenAddress = await bridgeContract
          .gateway()
          .tokenAddresses(tokenSymbol);
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ["function approve(address,uint256)"],
          signer
        );
        await tokenContract.approve(bridgeContract.address, amount);

        // 5. Send cross-chain payment
        setTxStatus("sending");
        const tx = await bridgeContract.sendCrossChainStealthPayment(
          AXELAR_CHAINS[destinationChain].axelarName,
          import.meta.env.VITE_AXELAR_BRIDGE_ADDRESS,
          stealthAddress,
          ephemeralPubKey,
          viewHint,
          k,
          tokenSymbol,
          amount,
          { value: gasFee }
        );

        setTxStatus("confirming");
        const receipt = await tx.wait();

        setTxStatus("complete");
        return {
          success: true,
          txHash: receipt.transactionHash,
          stealthAddress,
          ephemeralPubKey,
        };
      } catch (error) {
        console.error("Cross-chain payment failed:", error);
        setTxStatus("failed");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    sendCrossChainPayment,
    loading,
    txStatus,
  };
}
```

---

## Use Cases for PrivatePay

### 1. Cross-Chain Private Payments

```
User on Ethereum → Stealth Address on Oasis Sapphire
- Maximum privacy: Oasis has built-in confidential computing
- User pays with ETH/USDC, recipient gets privacy
```

### 2. Multi-Chain DarkPool

```
Funds from multiple chains → Central DarkPool → Mixed distribution
- ETH user deposits to Polygon stealth address
- Polygon user deposits to Arbitrum stealth address
- All mixed in Oasis Sapphire DarkPool
```

### 3. Privacy-Preserving Cross-Chain Swaps

```
User wants to swap ETH → AVAX privately:
1. Send ETH to stealth address on Ethereum
2. Axelar bridges to stealth address on Avalanche
3. Swap executed via DEX aggregator
4. Funds withdrawn to new stealth address
```

### 4. Chain-Hopping Mixer

```
For maximum privacy:
Ethereum → Polygon → Arbitrum → Oasis → Final destination
Each hop adds obfuscation layer
```

---

## Security Considerations

### 1. **Trust Assumptions**

- Axelar validators must remain honest (threshold security)
- Gateway contracts are upgradeable by Axelar governance

### 2. **Recommendations**

- Set transaction limits initially
- Implement time-locks for large transfers
- Monitor for unusual patterns
- Use Axelar's Express service for smaller amounts (faster, different security model)

### 3. **Privacy Tradeoffs**

- Cross-chain transactions are visible on Axelarscan
- Use delayed execution to break timing correlation
- Combine with DarkPool mixing for maximum privacy

---

## Roadmap & Milestones

| Phase | Timeline | Milestone                | Status     |
| ----- | -------- | ------------------------ | ---------- |
| 1     | Week 1-2 | Deploy testnet contracts | ⬜ Pending |
| 1     | Week 1-2 | Axelar SDK integration   | ⬜ Pending |
| 2     | Week 3-4 | Cross-chain payment UI   | ⬜ Pending |
| 2     | Week 3-4 | Multi-chain scanner      | ⬜ Pending |
| 3     | Week 5-6 | Chain-hopping mixer      | ⬜ Pending |
| 3     | Week 5-6 | Privacy analytics        | ⬜ Pending |
| 4     | Week 7-8 | Security audit           | ⬜ Pending |
| 4     | Week 7-8 | Mainnet deployment       | ⬜ Pending |

---

## Resources & References

### Official Documentation

- [Axelar Docs](https://docs.axelar.dev/)
- [GMP Overview](https://docs.axelar.dev/dev/general-message-passing/overview/)
- [Interchain Token Service](https://docs.axelar.dev/dev/send-tokens/interchain-tokens/intro/)
- [Contract Addresses](https://docs.axelar.dev/resources/contract-addresses/mainnet/)

### SDKs & Tools

- [AxelarJS SDK](https://www.npmjs.com/package/@axelar-network/axelarjs-sdk)
- [GMP SDK Solidity](https://github.com/axelarnetwork/axelar-gmp-sdk-solidity)
- [Axelarscan Explorer](https://axelarscan.io/)

### Examples

- [Axelar Examples Repo](https://github.com/axelarnetwork/axelar-examples)
- [GMP Tutorial](https://docs.axelar.dev/dev/general-message-passing/developer-guides/example-gmp/)

---

## Suggestions for Enhancement

1. **Add Solana Support via Amplifier**: When Axelar's Solana integration launches, PrivatePay can support Solana ↔ EVM cross-chain privacy

2. **Implement Batch Payments**: Send to multiple stealth addresses in one cross-chain transaction

3. **Add Privacy Scoring**: Calculate and display privacy score based on mixing path

4. **Time-Locked Releases**: Allow scheduled releases from DarkPool for better privacy

5. **Cross-Chain Recovery**: Implement recovery mechanism if cross-chain tx fails

6. **Aptos Bridge**: Once Axelar Amplifier supports Aptos, enable direct Aptos ↔ EVM privacy transfers

---

_Document created for PrivatePay Axelar Integration_
_Last updated: December 2024_
