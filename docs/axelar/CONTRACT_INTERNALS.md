# Axelar Contract Internals

## Contract Structure

```mermaid
graph TB
    subgraph "AxelarStealthBridge.sol"
        C[Constructor]
        S[State Variables]
        E[Events]
        M[Modifiers]

        subgraph "Public Functions"
            F1[sendCrossChainPayment]
            F2[registerMetaAddress]
            F3[setTrustedRemote]
            F4[setProtocolFee]
            F5[pause/unpause]
        end

        subgraph "Internal Functions"
            I1[_executeWithToken]
            I2[_generatePaymentId]
            I3[_deductFee]
        end
    end

    C --> S
    S --> E
    F1 --> I2
    F1 --> I3
    I1 --> E
```

## sendCrossChainPayment() Flow

```mermaid
flowchart TD
    A[User calls sendCrossChainPayment] --> B{Contract Paused?}
    B -->|Yes| X1[Revert: Paused]
    B -->|No| C{Valid destination?}
    C -->|No| X2[Revert: Untrusted remote]
    C -->|Yes| D[Transfer tokens from user]
    D --> E{Transfer success?}
    E -->|No| X3[Revert: Transfer failed]
    E -->|Yes| F[Calculate protocol fee]
    F --> G[Deduct fee from amount]
    G --> H[Encode stealth payment data]
    H --> I[Approve gateway for tokens]
    I --> J[Pay gas to Gas Service]
    J --> K[Call gateway.callContractWithToken]
    K --> L[Emit CrossChainStealthPaymentSent]
    L --> M[Return paymentId]
```

## \_executeWithToken() Flow (Destination)

```mermaid
flowchart TD
    A[Gateway calls executeWithToken] --> B{Source trusted?}
    B -->|No| X1[Revert: Untrusted source]
    B -->|Yes| C[Decode payload]
    C --> D[Extract stealth address]
    D --> E[Extract ephemeral pubkey]
    E --> F[Get token address from gateway]
    F --> G[Transfer tokens to stealth address]
    G --> H[Emit StealthPaymentReceived]
    H --> I[Emit Announcement for scanning]
```

## Data Structures

```mermaid
erDiagram
    StealthPayment {
        address stealthAddress
        bytes ephemeralPubKey
        bytes1 viewHint
        uint32 k
        address sender
        uint256 nonce
    }

    MetaAddress {
        bytes spendPubKey
        bytes viewingPubKey
        bool isRegistered
    }

    TrustedRemote {
        string chainName
        string contractAddress
    }

    AxelarStealthBridge ||--o{ StealthPayment : "sends"
    AxelarStealthBridge ||--o{ MetaAddress : "stores"
    AxelarStealthBridge ||--o{ TrustedRemote : "trusts"
```

## Payload Encoding

```mermaid
flowchart LR
    subgraph "Source Chain"
        A[StealthPayment struct] --> B[abi.encode]
        B --> C[bytes payload]
    end

    subgraph "Axelar Network"
        C --> D[Relayed as-is]
    end

    subgraph "Destination Chain"
        D --> E[bytes payload]
        E --> F[abi.decode]
        F --> G[StealthPayment struct]
    end
```

### Payload Structure

```solidity
// Encoded payload (bytes)
abi.encode(
    stealthAddress,      // address - 32 bytes
    ephemeralPubKey,     // bytes   - variable
    viewHint,            // bytes1  - 1 byte
    k,                   // uint32  - 4 bytes
    sender,              // address - 32 bytes
    nonce                // uint256 - 32 bytes
)
```

## Security Checks

```mermaid
flowchart TD
    subgraph "Access Control"
        A1[onlyOwner] --> B1[setTrustedRemote]
        A1 --> B2[setProtocolFee]
        A1 --> B3[setFeeRecipient]
        A1 --> B4[pause/unpause]
        A1 --> B5[emergencyWithdraw]
    end

    subgraph "Validation"
        C1[whenNotPaused] --> D1[sendCrossChainPayment]
        C2[nonReentrant] --> D1
        C3[trustedRemote check] --> D1
        C3 --> D2[_executeWithToken]
    end

    subgraph "Limits"
        E1[MAX_FEE_BPS = 500] --> F1[setProtocolFee]
        E2[amount > 0] --> F2[sendCrossChainPayment]
    end
```

## Gas Costs Breakdown

| Operation             | Estimated Gas | Notes                 |
| --------------------- | ------------- | --------------------- |
| Token Approval        | ~46,000       | One-time per token    |
| sendCrossChainPayment | ~150,000      | Includes gateway call |
| \_executeWithToken    | ~80,000       | Destination execution |
| registerMetaAddress   | ~50,000       | One-time per user     |
| setTrustedRemote      | ~25,000       | Admin only            |

## Event Emissions

```mermaid
sequenceDiagram
    participant User
    participant Bridge as AxelarStealthBridge
    participant Gateway as Axelar Gateway
    participant Scanner as Stealth Scanner

    Note over Bridge: Source Chain Events
    Bridge->>Scanner: CrossChainStealthPaymentSent
    Note right of Scanner: paymentId, sender, amount

    Gateway->>Scanner: ContractCallWithToken
    Note right of Scanner: Axelar standard event

    Note over Bridge: Destination Chain Events
    Bridge->>Scanner: StealthPaymentReceived
    Note right of Scanner: stealthAddress, amount

    Bridge->>Scanner: Announcement
    Note right of Scanner: ephemeralPubKey, viewHint
```
