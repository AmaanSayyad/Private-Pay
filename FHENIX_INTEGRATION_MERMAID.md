# Fhenix Integration Architecture

This document describes the Fhenix integration architecture for Private-Pay, based on the `zec2eth` repository pattern.

## System Overview

```mermaid
graph TB
    subgraph "Frontend (React)"
        UI[FhenixPayments Page]
        Hook[useFhenix Hook]
        FHELib[fhenixFhe.ts]
        ContractLib[fhenixContracts.ts]
    end
    
    subgraph "FHE Client Layer"
        CoFHE[cofhejs/web]
        Encrypt[Encrypt Amount]
        Permit[Create Permit]
    end
    
    subgraph "Blockchain (Arbitrum Sepolia)"
        FHPAY[FHPAY Contract]
        FHERC20[FHERC20 Base]
        CoFHEProc[CoFHE Co-Processor]
    end
    
    UI --> Hook
    Hook --> FHELib
    FHELib --> CoFHE
    UI --> ContractLib
    ContractLib --> FHPAY
    FHPAY --> FHERC20
    FHERC20 --> CoFHEProc
    CoFHE --> Encrypt
    CoFHE --> Permit
```

## Confidential Transfer Flow

```mermaid
sequenceDiagram
    participant User
    participant UI as FhenixPayments
    participant Hook as useFhenix
    participant FHE as fhenixFhe
    participant CoFHE as cofhejs
    participant Contract as fhenixContracts
    participant FHPAY as FHPAY.sol
    participant Chain as Arbitrum Sepolia
    
    User->>UI: Enter amount & recipient
    UI->>Hook: encrypt(amount)
    Hook->>FHE: encryptAmount(amount)
    FHE->>CoFHE: cofhejs.encrypt(uint64)
    CoFHE-->>FHE: Encrypted value (InEuint64)
    FHE-->>Hook: FhenixEncryptionResult
    Hook-->>UI: Encrypted amount
    
    UI->>Contract: confidentialTransfer(to, encrypted)
    Contract->>FHPAY: confidentialTransfer(to, inValue)
    FHPAY->>FHPAY: _update(from, to, encrypted)
    FHPAY->>Chain: Transaction with encrypted data
    Chain-->>FHPAY: Transaction receipt
    FHPAY-->>Contract: Transaction hash
    Contract-->>UI: Success + txHash
    
    UI->>User: Show success + link to explorer
```

## Contract Architecture

```mermaid
classDiagram
    class FHERC20 {
        -mapping _encBalances
        -mapping _indicatedBalances
        -euint64 _encTotalSupply
        +confidentialTransfer(to, inValue)
        +confidentialBalanceOf(account)
        +balanceOf(account)
        +_update(from, to, value)
    }
    
    class FHPAY {
        -address controller
        +confidentialMintFromController(to, value)
        +confidentialBurnFromController(from, value)
        +devMintPlain(to, value)
        +setController(newController)
    }
    
    class FHE {
        <<library>>
        +allow(encrypted, account)
        +allowSender(encrypted)
        +seal(value)
        +unseal(encrypted)
    }
    
    FHERC20 <|-- FHPAY
    FHERC20 ..> FHE : uses
```

## Data Flow: Encryption to On-Chain

```mermaid
flowchart LR
    subgraph "Client-Side"
        A[Plain Amount: 100.5] --> B[cofhejs.encrypt]
        B --> C[Encrypted Bytes]
        C --> D[InEuint64 Struct]
        D --> E[ctHash, securityZone, utype, signature]
    end
    
    subgraph "On-Chain"
        E --> F[confidentialTransfer Call]
        F --> G[FHERC20._update]
        G --> H[FHE Operations]
        H --> I[Encrypted Balance Updated]
    end
    
    style A fill:#90EE90
    style I fill:#FFB6C1
    style C fill:#87CEEB
    style H fill:#DDA0DD
```

## Access Control List (ACL) Flow

```mermaid
sequenceDiagram
    participant Sender
    participant Contract as FHPAY
    participant FHE as FHE Library
    participant CoFHE as CoFHE Processor
    participant Recipient
    
    Note over Sender,Recipient: Before Transfer
    Sender->>Contract: confidentialTransfer(to, encrypted)
    Contract->>FHE: FHE.allowSender(encrypted)
    FHE->>CoFHE: Set ACL: Contract can decrypt
    CoFHE-->>FHE: ACL set
    
    Note over Sender,Recipient: During Transfer
    Contract->>FHE: FHE operations on encrypted values
    FHE->>CoFHE: Compute on encrypted data
    CoFHE-->>FHE: Encrypted result
    FHE-->>Contract: Updated encrypted balance
    
    Note over Sender,Recipient: After Transfer
    Contract->>FHE: FHE.allow(encrypted, recipient)
    FHE->>CoFHE: Set ACL: Recipient can decrypt
    CoFHE-->>FHE: ACL set
    Recipient->>CoFHE: unseal(encrypted)
    CoFHE-->>Recipient: Decrypted balance
```

