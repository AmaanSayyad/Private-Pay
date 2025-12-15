# Aztec Integration - Complete Code Flow Documentation

This document provides comprehensive Mermaid diagrams showing all Aztec-related code files, their relationships, and how frontend user interactions trigger actions throughout the system.

---

## 📋 Table of Contents

1. [Aztec Code File Structure](#aztec-code-file-structure)
2. [Frontend Navigation Flow](#frontend-navigation-flow)
3. [Aztec Dashboard Click Flow](#aztec-dashboard-click-flow)
4. [Bridge Component Flow](#bridge-component-flow)
5. [Stablecoin Component Flow](#stablecoin-component-flow)
6. [Aztec Client Initialization](#aztec-client-initialization)
7. [Bridge Deposit Flow](#bridge-deposit-flow)
8. [Bridge Withdrawal Flow](#bridge-withdrawal-flow)
9. [Encrypted Notes Flow](#encrypted-notes-flow)
10. [Complete User Interaction Journey](#complete-user-interaction-journey)

---

## 📁 Aztec Code File Structure

### File Organization and Dependencies

```mermaid
graph TB
    subgraph "Frontend Pages"
        AztecDashboard[src/pages/AztecDashboard.jsx]
        BridgePage[src/pages/BridgePage.jsx]
        StablecoinPage[src/pages/StablecoinPage.jsx]
    end
    
    subgraph "Frontend Components"
        Bridge[src/components/bridge/Bridge.jsx]
        Stablecoin[src/components/stablecoin/Stablecoin.jsx]
        Navbar[src/components/shared/Navbar.jsx]
    end
    
    subgraph "Aztec Library Core"
        Index[src/lib/aztec/index.js<br/>Main Entry Point]
        AztecClient[src/lib/aztec/aztecClient.js<br/>PXE Client]
        BridgeLib[src/lib/aztec/bridge.js<br/>Bridge Manager]
        NotesLib[src/lib/aztec/encryptedNotes.js<br/>Note Manager]
    end
    
    subgraph "External Dependencies"
        ZcashLib[src/lib/zcash/index.js]
        Router[src/router.jsx]
    end
    
    Navbar -->|Navigate| AztecDashboard
    Router -->|Route /aztec| AztecDashboard
    Router -->|Route /bridge| BridgePage
    Router -->|Route /stablecoin| StablecoinPage
    
    AztecDashboard -->|Navigate| BridgePage
    AztecDashboard -->|Navigate| StablecoinPage
    
    BridgePage --> Bridge
    StablecoinPage --> Stablecoin
    
    Bridge --> Index
    Bridge --> ZcashLib
    Stablecoin --> Index
    
    Index --> AztecClient
    Index --> BridgeLib
    Index --> NotesLib
    
    BridgeLib --> AztecClient
    BridgeLib --> NotesLib
    BridgeLib --> ZcashLib
```

### Code File Responsibilities

```mermaid
mindmap
  root((Aztec Integration))
    Frontend Pages
      AztecDashboard.jsx
        Landing page
        Feature cards
        Navigation
      BridgePage.jsx
        Route wrapper
        Lazy loading
      StablecoinPage.jsx
        Route wrapper
        Lazy loading
    Components
      Bridge.jsx
        UI for bridge
        Direction toggle
        Amount input
        Transaction handling
      Stablecoin.jsx
        UI for stablecoin
        Mint/Burn operations
    Library Core
      index.js
        Main exports
        Configuration
        Factory functions
      aztecClient.js
        PXE connection
        Account management
        Transaction sending
        Note retrieval
      bridge.js
        Deposit creation
        Withdrawal creation
        Ticket management
        bZEC claiming
      encryptedNotes.js
        Note structure
        Note manager
        Balance tracking
        Note selection
```

---

## 🧭 Frontend Navigation Flow

### User Clicks "Aztec" in Navigation Bar

```mermaid
sequenceDiagram
    participant User
    participant Navbar
    participant Router
    participant AztecDashboard
    participant ReactRouter

    User->>Navbar: Clicks "Aztec" link
    Note over Navbar: Location: src/components/shared/Navbar.jsx:55-63
    
    Navbar->>ReactRouter: navigate("/aztec")
    Note over Navbar: Uses useNavigate hook
    
    ReactRouter->>Router: Match route /aztec
    Note over Router: Location: src/router.jsx:145-148
    
    Router->>Router: Lazy load AztecDashboard
    Note over Router: const AztecDashboard = lazy(() => import("./pages/AztecDashboard.jsx"))
    
    Router->>AztecDashboard: Render component
    Note over AztecDashboard: Location: src/pages/AztecDashboard.jsx
    
    AztecDashboard->>AztecDashboard: Render dashboard UI
    Note over AztecDashboard: Shows feature cards:<br/>- Zcash Bridge<br/>- Private Stablecoin
    
    AztecDashboard-->>User: Display Aztec dashboard
```

### Navigation State Flow

```mermaid
stateDiagram-v2
    [*] --> Dashboard: User on any page
    
    Dashboard --> NavbarClick: User clicks "Aztec" in navbar
    NavbarClick --> RouteMatch: React Router matches /aztec
    RouteMatch --> LazyLoad: Router lazy loads AztecDashboard
    LazyLoad --> RenderDashboard: Component renders
    
    RenderDashboard --> ShowFeatures: Dashboard displays
    ShowFeatures --> BridgeCardClick: User clicks "Zcash Bridge" card
    ShowFeatures --> StablecoinCardClick: User clicks "Private Stablecoin" card
    
    BridgeCardClick --> NavigateBridge: navigate("/bridge")
    NavigateBridge --> BridgePage: BridgePage renders
    BridgePage --> BridgeComponent: Bridge component loads
    
    StablecoinCardClick --> NavigateStablecoin: navigate("/stablecoin")
    NavigateStablecoin --> StablecoinPage: StablecoinPage renders
    StablecoinPage --> StablecoinComponent: Stablecoin component loads
```

---

## 🎯 Aztec Dashboard Click Flow

### User Clicks "Explore Zcash Bridge" Button

```mermaid
sequenceDiagram
    participant User
    participant AztecDashboard
    participant Card
    participant Button
    participant ReactRouter
    participant BridgePage
    participant Bridge

    User->>Card: Clicks on "Zcash Bridge" card
    Note over Card: Location: src/pages/AztecDashboard.jsx:105-137<br/>isPressable={true}
    
    Card->>Button: onPress event triggered
    Note over Button: Location: src/pages/AztecDashboard.jsx:127-131<br/>onPress={() => navigate(feature.path)}
    
    Button->>AztecDashboard: navigate("/bridge")
    Note over AztecDashboard: const navigate = useNavigate()<br/>feature.path = "/bridge"
    
    AztecDashboard->>ReactRouter: navigate("/bridge")
    
    ReactRouter->>BridgePage: Route to /bridge
    Note over BridgePage: Location: src/pages/BridgePage.jsx
    
    BridgePage->>Bridge: Render Bridge component
    Note over Bridge: Location: src/components/bridge/Bridge.jsx
    
    Bridge->>Bridge: useEffect runs (initialization)
    Note over Bridge: Lines 22-39: Initialize bridge manager
    
    Bridge->>Bridge: Render bridge UI
    Note over Bridge: Shows direction toggle, amount input, buttons
    
    Bridge-->>User: Display bridge interface
```

### Dashboard Feature Card Interaction

```mermaid
flowchart TD
    Start([User on Aztec Dashboard]) --> HoverCard[User hovers over feature card]
    HoverCard --> CardHover[Card shows hover effect]
    CardHover --> ClickCard[User clicks card]
    
    ClickCard --> CheckFeature{Which Feature?}
    
    CheckFeature -->|Zcash Bridge| BridgePath[path = '/bridge']
    CheckFeature -->|Private Stablecoin| StablecoinPath[path = '/stablecoin']
    
    BridgePath --> NavigateBridge[navigate('/bridge')]
    StablecoinPath --> NavigateStablecoin[navigate('/stablecoin')]
    
    NavigateBridge --> LoadBridgePage[Lazy load BridgePage]
    NavigateStablecoin --> LoadStablecoinPage[Lazy load StablecoinPage]
    
    LoadBridgePage --> RenderBridge[Render Bridge component]
    LoadStablecoinPage --> RenderStablecoin[Render Stablecoin component]
    
    RenderBridge --> BridgeUI[Show Bridge UI]
    RenderStablecoin --> StablecoinUI[Show Stablecoin UI]
    
    BridgeUI --> End([User on Bridge Page])
    StablecoinUI --> End2([User on Stablecoin Page])
```

---

## 🌉 Bridge Component Flow

### Complete Bridge Component Initialization

```mermaid
sequenceDiagram
    participant User
    participant Bridge
    participant useEffect
    participant ZcashLib
    participant AztecLib
    participant BridgeManager
    participant PXEClient
    participant ZcashWallet

    User->>Bridge: Navigate to /bridge
    Note over Bridge: Location: src/components/bridge/Bridge.jsx:14
    
    Bridge->>Bridge: Component mounts
    Bridge->>Bridge: useState hooks initialize
    Note over Bridge: Lines 15-19:<br/>- direction: 'zcash-to-aztec'<br/>- amount: ''<br/>- isLoading: false<br/>- status: 'idle'
    
    Bridge->>useEffect: useEffect(() => {...}, [])
    Note over Bridge: Lines 22-39: Initialization effect
    
    useEffect->>ZcashLib: createConfiguredRPCClient('testnet')
    Note over ZcashLib: Location: src/lib/zcash/index.js
    
    ZcashLib-->>useEffect: RPC client instance
    
    useEffect->>ZcashLib: createZcashWallet(zcashRPC)
    ZcashLib-->>useEffect: ZcashWallet instance
    
    useEffect->>ZcashWallet: wallet.initialize()
    ZcashWallet-->>useEffect: Wallet initialized
    
    useEffect->>AztecLib: createConfiguredPXEClient('testnet')
    Note over AztecLib: Location: src/lib/aztec/index.js:66
    
    AztecLib->>AztecLib: getPXEUrl('testnet')
    Note over AztecLib: Lines 50-59: Get PXE URL from config
    
    AztecLib->>AztecClient: createAztecPXEClient(pxeUrl)
    Note over AztecClient: Location: src/lib/aztec/aztecClient.js:144
    
    AztecClient-->>AztecLib: AztecPXEClient instance
    AztecLib-->>useEffect: PXE client instance
    
    useEffect->>PXEClient: pxe.connect()
    Note over PXEClient: Location: src/lib/aztec/aztecClient.js:22
    
    PXEClient->>PXEClient: fetch(`${pxeUrl}/status`)
    PXEClient-->>useEffect: Connection successful
    
    useEffect->>BridgeManager: createBridgeManager(pxe, wallet)
    Note over BridgeManager: Location: src/lib/aztec/bridge.js:244
    Note over BridgeManager: Currently commented out in Bridge.jsx:33
    
    Bridge->>Bridge: Render UI
    Bridge-->>User: Show bridge interface
```

### Bridge Deposit Flow (Zcash → Aztec)

```mermaid
sequenceDiagram
    participant User
    participant Bridge
    participant handleDeposit
    participant BridgeManager
    participant ZcashWallet
    participant ZcashBlockchain
    participant PartialNotes
    participant AztecClient
    participant AztecContract

    User->>Bridge: Enters amount
    Note over Bridge: Location: src/components/bridge/Bridge.jsx:121-132<br/>Input component updates amount state
    
    User->>Bridge: Clicks "Deposit to Aztec" button
    Note over Bridge: Line 134-150: Button onClick handler
    
    Bridge->>handleDeposit: handleDeposit() called
    Note over Bridge: Lines 44-68: Deposit handler
    
    handleDeposit->>handleDeposit: Validate amount
    Note over Bridge: Lines 45-48: Check amount > 0
    
    handleDeposit->>Bridge: setIsLoading(true)
    handleDeposit->>Bridge: setStatus('processing')
    
    handleDeposit->>ZcashWallet: Send ZEC to bridge address
    Note over ZcashWallet: User sends ZEC transaction<br/>on Zcash blockchain
    
    ZcashWallet->>ZcashBlockchain: Submit transaction
    ZcashBlockchain-->>ZcashWallet: Transaction hash (zcashTxId)
    
    ZcashWallet-->>handleDeposit: zcashTxId returned
    
    handleDeposit->>BridgeManager: createDeposit(zcashTxId, note, amount)
    Note over BridgeManager: Location: src/lib/aztec/bridge.js:106
    
    BridgeManager->>PartialNotes: generatePartialNote(zcashNote)
    Note over PartialNotes: Location: src/lib/zcash/partialNotes.js
    
    PartialNotes-->>BridgeManager: Partial note proof
    
    BridgeManager->>BridgeManager: generateTicketId()
    Note over BridgeManager: Lines 214-217: Generate unique ticket
    
    BridgeManager->>BridgeManager: new BridgeDeposit(...)
    Note over BridgeManager: Lines 115-120: Create deposit object
    
    BridgeManager->>BridgeManager: deposits.set(ticketId, deposit)
    Note over BridgeManager: Line 122: Store deposit
    
    BridgeManager-->>handleDeposit: BridgeDeposit instance
    
    handleDeposit->>BridgeManager: claimBZEC(ticketId, aztecAddress)
    Note over BridgeManager: Lines 137-173: Claim bZEC function
    
    BridgeManager->>BridgeManager: Get deposit by ticketId
    BridgeManager->>PartialNotes: createPartialNoteProof(partialNote)
    Note over PartialNotes: Create zk-SNARK proof
    
    PartialNotes-->>BridgeManager: Proof object
    
    BridgeManager->>AztecClient: sendTransaction(claimTx)
    Note over AztecClient: Location: src/lib/aztec/aztecClient.js:90
    
    AztecClient->>AztecClient: POST /transactions
    Note over AztecClient: Lines 96-102: Send to PXE
    
    AztecClient->>AztecContract: Submit claim transaction
    AztecContract-->>AztecClient: Transaction hash (aztecTxId)
    
    AztecClient-->>BridgeManager: aztecTxId
    BridgeManager->>BridgeManager: deposit.status = 'claimed'
    
    BridgeManager-->>handleDeposit: aztecTxId
    
    handleDeposit->>Bridge: setTxHash(aztecTxId)
    handleDeposit->>Bridge: setStatus('success')
    handleDeposit->>Bridge: setIsLoading(false)
    
    Bridge->>Bridge: Show success message
    Note over Bridge: Lines 153-159: Display transaction hash
    
    Bridge-->>User: Deposit successful
```

### Bridge Withdrawal Flow (Aztec → Zcash)

```mermaid
sequenceDiagram
    participant User
    participant Bridge
    participant handleWithdrawal
    participant BridgeManager
    participant NoteManager
    participant AztecClient
    participant AztecContract
    participant EncryptedNote

    User->>Bridge: Sets direction to "Aztec → Zcash"
    Note over Bridge: Line 114: setDirection('aztec-to-zcash')
    
    User->>Bridge: Enters amount
    User->>Bridge: Clicks "Withdraw to Zcash" button
    Note over Bridge: Line 138: onClick={handleWithdrawal}
    
    Bridge->>handleWithdrawal: handleWithdrawal() called
    Note over Bridge: Lines 73-97: Withdrawal handler
    
    handleWithdrawal->>handleWithdrawal: Validate amount
    handleWithdrawal->>Bridge: setIsLoading(true)
    handleWithdrawal->>Bridge: setStatus('processing')
    
    handleWithdrawal->>NoteManager: getUnspentNotes(assetId)
    Note over NoteManager: Location: src/lib/aztec/encryptedNotes.js:111
    
    NoteManager-->>handleWithdrawal: List of unspent notes
    
    handleWithdrawal->>NoteManager: selectNotesForPayment(amount)
    Note over NoteManager: Lines 145-165: Select notes algorithm
    
    NoteManager-->>handleWithdrawal: Selected notes array
    
    handleWithdrawal->>EncryptedNote: Create withdrawal note
    Note over EncryptedNote: Location: src/lib/aztec/encryptedNotes.js:11
    
    EncryptedNote-->>handleWithdrawal: EncryptedNote instance
    
    handleWithdrawal->>BridgeManager: createWithdrawal(bzecAmount, zcashAddress, note)
    Note over BridgeManager: Location: src/lib/aztec/bridge.js:182
    
    BridgeManager->>BridgeManager: Create burn transaction
    Note over BridgeManager: Lines 185-189: Transaction object
    
    BridgeManager->>AztecClient: sendTransaction(burnTx)
    Note over AztecClient: Location: src/lib/aztec/aztecClient.js:90
    
    AztecClient->>AztecContract: Submit burn transaction
    Note over AztecContract: Burns bZEC on Aztec
    
    AztecContract-->>AztecClient: aztecTxId
    
    AztecClient-->>BridgeManager: aztecTxId
    
    BridgeManager->>BridgeManager: new BridgeWithdrawal(...)
    Note over BridgeManager: Lines 194-199: Create withdrawal object
    
    BridgeManager->>BridgeManager: withdrawals.set(aztecTxId, withdrawal)
    Note over BridgeManager: Line 201: Store withdrawal
    
    BridgeManager-->>handleWithdrawal: BridgeWithdrawal instance
    
    handleWithdrawal->>Bridge: setTxHash(aztecTxId)
    handleWithdrawal->>Bridge: setStatus('success')
    handleWithdrawal->>Bridge: setIsLoading(false)
    
    Bridge->>Bridge: Show success message
    Bridge-->>User: Withdrawal initiated
    Note over User: Operator processes withdrawal<br/>User receives ZEC on Zcash
```

---

## 💰 Stablecoin Component Flow

### Stablecoin Page Navigation

```mermaid
sequenceDiagram
    participant User
    participant AztecDashboard
    participant Router
    participant StablecoinPage
    participant Stablecoin

    User->>AztecDashboard: Clicks "Private Stablecoin" card
    Note over AztecDashboard: Location: src/pages/AztecDashboard.jsx:26-32
    
    AztecDashboard->>Router: navigate("/stablecoin")
    Router->>StablecoinPage: Route to /stablecoin
    Note over StablecoinPage: Location: src/pages/StablecoinPage.jsx
    
    StablecoinPage->>Stablecoin: Render Stablecoin component
    Note over Stablecoin: Location: src/components/stablecoin/Stablecoin.jsx
    
    Stablecoin->>Stablecoin: Initialize component
    Stablecoin-->>User: Display stablecoin interface
```

### Stablecoin Component Initialization

```mermaid
sequenceDiagram
    participant User
    participant StablecoinPage
    participant Stablecoin
    participant useEffect
    participant OracleAPI

    User->>StablecoinPage: Navigate to /stablecoin
    Note over StablecoinPage: Location: src/pages/StablecoinPage.jsx
    
    StablecoinPage->>Stablecoin: Render Stablecoin component
    Note over Stablecoin: Location: src/components/stablecoin/Stablecoin.jsx:11
    
    Stablecoin->>Stablecoin: Component mounts
    Stablecoin->>Stablecoin: useState hooks initialize
    Note over Stablecoin: Lines 12-16:<br/>- activeTab: 'mint'<br/>- zecAmount: ''<br/>- stablecoinAmount: ''<br/>- isLoading: false<br/>- zecPrice: null
    
    Stablecoin->>useEffect: useEffect(() => {...}, [])
    Note over Stablecoin: Lines 19-33: Price fetching effect
    
    useEffect->>OracleAPI: GET /api/oracle/price
    Note over OracleAPI: Fetch ZEC/USD price
    
    alt Price fetch successful
        OracleAPI-->>useEffect: { price: number }
        useEffect->>Stablecoin: setZecPrice(price)
    else Price fetch failed
        OracleAPI-->>useEffect: Error
        useEffect->>Stablecoin: Log error, keep zecPrice as null
    end
    
    useEffect->>useEffect: setInterval(fetchPrice, 60000)
    Note over useEffect: Update price every minute
    
    Stablecoin->>Stablecoin: Render UI with price
    Stablecoin-->>User: Display stablecoin interface
```

### Stablecoin Mint Flow (ZEC → pZUSD)

```mermaid
sequenceDiagram
    participant User
    participant Stablecoin
    participant Input
    participant calculateStablecoin
    participant handleMint
    participant StablecoinContract
    participant NoteManager

    User->>Input: Enters ZEC amount
    Note over Input: Location: src/components/stablecoin/Stablecoin.jsx:127-137
    
    Input->>Stablecoin: onChange event
    Note over Stablecoin: Line 132: setZecAmount(e.target.value)
    
    Stablecoin->>calculateStablecoin: calculateStablecoin(zecAmount)
    Note over calculateStablecoin: Location: Lines 38-43<br/>Formula: (zec * zecPrice) / 1.5
    
    calculateStablecoin->>Stablecoin: Check zecPrice exists
    alt zecPrice available
        calculateStablecoin->>calculateStablecoin: Calculate pZUSD
        Note over calculateStablecoin: 150% collateralization ratio
        calculateStablecoin-->>Stablecoin: pZUSD amount (formatted)
    else zecPrice not available
        calculateStablecoin-->>Stablecoin: '0'
    end
    
    Stablecoin->>Stablecoin: setStablecoinAmount(calculated)
    Note over Stablecoin: Line 134: Update pZUSD display
    
    User->>Stablecoin: Clicks "Mint pZUSD" button
    Note over Stablecoin: Lines 163-179: Button onClick={handleMint}
    
    Stablecoin->>handleMint: handleMint() called
    Note over Stablecoin: Lines 58-79: Mint handler
    
    handleMint->>handleMint: Validate zecAmount
    Note over Stablecoin: Lines 59-62: Check amount > 0
    
    handleMint->>Stablecoin: setIsLoading(true)
    Note over Stablecoin: Line 64: Set loading state
    
    handleMint->>calculateStablecoin: calculateStablecoin(zecAmount)
    calculateStablecoin-->>handleMint: pZUSD amount
    
    handleMint->>StablecoinContract: Deposit ZEC to collateral pool
    Note over StablecoinContract: On-chain transaction
    
    StablecoinContract->>StablecoinContract: Check collateralization ratio
    Note over StablecoinContract: Must be >= 150%
    
    StablecoinContract->>StablecoinContract: Mint pZUSD tokens
    StablecoinContract-->>handleMint: Transaction hash
    
    handleMint->>NoteManager: Update encrypted notes
    Note over NoteManager: Add new pZUSD notes
    
    handleMint->>Stablecoin: toast.success(`Minting ${calculated} pZUSD`)
    Note over Stablecoin: Line 72: Show success message
    
    handleMint->>Stablecoin: setIsLoading(false)
    Note over Stablecoin: Line 77: Clear loading state
    
    Stablecoin-->>User: Mint successful
```

### Stablecoin Burn Flow (pZUSD → ZEC)

```mermaid
sequenceDiagram
    participant User
    participant Stablecoin
    participant Input
    participant calculateZEC
    participant handleBurn
    participant NoteManager
    participant StablecoinContract
    participant Oracle

    User->>Stablecoin: Switches to "Redeem ZEC" tab
    Note over Stablecoin: Line 184: Tab key="burn"
    
    User->>Input: Enters pZUSD amount
    Note over Input: Location: Lines 188-198
    
    Input->>Stablecoin: onChange event
    Note over Stablecoin: Line 193: setStablecoinAmount(e.target.value)
    
    Stablecoin->>calculateZEC: calculateZEC(stablecoinAmount)
    Note over calculateZEC: Location: Lines 48-53<br/>Formula: stablecoin / zecPrice
    
    calculateZEC->>calculateZEC: Check zecPrice exists
    alt zecPrice available
        calculateZEC->>calculateZEC: Calculate ZEC amount
        Note over calculateZEC: 1:1 redemption ratio
        calculateZEC-->>Stablecoin: ZEC amount (formatted to 8 decimals)
    else zecPrice not available
        calculateZEC-->>Stablecoin: '0'
    end
    
    Stablecoin->>Stablecoin: setZecAmount(calculated)
    Note over Stablecoin: Line 195: Update ZEC display
    
    User->>Stablecoin: Clicks "Redeem ZEC" button
    Note over Stablecoin: Lines 224-240: Button onClick={handleBurn}
    
    Stablecoin->>handleBurn: handleBurn() called
    Note over Stablecoin: Lines 84-105: Burn handler
    
    handleBurn->>handleBurn: Validate stablecoinAmount
    Note over Stablecoin: Lines 85-88: Check amount > 0
    
    handleBurn->>Stablecoin: setIsLoading(true)
    Note over Stablecoin: Line 90: Set loading state
    
    handleBurn->>NoteManager: selectNotesForPayment(amount, assetId)
    Note over NoteManager: Location: src/lib/aztec/encryptedNotes.js:145
    
    NoteManager->>NoteManager: Get unspent pZUSD notes
    NoteManager-->>handleBurn: Selected notes array
    
    handleBurn->>StablecoinContract: Burn pZUSD transaction
    Note over StablecoinContract: On-chain transaction
    
    StablecoinContract->>Oracle: Get current ZEC/USD price
    Note over Oracle: Fetch latest price
    
    Oracle-->>StablecoinContract: Current price
    
    StablecoinContract->>StablecoinContract: Calculate ZEC to return
    Note over StablecoinContract: 1:1 redemption: 1 pZUSD = (1/price) ZEC
    
    StablecoinContract->>StablecoinContract: Transfer ZEC from collateral pool
    StablecoinContract-->>handleBurn: Transaction hash
    
    handleBurn->>NoteManager: markSpent(nullifier)
    Note over NoteManager: Mark notes as spent
    
    handleBurn->>calculateZEC: calculateZEC(stablecoinAmount)
    calculateZEC-->>handleBurn: ZEC amount
    
    handleBurn->>Stablecoin: toast.success(`Redeeming ${calculated} ZEC`)
    Note over Stablecoin: Line 98: Show success message
    
    handleBurn->>Stablecoin: setIsLoading(false)
    Note over Stablecoin: Line 103: Clear loading state
    
    Stablecoin-->>User: Burn successful
```

### Stablecoin Tab Switching Flow

```mermaid
stateDiagram-v2
    [*] --> MintTab: Component mounts
    
    MintTab --> UserEntersZEC: User on Mint tab
    UserEntersZEC --> CalculatePZUSD: ZEC amount entered
    CalculatePZUSD --> ShowPZUSD: pZUSD calculated
    ShowPZUSD --> ClickMint: User clicks Mint button
    ClickMint --> Minting: Transaction processing
    Minting --> MintSuccess: Transaction confirmed
    MintSuccess --> MintTab: Reset form
    
    MintTab --> SwitchToBurn: User clicks Burn tab
    SwitchToBurn --> BurnTab: Tab switched
    
    BurnTab --> UserEntersPZUSD: User on Burn tab
    UserEntersPZUSD --> CalculateZEC: pZUSD amount entered
    CalculateZEC --> ShowZEC: ZEC calculated
    ShowZEC --> ClickBurn: User clicks Redeem button
    ClickBurn --> Burning: Transaction processing
    Burning --> BurnSuccess: Transaction confirmed
    BurnSuccess --> BurnTab: Reset form
    
    BurnTab --> SwitchToMint: User clicks Mint tab
    SwitchToMint --> MintTab: Tab switched
```

---

## 🔌 Aztec Client Initialization

### PXE Client Connection Flow

```mermaid
sequenceDiagram
    participant Component
    participant Index
    participant AztecClient
    participant Config
    participant PXEServer

    Component->>Index: createConfiguredPXEClient('testnet')
    Note over Index: Location: src/lib/aztec/index.js:66
    
    Index->>Config: Check AZTEC_CONFIG
    Note over Config: Lines 29-43: Configuration object
    
    Config->>Index: Get PXE_URL or network default
    Index->>Index: getPXEUrl('testnet')
    Note over Index: Lines 50-59: URL resolution logic
    
    alt Custom PXE URL set
        Index->>Index: Return VITE_AZTEC_PXE_URL
    else Use default
        Index->>Index: Return TESTNET_PXE or MAINNET_PXE
    end
    
    Index->>AztecClient: createAztecPXEClient(pxeUrl)
    Note over AztecClient: Location: src/lib/aztec/aztecClient.js:144
    
    AztecClient->>AztecClient: new AztecPXEClient(pxeUrl)
    Note over AztecClient: Lines 12-16: Constructor
    
    AztecClient-->>Index: Client instance (not connected)
    Index-->>Component: PXE client instance
    
    Component->>AztecClient: client.connect()
    Note over AztecClient: Lines 22-39: Connect method
    
    AztecClient->>AztecClient: Check isConnected
    alt Not connected
        AztecClient->>PXEServer: GET ${pxeUrl}/status
        Note over PXEServer: Aztec PXE server
        
        alt Server responds OK
            PXEServer-->>AztecClient: 200 OK
            AztecClient->>AztecClient: this.isConnected = true
            AztecClient-->>Component: true (connected)
        else Server error
            PXEServer-->>AztecClient: Error response
            AztecClient->>AztecClient: this.isConnected = false
            AztecClient-->>Component: Error thrown
        end
    else Already connected
        AztecClient-->>Component: true (already connected)
    end
```

---

## 📝 Encrypted Notes Flow

### Note Management Operations

```mermaid
sequenceDiagram
    participant Component
    participant NoteManager
    participant EncryptedNote
    participant PXEClient
    participant AztecNetwork

    Component->>NoteManager: createNoteManager()
    Note over NoteManager: Location: src/lib/aztec/encryptedNotes.js:201
    
    NoteManager->>NoteManager: new NoteManager()
    Note over NoteManager: Lines 58-62: Initialize with empty maps
    
    NoteManager-->>Component: NoteManager instance
    
    Component->>PXEClient: getNotes(address)
    Note over PXEClient: Location: src/lib/aztec/aztecClient.js:68
    
    PXEClient->>AztecNetwork: GET /accounts/{address}/notes
    AztecNetwork-->>PXEClient: Array of note data
    
    PXEClient-->>Component: Notes array
    
    loop For each note
        Component->>EncryptedNote: EncryptedNote.fromJSON(noteData)
        Note over EncryptedNote: Location: src/lib/aztec/encryptedNotes.js:41
        
        EncryptedNote-->>Component: EncryptedNote instance
        
        Component->>NoteManager: addNote(note)
        Note over NoteManager: Lines 68-70: Store note by commitment
    end
    
    Component->>NoteManager: getBalance(assetId)
    Note over NoteManager: Lines 130-137: Calculate balance
    
    NoteManager->>NoteManager: getUnspentNotes(assetId)
    NoteManager->>NoteManager: Sum note values
    NoteManager-->>Component: Total balance
    
    Component->>NoteManager: selectNotesForPayment(amount, assetId)
    Note over NoteManager: Lines 145-165: Selection algorithm
    
    NoteManager->>NoteManager: Get unspent notes
    NoteManager->>NoteManager: Select notes until amount covered
    NoteManager-->>Component: Selected notes array
    
    Component->>NoteManager: markSpent(nullifier)
    Note over NoteManager: Lines 85-95: Mark as spent
    
    NoteManager->>NoteManager: nullifiers.add(nullifier)
    NoteManager->>NoteManager: Remove note from notes map
    NoteManager-->>Component: Note marked as spent
```

---

## 🎬 Complete User Interaction Journey

### End-to-End Bridge Deposit Journey

```mermaid
journey
    title Complete Bridge Deposit User Journey
    section Navigation
      User clicks Aztec in navbar: 5: User, Navbar
      Router loads AztecDashboard: 4: Router
      Dashboard displays features: 5: AztecDashboard
    section Bridge Access
      User clicks Zcash Bridge card: 5: User, AztecDashboard
      Navigate to /bridge: 4: React Router
      BridgePage renders: 4: BridgePage
      Bridge component mounts: 4: Bridge
    section Initialization
      useEffect runs: 4: Bridge
      Initialize Zcash wallet: 3: ZcashLib
      Connect to Aztec PXE: 3: AztecClient
      Bridge manager ready: 5: BridgeManager
    section Deposit Process
      User enters amount: 4: User
      User clicks Deposit button: 5: User
      Validate amount: 4: Bridge
      Send ZEC to bridge: 3: ZcashWallet
      Generate partial note: 4: PartialNotes
      Create deposit ticket: 4: BridgeManager
      Claim bZEC on Aztec: 3: AztecClient
      Transaction confirmed: 5: AztecNetwork
      Show success: 5: Bridge
```

### Component Interaction Map

```mermaid
graph LR
    subgraph "User Actions"
        ClickNavbar[Click Aztec in Navbar]
        ClickCard[Click Feature Card]
        EnterAmount[Enter Amount]
        ClickButton[Click Action Button]
    end
    
    subgraph "Frontend Components"
        Navbar[Navbar.jsx]
        Dashboard[AztecDashboard.jsx]
        BridgePage[BridgePage.jsx]
        Bridge[Bridge.jsx]
    end
    
    subgraph "Library Modules"
        Index[index.js]
        Client[aztecClient.js]
        BridgeLib[bridge.js]
        Notes[encryptedNotes.js]
    end
    
    subgraph "External Services"
        PXE[Aztec PXE Server]
        Zcash[Zcash Network]
        Aztec[Aztec Network]
    end
    
    ClickNavbar --> Navbar
    Navbar --> Dashboard
    ClickCard --> Dashboard
    Dashboard --> BridgePage
    BridgePage --> Bridge
    
    EnterAmount --> Bridge
    ClickButton --> Bridge
    
    Bridge --> Index
    Index --> Client
    Index --> BridgeLib
    Index --> Notes
    
    BridgeLib --> Client
    BridgeLib --> Notes
    
    Client --> PXE
    BridgeLib --> Zcash
    BridgeLib --> Aztec
```

---

## 🔄 State Management Flow

### Bridge Component State Flow

```mermaid
stateDiagram-v2
    [*] --> Idle: Component Mounts
    
    Idle --> Initializing: useEffect runs
    Initializing --> Ready: Initialization complete
    Initializing --> Error: Initialization failed
    
    Ready --> InputAmount: User enters amount
    InputAmount --> Validating: User clicks button
    
    Validating --> Processing: Amount valid
    Validating --> InputAmount: Amount invalid
    
    Processing --> Depositing: Direction = zcash-to-aztec
    Processing --> Withdrawing: Direction = aztec-to-zcash
    
    Depositing --> WaitingZcash: Send ZEC transaction
    WaitingZcash --> CreatingTicket: Zcash confirmed
    CreatingTicket --> Claiming: Ticket created
    Claiming --> Success: bZEC claimed
    
    Withdrawing --> SelectingNotes: Get unspent notes
    SelectingNotes --> Burning: Notes selected
    Burning --> Success: bZEC burned
    
    Success --> Idle: Reset form
    Error --> Idle: Retry
```

---

## 📊 Code Execution Timeline

### Detailed Execution Flow with File Locations

```mermaid
gantt
    title Aztec Bridge Deposit Execution Timeline
    dateFormat X
    axisFormat %L ms
    
    section User Interaction
    Click Aztec in Navbar          :0, 100
    Router Navigation               :100, 200
    Dashboard Render                :200, 300
    Click Bridge Card               :300, 400
    Navigate to Bridge              :400, 500
    
    section Component Initialization
    Bridge Component Mount          :500, 600
    useState Hooks                  :600, 650
    useEffect Trigger               :650, 700
    
    section Zcash Initialization
    Create RPC Client               :700, 800
    Create Zcash Wallet             :800, 900
    Initialize Wallet               :900, 1500
    
    section Aztec Initialization
    Get PXE URL                     :1500, 1600
    Create PXE Client               :1600, 1700
    Connect to PXE                  :1700, 2500
    
    section User Action
    Enter Amount                    :2500, 3000
    Click Deposit Button            :3000, 3100
    
    section Deposit Process
    Validate Amount                 :3100, 3200
    Send ZEC Transaction            :3200, 10000
    Generate Partial Note           :10000, 11000
    Create Deposit Ticket           :11000, 11100
    Claim bZEC                      :11100, 20000
    Show Success                    :20000, 20100
```

---

## 🗂️ File Reference Map

### Complete File Structure with Line Numbers

| File | Purpose | Key Functions/Lines |
|------|---------|---------------------|
| `src/pages/AztecDashboard.jsx` | Landing page | `navigate()` - Lines 16, 51, 109, 131 |
| `src/pages/BridgePage.jsx` | Route wrapper | `Bridge` component - Line 4 |
| `src/pages/StablecoinPage.jsx` | Route wrapper | `Stablecoin` component - Line 4 |
| `src/components/bridge/Bridge.jsx` | Bridge UI | `handleDeposit()` - Lines 44-68<br/>`handleWithdrawal()` - Lines 73-97<br/>`useEffect()` - Lines 22-39 |
| `src/components/shared/Navbar.jsx` | Navigation | Aztec link - Lines 55-63 |
| `src/router.jsx` | Routing | Aztec routes - Lines 145-156 |
| `src/lib/aztec/index.js` | Main entry | `createConfiguredPXEClient()` - Line 66<br/>`getPXEUrl()` - Line 50 |
| `src/lib/aztec/aztecClient.js` | PXE client | `connect()` - Lines 22-39<br/>`sendTransaction()` - Lines 90-114<br/>`getNotes()` - Lines 68-83 |
| `src/lib/aztec/bridge.js` | Bridge logic | `createDeposit()` - Lines 106-129<br/>`claimBZEC()` - Lines 137-173<br/>`createWithdrawal()` - Lines 182-208 |
| `src/lib/aztec/encryptedNotes.js` | Note management | `addNote()` - Lines 68-70<br/>`getBalance()` - Lines 130-137<br/>`selectNotesForPayment()` - Lines 145-165 |

---

## 🎯 Key Interaction Points

### Where User Clicks and What Happens

```mermaid
flowchart TD
    Start([User on App]) --> NavbarClick{User clicks<br/>in Navbar}
    
    NavbarClick -->|Aztec link| NavbarHandler[Navbar.jsx:56<br/>to='/aztec']
    NavbarHandler --> RouterMatch[Router matches /aztec]
    RouterMatch --> DashboardLoad[Lazy load AztecDashboard.jsx]
    DashboardLoad --> DashboardRender[Render dashboard]
    
    DashboardRender --> CardClick{User clicks<br/>feature card}
    
    CardClick -->|Zcash Bridge| BridgeCard[AztecDashboard.jsx:109<br/>onPress={() => navigate('/bridge')}]
    CardClick -->|Private Stablecoin| StablecoinCard[AztecDashboard.jsx:131<br/>onPress={() => navigate('/stablecoin')}]
    
    BridgeCard --> BridgePageLoad[Load BridgePage.jsx]
    BridgePageLoad --> BridgeComponent[Render Bridge.jsx]
    
    BridgeComponent --> InitEffect[Bridge.jsx:22<br/>useEffect initialization]
    InitEffect --> ZcashInit[Initialize Zcash wallet]
    InitEffect --> AztecInit[Initialize Aztec PXE]
    
    BridgeComponent --> DirectionToggle{Bridge.jsx:106-117<br/>User toggles direction}
    DirectionToggle --> SetDirection[setDirection state]
    
    BridgeComponent --> AmountInput[Bridge.jsx:121-132<br/>User enters amount]
    AmountInput --> UpdateAmount[setAmount state]
    
    BridgeComponent --> ButtonClick{Bridge.jsx:134-150<br/>User clicks button}
    
    ButtonClick -->|direction === 'zcash-to-aztec'| DepositHandler[Bridge.jsx:44<br/>handleDeposit()]
    ButtonClick -->|direction === 'aztec-to-zcash'| WithdrawHandler[Bridge.jsx:73<br/>handleWithdrawal()]
    
    DepositHandler --> ValidateAmount[Validate amount > 0]
    ValidateAmount --> SetLoading[setIsLoading(true)]
    SetLoading --> ZcashSend[Send ZEC to bridge]
    ZcashSend --> CreateDeposit[bridge.js:106<br/>createDeposit()]
    CreateDeposit --> ClaimBZEC[bridge.js:137<br/>claimBZEC()]
    ClaimBZEC --> ShowSuccess[Show success message]
    
    WithdrawHandler --> ValidateAmount2[Validate amount > 0]
    ValidateAmount2 --> SetLoading2[setIsLoading(true)]
    SetLoading2 --> SelectNotes[Select unspent notes]
    SelectNotes --> CreateWithdrawal[bridge.js:182<br/>createWithdrawal()]
    CreateWithdrawal --> BurnBZEC[Burn bZEC on Aztec]
    BurnBZEC --> ShowSuccess2[Show success message]
```

---

---

## 📚 Complete Code File Reference

### All Aztec-Related Files

| File Path | Lines | Purpose | Key Exports/Functions |
|-----------|-------|---------|----------------------|
| `src/pages/AztecDashboard.jsx` | 1-165 | Landing page | `AztecDashboard` component |
| `src/pages/BridgePage.jsx` | 1-10 | Route wrapper | `BridgePage` component |
| `src/pages/StablecoinPage.jsx` | 1-10 | Route wrapper | `StablecoinPage` component |
| `src/components/bridge/Bridge.jsx` | 1-189 | Bridge UI | `Bridge` component<br/>`handleDeposit()` - Line 44<br/>`handleWithdrawal()` - Line 73 |
| `src/components/stablecoin/Stablecoin.jsx` | 1-272 | Stablecoin UI | `Stablecoin` component<br/>`handleMint()` - Line 58<br/>`handleBurn()` - Line 84<br/>`calculateStablecoin()` - Line 38<br/>`calculateZEC()` - Line 48 |
| `src/components/shared/Navbar.jsx` | 55-63 | Navigation | Aztec link with `to="/aztec"` |
| `src/router.jsx` | 145-156 | Routing | `/aztec`, `/bridge`, `/stablecoin` routes |
| `src/lib/aztec/index.js` | 1-73 | Main entry point | `createConfiguredPXEClient()` - Line 66<br/>`getPXEUrl()` - Line 50<br/>`AZTEC_CONFIG` - Line 29 |
| `src/lib/aztec/aztecClient.js` | 1-151 | PXE client | `AztecPXEClient` class<br/>`connect()` - Line 22<br/>`sendTransaction()` - Line 90<br/>`getNotes()` - Line 68<br/>`getAccount()` - Line 46 |
| `src/lib/aztec/bridge.js` | 1-251 | Bridge logic | `BridgeManager` class<br/>`createDeposit()` - Line 106<br/>`claimBZEC()` - Line 137<br/>`createWithdrawal()` - Line 182<br/>`BridgeDeposit` class - Line 15<br/>`BridgeWithdrawal` class - Line 53 |
| `src/lib/aztec/encryptedNotes.js` | 1-208 | Note management | `NoteManager` class<br/>`EncryptedNote` class - Line 11<br/>`addNote()` - Line 68<br/>`getBalance()` - Line 130<br/>`selectNotesForPayment()` - Line 145<br/>`markSpent()` - Line 85 |

### Code File Dependencies Graph

```mermaid
graph TD
    subgraph "Frontend Entry Points"
        Navbar[Navbar.jsx<br/>Line 55-63]
        Router[router.jsx<br/>Lines 145-156]
    end
    
    subgraph "Page Components"
        AztecDashboard[AztecDashboard.jsx<br/>Lines 1-165]
        BridgePage[BridgePage.jsx<br/>Lines 1-10]
        StablecoinPage[StablecoinPage.jsx<br/>Lines 1-10]
    end
    
    subgraph "UI Components"
        Bridge[Bridge.jsx<br/>Lines 1-189]
        Stablecoin[Stablecoin.jsx<br/>Lines 1-272]
    end
    
    subgraph "Library Core"
        Index[index.js<br/>Lines 1-73]
        Client[aztecClient.js<br/>Lines 1-151]
        BridgeLib[bridge.js<br/>Lines 1-251]
        Notes[encryptedNotes.js<br/>Lines 1-208]
    end
    
    Navbar -->|navigate| AztecDashboard
    Router -->|route| AztecDashboard
    Router -->|route| BridgePage
    Router -->|route| StablecoinPage
    
    AztecDashboard -->|navigate| BridgePage
    AztecDashboard -->|navigate| StablecoinPage
    
    BridgePage --> Bridge
    StablecoinPage --> Stablecoin
    
    Bridge -->|import| Index
    Stablecoin -->|import| Index
    
    Index -->|export| Client
    Index -->|export| BridgeLib
    Index -->|export| Notes
    
    Bridge -->|import| BridgeLib
    Bridge -->|import| Client
    BridgeLib -->|uses| Client
    BridgeLib -->|uses| Notes
```

---

## 🎯 Complete Click-to-Action Map

### Every User Click and What It Triggers

```mermaid
flowchart TD
    Start([User on App]) --> NavbarClick[Click Aztec in Navbar<br/>Navbar.jsx:56]
    
    NavbarClick --> NavbarHandler[to='/aztec'<br/>React Router navigation]
    NavbarHandler --> DashboardLoad[Lazy load AztecDashboard.jsx<br/>router.jsx:147]
    DashboardLoad --> DashboardRender[Render AztecDashboard<br/>AztecDashboard.jsx:15]
    
    DashboardRender --> CardHover[User hovers card<br/>AztecDashboard.jsx:108]
    CardHover --> CardClick{User clicks card}
    
    CardClick -->|Zcash Bridge| BridgeCardClick[onPress={() => navigate('/bridge')}<br/>AztecDashboard.jsx:109]
    CardClick -->|Private Stablecoin| StablecoinCardClick[onPress={() => navigate('/stablecoin')}<br/>AztecDashboard.jsx:131]
    
    BridgeCardClick --> BridgeRoute[Route to /bridge<br/>router.jsx:150]
    BridgeRoute --> BridgePageLoad[Load BridgePage.jsx<br/>BridgePage.jsx:4]
    BridgePageLoad --> BridgeComponent[Render Bridge.jsx<br/>Bridge.jsx:14]
    
    BridgeComponent --> BridgeInit[useEffect initialization<br/>Bridge.jsx:22-39]
    BridgeInit --> ZcashInit[Initialize Zcash<br/>Bridge.jsx:25-27]
    BridgeInit --> AztecInit[Connect to PXE<br/>Bridge.jsx:29-30]
    
    BridgeComponent --> DirectionToggle[Toggle direction<br/>Bridge.jsx:106-117<br/>setDirection()]
    DirectionToggle --> AmountInput[Enter amount<br/>Bridge.jsx:121-132<br/>setAmount()]
    
    AmountInput --> DepositButton{Click Deposit?<br/>Bridge.jsx:138}
    AmountInput --> WithdrawButton{Click Withdraw?<br/>Bridge.jsx:138}
    
    DepositButton -->|Yes| DepositHandler[handleDeposit()<br/>Bridge.jsx:44]
    DepositHandler --> ZcashSend[Send ZEC to bridge<br/>Bridge.jsx:54]
    ZcashSend --> CreateDeposit[createDeposit()<br/>bridge.js:106]
    CreateDeposit --> ClaimBZEC[claimBZEC()<br/>bridge.js:137]
    ClaimBZEC --> AztecTx[Send transaction<br/>aztecClient.js:90]
    AztecTx --> DepositSuccess[Show success<br/>Bridge.jsx:59]
    
    WithdrawButton -->|Yes| WithdrawHandler[handleWithdrawal()<br/>Bridge.jsx:73]
    WithdrawHandler --> SelectNotes[Select notes<br/>encryptedNotes.js:145]
    SelectNotes --> CreateWithdrawal[createWithdrawal()<br/>bridge.js:182]
    CreateWithdrawal --> BurnBZEC[Burn bZEC<br/>aztecClient.js:90]
    BurnBZEC --> WithdrawSuccess[Show success<br/>Bridge.jsx:88]
    
    StablecoinCardClick --> StablecoinRoute[Route to /stablecoin<br/>router.jsx:154]
    StablecoinRoute --> StablecoinPageLoad[Load StablecoinPage.jsx<br/>StablecoinPage.jsx:4]
    StablecoinPageLoad --> StablecoinComponent[Render Stablecoin.jsx<br/>Stablecoin.jsx:11]
    
    StablecoinComponent --> PriceFetch[Fetch ZEC price<br/>Stablecoin.jsx:19-33<br/>useEffect]
    PriceFetch --> TabSwitch{Which tab?}
    
    TabSwitch -->|Mint| MintTab[Mint tab<br/>Stablecoin.jsx:123]
    TabSwitch -->|Burn| BurnTab[Burn tab<br/>Stablecoin.jsx:184]
    
    MintTab --> EnterZEC[Enter ZEC amount<br/>Stablecoin.jsx:127-137]
    EnterZEC --> CalcPZUSD[calculateStablecoin()<br/>Stablecoin.jsx:38]
    CalcPZUSD --> ClickMint[Click Mint button<br/>Stablecoin.jsx:167]
    ClickMint --> MintHandler[handleMint()<br/>Stablecoin.jsx:58]
    MintHandler --> MintTx[Mint transaction<br/>Stablecoin.jsx:67-69]
    MintTx --> MintSuccess[Show success<br/>Stablecoin.jsx:72]
    
    BurnTab --> EnterPZUSD[Enter pZUSD amount<br/>Stablecoin.jsx:188-198]
    EnterPZUSD --> CalcZEC[calculateZEC()<br/>Stablecoin.jsx:48]
    CalcZEC --> ClickBurn[Click Redeem button<br/>Stablecoin.jsx:228]
    ClickBurn --> BurnHandler[handleBurn()<br/>Stablecoin.jsx:84]
    BurnHandler --> BurnTx[Burn transaction<br/>Stablecoin.jsx:93-95]
    BurnTx --> BurnSuccess[Show success<br/>Stablecoin.jsx:98]
```

---

## 🔍 Detailed Function Call Trace

### Bridge Deposit Complete Trace

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Bridge_jsx as Bridge.jsx
    participant bridge_js as bridge.js
    participant aztecClient_js as aztecClient.js
    participant encryptedNotes_js as encryptedNotes.js
    participant zcash_lib as zcash/index.js
    participant Blockchain

    Note over User,Blockchain: User clicks "Deposit to Aztec" button
    
    User->>Bridge_jsx: Click button (Line 138)
    Bridge_jsx->>Bridge_jsx: handleDeposit() called (Line 44)
    Bridge_jsx->>Bridge_jsx: Validate amount (Line 45-48)
    Bridge_jsx->>Bridge_jsx: setIsLoading(true) (Line 50)
    Bridge_jsx->>Bridge_jsx: setStatus('processing') (Line 51)
    
    Bridge_jsx->>zcash_lib: Send ZEC to bridge address (Line 54)
    zcash_lib->>Blockchain: Submit ZEC transaction
    Blockchain-->>zcash_lib: zcashTxId
    zcash_lib-->>Bridge_jsx: zcashTxId returned
    
    Bridge_jsx->>bridge_js: createDeposit(zcashTxId, note, amount) (Line 106)
    bridge_js->>bridge_js: generatePartialNote(zcashNote) (Line 109)
    bridge_js->>bridge_js: generateTicketId() (Line 112)
    bridge_js->>bridge_js: new BridgeDeposit(...) (Line 115-120)
    bridge_js->>bridge_js: deposits.set(ticketId, deposit) (Line 122)
    bridge_js-->>Bridge_jsx: BridgeDeposit instance
    
    Bridge_jsx->>bridge_js: claimBZEC(ticketId, aztecAddress) (Line 137)
    bridge_js->>bridge_js: Get deposit by ticketId (Line 139)
    bridge_js->>bridge_js: createPartialNoteProof() (Line 150)
    bridge_js->>bridge_js: Create claim transaction (Line 156-162)
    bridge_js->>aztecClient_js: sendTransaction(transaction) (Line 164)
    
    aztecClient_js->>aztecClient_js: Check isConnected (Line 91)
    aztecClient_js->>aztecClient_js: POST /transactions (Line 96-102)
    aztecClient_js->>Blockchain: Submit to Aztec PXE
    Blockchain-->>aztecClient_js: aztecTxId
    aztecClient_js-->>bridge_js: aztecTxId
    
    bridge_js->>bridge_js: deposit.status = 'claimed' (Line 166)
    bridge_js-->>Bridge_jsx: aztecTxId
    
    Bridge_jsx->>Bridge_jsx: setTxHash(aztecTxId) (Line 153)
    Bridge_jsx->>Bridge_jsx: setStatus('success') (Line 60)
    Bridge_jsx->>Bridge_jsx: setIsLoading(false) (Line 66)
    Bridge_jsx->>Bridge_jsx: Show success UI (Line 153-159)
    Bridge_jsx-->>User: Deposit successful
```

---

This documentation provides a complete view of all Aztec code files, their relationships, and how every user click triggers actions throughout the system. Each diagram shows the exact file locations and line numbers where actions occur.

