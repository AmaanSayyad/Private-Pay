# Axelar Frontend Integration

## Component Architecture

```mermaid
graph TB
    subgraph "Pages"
        CCP[CrossChainPaymentPage.jsx]
    end

    subgraph "Hooks"
        UAP[useAxelarPayment.js]
    end

    subgraph "Library"
        AI[axelar/index.js]
        ACP[axelar/crossChainPayment.js]
    end

    subgraph "External APIs"
        AS[Axelarscan API]
        RPC[Blockchain RPC]
    end

    CCP --> UAP
    UAP --> AI
    UAP --> ACP
    AI --> AS
    ACP --> RPC
```

## useAxelarPayment Hook State Machine

```mermaid
stateDiagram-v2
    [*] --> idle

    idle --> estimating: estimateGas()
    estimating --> idle: success/error

    idle --> approving: sendCrossChainPayment()
    approving --> sending: approved
    approving --> failed: rejected

    sending --> confirming: tx submitted
    confirming --> relaying: tx confirmed
    relaying --> executing: relayed
    executing --> complete: executed
    executing --> failed: error

    failed --> idle: reset()
    complete --> idle: reset()
```

## Data Flow

```mermaid
flowchart TD
    subgraph "User Input"
        A1[Source Chain]
        A2[Destination Chain]
        A3[Recipient Address]
        A4[Amount]
        A5[Token: aUSDC]
    end

    subgraph "Processing"
        B1[Validate inputs]
        B2[Generate stealth address]
        B3[Estimate gas fee]
        B4[Build transaction]
    end

    subgraph "Execution"
        C1[Request approval]
        C2[Send payment tx]
        C3[Track status]
    end

    A1 --> B1
    A2 --> B1
    A3 --> B2
    A4 --> B4
    A5 --> B4
    B1 --> B3
    B2 --> B4
    B3 --> B4
    B4 --> C1
    C1 --> C2
    C2 --> C3
```

## API Calls

### Gas Estimation

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Axelarscan API

    FE->>API: POST /gmp/estimateGasFee
    Note right of FE: Request Body
    Note right of FE: {<br/>  sourceChain: "ethereum-sepolia",<br/>  destinationChain: "polygon-sepolia",<br/>  gasLimit: 350000,<br/>  gasMultiplier: 1.1<br/>}

    API-->>FE: Response
    Note left of API: "12345678901234" (wei string)
```

### Transaction Tracking

```mermaid
sequenceDiagram
    participant FE as Frontend
    participant API as Axelarscan API

    FE->>API: GET /gmp/{txHash}

    API-->>FE: Transaction Status
    Note left of API: {<br/>  status: "executed",<br/>  sourceChain: {...},<br/>  destinationChain: {...},<br/>  gasUsed: {...}<br/>}
```

## Chain Configuration

```mermaid
graph LR
    subgraph "AXELAR_CHAINS Object"
        E[ethereum]
        P[polygon]
        AV[avalanche]
        AR[arbitrum]
        OP[optimism]
        BA[base]
        BN[bnb]
        FA[fantom]
        MO[moonbeam]
    end

    subgraph "Chain Properties"
        N[name]
        AN[axelarName]
        CI[chainId]
        GW[gateway]
        GS[gasService]
        IT[its]
        RPC[rpcUrl]
        EX[explorer]
        TK[tokens]
        GT[gasToken]
    end

    E --> N
    E --> AN
    E --> CI
    E --> GW
```

## Wallet Connection Flow

```mermaid
sequenceDiagram
    participant User
    participant FE as Frontend
    participant MM as MetaMask

    User->>FE: Click "Connect MetaMask"
    FE->>MM: eth_requestAccounts
    MM->>User: Approve connection?
    User->>MM: Approve
    MM-->>FE: [address]
    FE->>MM: eth_chainId
    MM-->>FE: chainId
    FE->>FE: Check if Sepolia (11155111)

    alt Wrong Network
        FE->>MM: wallet_switchEthereumChain
        MM->>User: Switch network?
        User->>MM: Approve
    end

    FE->>User: Show connected state
```

## Error Handling

```mermaid
flowchart TD
    subgraph "Connection Errors"
        CE1[MetaMask not installed] --> R1[Show install prompt]
        CE2[User rejected] --> R2[Show retry button]
        CE3[Wrong network] --> R3[Prompt network switch]
    end

    subgraph "Transaction Errors"
        TE1[Insufficient balance] --> R4[Show balance error]
        TE2[Gas estimation failed] --> R5[Use fallback gas]
        TE3[Tx reverted] --> R6[Show revert reason]
    end

    subgraph "API Errors"
        AE1[API timeout] --> R7[Retry with backoff]
        AE2[Invalid response] --> R8[Use cached data]
    end
```

## File Structure

```
src/
├── lib/
│   └── axelar/
│       ├── index.js              # Main exports, chain config
│       └── crossChainPayment.js  # Payment execution logic
├── hooks/
│   └── useAxelarPayment.js       # React hook for payments
└── pages/
    └── CrossChainPaymentPage.jsx # UI component
```

## Key Functions

| Function                | File                 | Purpose                |
| ----------------------- | -------------------- | ---------------------- |
| `estimateCrossChainGas` | index.js             | Get gas fee from API   |
| `getSupportedChains`    | index.js             | List available chains  |
| `trackTransaction`      | index.js             | Monitor tx status      |
| `sendCrossChainPayment` | crossChainPayment.js | Execute payment        |
| `useAxelarPayment`      | useAxelarPayment.js  | React state management |
