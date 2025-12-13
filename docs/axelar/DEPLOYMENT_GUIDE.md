# Axelar Deployment Guide

## Deployment Architecture

```mermaid
graph TB
    subgraph "Step 1: Deploy Contracts"
        D1[Deploy on Ethereum Sepolia]
        D2[Deploy on Polygon Amoy]
        D3[Deploy on other chains...]
    end

    subgraph "Step 2: Configure Trust"
        T1[Set trusted remotes on each chain]
        T2[Verify bidirectional trust]
    end

    subgraph "Step 3: Test"
        TE1[Test gas estimation]
        TE2[Test cross-chain transfer]
        TE3[Verify stealth address delivery]
    end

    D1 --> D2
    D2 --> D3
    D3 --> T1
    T1 --> T2
    T2 --> TE1
    TE1 --> TE2
    TE2 --> TE3
```

## Contract Deployment Flow

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant HH as Hardhat
    participant Chain as Blockchain
    participant Verify as Etherscan

    Dev->>HH: npx hardhat run deploy.ts --network sepolia
    HH->>HH: Compile contracts
    HH->>Chain: Deploy AxelarStealthBridge
    Chain-->>HH: Contract address
    HH->>Dev: Deployed at 0x...

    Dev->>HH: npx hardhat verify --network sepolia
    HH->>Verify: Submit source code
    Verify-->>Dev: Verified ✓
```

## Trusted Remote Setup

```mermaid
flowchart TD
    subgraph "Chain A (Ethereum)"
        A[AxelarStealthBridge]
        A -->|setTrustedRemote| AT["polygon-sepolia" => "0xBridge_B"]
    end

    subgraph "Chain B (Polygon)"
        B[AxelarStealthBridge]
        B -->|setTrustedRemote| BT["ethereum-sepolia" => "0xBridge_A"]
    end

    AT -.->|Trust| B
    BT -.->|Trust| A
```

## Environment Setup

```mermaid
flowchart LR
    subgraph "Required Environment Variables"
        E1[PRIVATE_KEY]
        E2[SEPOLIA_RPC_URL]
        E3[POLYGON_AMOY_RPC_URL]
        E4[ETHERSCAN_API_KEY]
        E5[POLYGONSCAN_API_KEY]
    end

    subgraph "Optional"
        O1[AVALANCHE_FUJI_RPC_URL]
        O2[ARBITRUM_SEPOLIA_RPC_URL]
        O3[OPTIMISM_SEPOLIA_RPC_URL]
    end
```

## Deployment Commands

### 1. Compile Contracts

```bash
cd hardhat
npx hardhat compile
```

### 2. Deploy to Sepolia

```bash
npx hardhat run scripts/deploy.ts --network ethereum-sepolia
```

### 3. Deploy to Polygon Amoy

```bash
npx hardhat run scripts/deploy.ts --network polygon-amoy
```

### 4. Set Trusted Remotes

```bash
npx hardhat run scripts/setTrustedRemotes.ts --network ethereum-sepolia
npx hardhat run scripts/setTrustedRemotes.ts --network polygon-amoy
```

### 5. Verify Contracts

```bash
npx hardhat verify --network ethereum-sepolia <CONTRACT_ADDRESS> <GATEWAY> <GAS_SERVICE> <OWNER>
```

## Testnet Addresses

```mermaid
graph LR
    subgraph "Axelar Infrastructure"
        GW[Gateway: 0xe432150cce91c13a887f7D836923d5597adD8E31]
        GS[Gas Service: 0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6]
        ITS[ITS: 0xB5FB4BE02232B1bBA4dC8f81dc24C26980dE9e3C]
    end

    subgraph "Our Contracts"
        BR[Bridge: 0x1764681c26D04f0E9EBb305368cfda808A9F6f8f]
    end

    BR --> GW
    BR --> GS
```

## Post-Deployment Checklist

```mermaid
flowchart TD
    C1[Contract deployed] --> C2{Verified on explorer?}
    C2 -->|No| V[Verify contract]
    C2 -->|Yes| C3{Trusted remotes set?}
    V --> C3
    C3 -->|No| TR[Set trusted remotes]
    C3 -->|Yes| C4{Fee recipient set?}
    TR --> C4
    C4 -->|No| FR[Set fee recipient]
    C4 -->|Yes| C5{Test payment works?}
    FR --> C5
    C5 -->|No| DB[Debug issues]
    C5 -->|Yes| DONE[Deployment Complete ✓]
    DB --> C5
```

## Mainnet Deployment Differences

| Aspect      | Testnet                   | Mainnet             |
| ----------- | ------------------------- | ------------------- |
| Gateway     | 0xe432150...              | Different per chain |
| Gas Service | 0xbE406F...               | Different per chain |
| Token       | aUSDC                     | axlUSDC or USDC     |
| API         | testnet.api.axelarscan.io | api.axelarscan.io   |
| Chain Names | ethereum-sepolia          | ethereum            |

## Upgrade Path

```mermaid
flowchart TD
    A[Current: Testnet] --> B{Ready for mainnet?}
    B -->|No| C[Continue testing]
    C --> A
    B -->|Yes| D[Deploy to mainnet]
    D --> E[Update frontend config]
    E --> F[Set VITE_NETWORK=mainnet]
    F --> G[Update trusted remotes]
    G --> H[Production Ready ✓]
```
