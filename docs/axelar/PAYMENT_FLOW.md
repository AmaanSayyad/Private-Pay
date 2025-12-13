# Axelar Cross-Chain Payment Flow

## Complete Payment Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant MetaMask
    participant SourceBridge as Source Bridge Contract
    participant GasService as Axelar Gas Service
    participant Gateway as Axelar Gateway
    participant AxelarNetwork as Axelar Network
    participant DestGateway as Dest Gateway
    participant DestBridge as Dest Bridge Contract
    participant StealthAddr as Stealth Address

    Note over User,StealthAddr: Phase 1: Initiate Payment
    User->>Frontend: Enter recipient, amount, chains
    Frontend->>Frontend: Generate stealth address
    Frontend->>Frontend: Estimate gas fee via API
    Frontend->>MetaMask: Request token approval
    MetaMask->>User: Confirm approval
    User->>MetaMask: Approve
    MetaMask->>SourceBridge: approve(bridge, amount)

    Note over User,StealthAddr: Phase 2: Send Cross-Chain Payment
    Frontend->>MetaMask: Request payment tx
    MetaMask->>User: Confirm payment + gas
    User->>MetaMask: Confirm
    MetaMask->>SourceBridge: sendCrossChainPayment()
    SourceBridge->>SourceBridge: transferFrom(user, bridge, amount)
    SourceBridge->>SourceBridge: Calculate fee, deduct
    SourceBridge->>GasService: payNativeGasForContractCallWithToken()
    SourceBridge->>Gateway: callContractWithToken()
    Gateway-->>Frontend: Emit ContractCallWithToken event
    Frontend->>User: Show "Payment Sent"

    Note over User,StealthAddr: Phase 3: Axelar Processing
    Gateway->>AxelarNetwork: Broadcast message
    AxelarNetwork->>AxelarNetwork: Validators verify
    AxelarNetwork->>AxelarNetwork: Reach consensus
    AxelarNetwork->>DestGateway: Relay message + tokens

    Note over User,StealthAddr: Phase 4: Destination Execution
    DestGateway->>DestBridge: executeWithToken()
    DestBridge->>DestBridge: Verify trusted remote
    DestBridge->>DestBridge: Decode stealth payment data
    DestBridge->>StealthAddr: Transfer aUSDC
    DestBridge-->>Frontend: Emit StealthPaymentReceived
    Frontend->>User: Show "Payment Complete"
```

## Gas Estimation Flow

```mermaid
sequenceDiagram
    participant Frontend
    participant AxelarAPI as Axelarscan API
    participant User

    Frontend->>AxelarAPI: POST /gmp/estimateGasFee
    Note right of Frontend: {sourceChain, destinationChain, gasLimit}
    AxelarAPI->>AxelarAPI: Calculate based on:<br/>- Source gas price<br/>- Dest gas price<br/>- Token prices<br/>- L2 data costs
    AxelarAPI-->>Frontend: Gas fee in wei (string)
    Frontend->>Frontend: Parse & format
    Frontend->>User: Display "~0.00001 ETH"
```

## Stealth Address Generation

```mermaid
flowchart TD
    A[Recipient Meta Address] --> B[Extract spend_pubkey]
    A --> C[Extract viewing_pubkey]
    B --> D[Generate ephemeral keypair]
    C --> D
    D --> E[ECDH: shared_secret = ephemeral_priv * viewing_pubkey]
    E --> F[Hash shared_secret]
    F --> G[stealth_pubkey = spend_pubkey + hash * G]
    G --> H[Stealth Address = keccak256(stealth_pubkey)]
    D --> I[Store ephemeral_pubkey in payment]
```

## Transaction States

```mermaid
stateDiagram-v2
    [*] --> IDLE
    IDLE --> ESTIMATING: User clicks Estimate
    ESTIMATING --> IDLE: Gas estimated
    IDLE --> APPROVING: User clicks Send
    APPROVING --> SENDING: Approval confirmed
    APPROVING --> FAILED: Approval rejected
    SENDING --> CONFIRMING: Tx submitted
    CONFIRMING --> RELAYING: Tx confirmed on source
    RELAYING --> EXECUTING: Axelar relays
    EXECUTING --> COMPLETE: Dest execution done
    EXECUTING --> FAILED: Execution failed
    COMPLETE --> [*]
    FAILED --> IDLE: User retries
```

## Error Handling

```mermaid
flowchart TD
    subgraph "Source Chain Errors"
        E1[Insufficient Balance] --> R1[Show balance error]
        E2[Approval Failed] --> R2[Prompt re-approval]
        E3[Gas Too Low] --> R3[Increase gas estimate]
    end

    subgraph "Axelar Network Errors"
        E4[Message Not Relayed] --> R4[Check Axelarscan]
        E5[Validator Timeout] --> R5[Wait & retry]
    end

    subgraph "Destination Chain Errors"
        E6[Execution Failed] --> R6[Manual recovery]
        E7[Untrusted Remote] --> R7[Admin: set trusted]
    end
```

## Time Estimates

| Phase          | Duration    | Notes                        |
| -------------- | ----------- | ---------------------------- |
| Token Approval | ~15 sec     | 1 block confirmation         |
| Source Tx      | ~15 sec     | 1 block confirmation         |
| Axelar Relay   | 2-5 min     | Validator consensus          |
| Dest Execution | ~15 sec     | Auto-executed by relayer     |
| **Total**      | **3-6 min** | Varies by network congestion |