## Frontend Component Structure

```mermaid
graph TD
    subgraph "Pages"
        Page[FhenixPayments.jsx]
    end
    
    subgraph "Hooks"
        Hook[useFhenix.ts]
    end
    
    subgraph "Libraries"
        FHE[fhenixFhe.ts]
        Contracts[fhenixContracts.ts]
        Types[fhenixTypes.ts]
    end
    
    subgraph "External"
        CoFHE[cofhejs/web]
        Ethers[ethers.js]
        Config[config.js]
    end
    
    Page --> Hook
    Page --> Contracts
    Hook --> FHE
    Contracts --> Ethers
    Contracts --> Config
    FHE --> CoFHE
    FHE --> Types
    Contracts --> Types
```

## Deployment Flow

```mermaid
flowchart TD
    A[Developer] --> B[Set ARBITRUM_TREASURY_PRIVATE_KEY]
    B --> C[npx hardhat deploy]
    C --> D[Compile Contracts]
    D --> E[Deploy to Arbitrum Sepolia]
    E --> F{Deployment Success?}
    F -->|Yes| G[Save to deployments/]
    F -->|No| H[Check Error]
    G --> I[Update src/config.js]
    I --> J[Copy ABI to src/abi/]
    J --> K[Ready for Frontend]
    H --> L[Fix Issues]
    L --> C
```

## Security Model

```mermaid
graph TB
    subgraph "Encryption Layer"
        Plain[Plain Amount]
        Encrypted[Encrypted euint64]
    end
    
    subgraph "On-Chain Storage"
        Encrypted --> OnChain[Encrypted Balance on FHPAY]
    end
    
    subgraph "Access Control"
        ACL[ACL Permissions]
        Owner[Owner can decrypt]
        Recipient[Recipient can decrypt]
        Contract[Contract can compute]
    end
    
    OnChain --> ACL
    ACL --> Owner
    ACL --> Recipient
    ACL --> Contract
    
    style Plain fill:#FF6B6B
    style Encrypted fill:#4ECDC4
    style OnChain fill:#95E1D3
    style ACL fill:#F38181
```

## Error Handling Flow

```mermaid
flowchart TD
    Start[User Action] --> Check{Wallet Connected?}
    Check -->|No| Error1[Show: Connect Wallet]
    Check -->|Yes| Init{FHE Initialized?}
    Init -->|No| Error2[Show: Initializing...]
    Init -->|Yes| Validate{Valid Input?}
    Validate -->|No| Error3[Show: Invalid Input]
    Validate -->|Yes| Encrypt[Encrypt Amount]
    Encrypt --> EncryptCheck{Success?}
    EncryptCheck -->|No| Error4[Show: Encryption Failed]
    EncryptCheck -->|Yes| Send[Send Transaction]
    Send --> TxCheck{Transaction Success?}
    TxCheck -->|No| Error5[Show: Transaction Failed]
    TxCheck -->|Yes| Success[Show: Success + Tx Hash]
    
    Error1 --> End
    Error2 --> End
    Error3 --> End
    Error4 --> End
    Error5 --> End
    Success --> End
```

## Integration Checklist

- [x] Smart contracts (FHERC20, FHPAY)
- [x] Hardhat configuration
- [x] Deployment scripts
- [x] Contract deployment to Arbitrum Sepolia
- [x] Frontend FHE client (fhenixFhe.ts)
- [x] React hook (useFhenix.ts)
- [x] Contract helpers (fhenixContracts.ts)
- [x] UI page (FhenixPayments.jsx)
- [x] Router integration
- [ ] E2E testing
- [ ] Documentation updates
- [ ] Production deployment

## Next Steps

1. **Testing:**
   - Unit tests for contracts
   - Integration tests for frontend
   - E2E manual testing on Arbitrum Sepolia

2. **Enhancements:**
   - Batch transfers
   - Multi-recipient payments
   - Payment links with FHE
   - Balance history (encrypted)

3. **Production:**
   - Deploy to Arbitrum Mainnet
   - Security audit
   - Gas optimization
   - User documentation


