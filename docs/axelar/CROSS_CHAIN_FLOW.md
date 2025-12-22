# Cross-Chain Stealth Payment Flow

## Overview

PrivatePay uses Axelar's Interchain Token Service (ITS) to enable cross-chain stealth payments. This document explains the complete flow.

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph "Source Chain (Ethereum Sepolia)"
        U[User Wallet] --> B1[AxelarStealthBridge]
        B1 --> ITS1[ITS Contract]
        ITS1 --> GW1[Axelar Gateway]
    end
    
    subgraph "Axelar Network"
        GW1 --> V[Validators<br/>75+ nodes]
        V --> |Vote & Confirm| R[Relayers]
    end
    
    subgraph "Destination Chain (Base Sepolia)"
        R --> GW2[Axelar Gateway]
        GW2 --> ITS2[ITS Contract]
        ITS2 --> B2[AxelarStealthBridge]
        B2 --> SA[Stealth Address<br/>0xRandom...]
    end
    
    style SA fill:#90EE90
    style V fill:#FFD700
```

---

## ⏱️ Why Does It Take 15-30 Minutes?

```mermaid
sequenceDiagram
    participant User as User Wallet
    participant Bridge as Source Bridge
    participant Axelar as Axelar Network
    participant Dest as Destination Bridge
    participant Stealth as Stealth Address
    
    Note over User,Bridge: ~15 seconds
    User->>Bridge: sendCrossChainStealthPaymentITS()
    Bridge->>Bridge: Lock TUSDC tokens
    Bridge-->>User: ✅ Source TX Confirmed
    
    Note over Bridge,Axelar: ~2-5 minutes
    Bridge->>Axelar: Gateway Event Detected
    Axelar->>Axelar: Validators Vote (PoS Consensus)
    
    Note over Axelar: ~5-10 minutes
    Axelar->>Axelar: Message Approved
    
    Note over Axelar,Dest: ~3-5 minutes
    Axelar->>Dest: Relay Message
    
    Note over Dest,Stealth: ~15 seconds
    Dest->>Stealth: Mint/Release TUSDC
    
    Note over User,Stealth: Total: 15-30 minutes
```

### Breakdown

| Step | Duration | What Happens |
|------|----------|--------------|
| Source Chain Confirmation | ~15 sec | Transaction confirmed on Ethereum Sepolia |
| Axelar Detection | 2-5 min | Validators detect gateway event |
| Validator Voting | 5-10 min | 75+ validators reach consensus |
| Message Approval | 3-5 min | Message approved on Axelar network |
| Relay to Destination | 3-5 min | Relayers submit to Base Sepolia |
| Destination Execution | ~15 sec | TUSDC minted to stealth address |

**Total: 15-30 minutes** (Standard GMP)

> 💡 **Express Mode** can reduce this to ~30 seconds but costs extra gas.

---

## 🪙 TUSDC Token Deployment

TUSDC is deployed via Axelar ITS (Interchain Token Service) using **CREATE3**, which gives it the **same address on all chains**.

```mermaid
graph LR
    subgraph "Ethereum Sepolia"
        T1[TUSDC<br/>0x5EF8B...]
        TM1[Token Manager<br/>0x1e2f2E...]
    end
    
    subgraph "Base Sepolia"
        T2[TUSDC<br/>0x5EF8B...]
        TM2[Token Manager<br/>0x1e2f2E...]
    end
    
    T1 <-->|ITS Cross-Chain| T2
    
    style T1 fill:#4169E1
    style T2 fill:#4169E1
```

### Token Addresses

| Network | TUSDC Address | Token Manager |
|---------|---------------|---------------|
| Ethereum Sepolia | `0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B` | `0x1e2f2E68ea65212Ec6F3D91f39E6B644fE41e29B` |
| Base Sepolia | `0x5EF8B232E6e5243bf9fAe7E725275A8B0800924B` | `0x1e2f2E68ea65212Ec6F3D91f39E6B644fE41e29B` |

---

## 🔍 What Appears on Block Explorers?

### Source Chain (Etherscan Sepolia)

```mermaid
graph LR
    subgraph "Transaction Details"
        S[Sender<br/>0xYour...] -->|10 TUSDC| B[Bridge Contract<br/>0x04ab...]
        B -->|interchainTransfer| ITS[ITS<br/>0xB5FB...]
    end
    
    subgraph "Visible Data"
        D1[From: 0xYourWallet]
        D2[To: Bridge Contract]
        D3[Value: 0.003 ETH gas]
        D4[Token: 10 TUSDC]
    end
```

### Axelarscan (Cross-Chain Explorer)

```
┌─────────────────────────────────────────────────────────────┐
│                    Axelarscan GMP TX                        │
├─────────────────────────────────────────────────────────────┤
│ Source Chain:       ethereum-sepolia                        │
│ Destination Chain:  base-sepolia                            │
│ Status:             ✅ executed                             │
│ Type:               interchainTransfer                      │
│ Amount:             10 TUSDC                                │
│ Gas Paid:           0.003 ETH                               │
│ Time:               ~18 minutes                             │
└─────────────────────────────────────────────────────────────┘
```

### Destination Chain (BaseScan Sepolia)

```mermaid
graph LR
    subgraph "Internal Transaction"
        ITS[ITS Contract] -->|Execute| B[Bridge Contract]
        B -->|10 TUSDC| SA[Stealth Address<br/>0xRandom...]
    end
```

---

## 🔒 Privacy Analysis: Is Source Identifiable?

```mermaid
graph TB
    subgraph "❌ VISIBLE (Public)"
        V1[Sender Wallet Address]
        V2[Amount Transferred]
        V3[Bridge Contract Called]
        V4[Cross-Chain Route]
        V5[Stealth Address Received Funds]
    end
    
    subgraph "✅ HIDDEN (Private)"
        H1[Recipient's Real Wallet]
        H2[Link: Sender ↔ Recipient]
        H3[Stealth → Main Wallet Transfer]
        H4[Who Controls Stealth Address]
    end
    
    style V1 fill:#FF6B6B
    style V2 fill:#FF6B6B
    style V3 fill:#FF6B6B
    style V4 fill:#FF6B6B
    style V5 fill:#FF6B6B
    
    style H1 fill:#90EE90
    style H2 fill:#90EE90
    style H3 fill:#90EE90
    style H4 fill:#90EE90
```

### Privacy Summary

| Aspect | Level | Details |
|--------|-------|---------|
| **Sender Identity** | ❌ Visible | Sender's wallet is shown on source chain |
| **Recipient Identity** | ✅ Hidden | Only random stealth address visible |
| **Amount** | ❌ Visible | Transfer amount is public |
| **Sender-Recipient Link** | ✅ Hidden | No one can link sender to recipient's real wallet |
| **Withdrawal** | ✅ Private | Stealth → Main wallet link is unlinkable |

---

## 🏦 How Bridge Contracts Work (Not Treasury)

**Important Clarification:** We're NOT triggering a "treasury" on both chains. Here's what actually happens:

```mermaid
sequenceDiagram
    participant User as User
    participant SrcBridge as Source Bridge<br/>(Eth Sepolia)
    participant ITS as ITS Protocol
    participant DstBridge as Dest Bridge<br/>(Base Sepolia)
    participant Stealth as Stealth Address
    
    Note over User,SrcBridge: User initiates payment
    User->>SrcBridge: Send 10 TUSDC + payload
    
    Note over SrcBridge,ITS: Token handled by ITS
    SrcBridge->>ITS: transferFrom(user, ITS, 10 TUSDC)
    SrcBridge->>ITS: interchainTransfer(tokenId, "base-sepolia", destBridge, 10, metadata)
    
    Note over ITS: ITS locks tokens on source,<br/>mints equivalent on destination
    
    ITS-->>DstBridge: _execute(sourceChain, sourceAddr, payload, tokenId, amount)
    
    Note over DstBridge,Stealth: Bridge contract processes payload
    DstBridge->>Stealth: Transfer 10 TUSDC to stealth address
    
    Note over Stealth: Funds are now at stealth address<br/>Only recipient can claim
```

### Key Points:

1. **Bridge = Router, Not Treasury**
   - Bridge contracts don't hold funds long-term
   - They route tokens through ITS to stealth addresses

2. **ITS Handles Token Movement**
   - **Lock-Unlock** model (if token originated elsewhere)
   - **Mint-Burn** model (if native ITS token)

3. **Same Bridge Contract Different Chains**
   - Ethereum Sepolia: `0x04ab5fA40Df5bF1B5e9E640b5D24C740ec5DfDeE`
   - Base Sepolia: `0xE09f184968cdAD4D0B94e2968Cfbf1395FB66D79`

---

## 🔐 Stealth Address Cryptography

```mermaid
flowchart TB
    subgraph "Sender Side"
        E[Generate Random<br/>Ephemeral Key] --> SS1[Compute Shared Secret<br/>ephPriv × viewPub]
        SS1 --> T1[Tweak = SHA256<br/>sharedSecret || k]
        T1 --> SA[Stealth Address =<br/>spendPub + tweak × G]
    end
    
    subgraph "Receiver Side (Scanning)"
        VK[Viewing Private Key] --> SS2[Compute Shared Secret<br/>viewPriv × ephPub]
        SS2 --> VH[Check View Hint<br/>First byte of secret]
        VH -->|Match?| D[Derive Stealth Private Key<br/>spendPriv + tweak]
    end
    
    SA -.->|Funds sent here| VH
    
    style SA fill:#FFD700
    style D fill:#90EE90
```

---

## 📊 Complete Flow Diagram

```mermaid
flowchart TB
    subgraph Source["Source Chain (Ethereum Sepolia)"]
        A[User Wallet<br/>Has 10 TUSDC] -->|1. Approve Bridge| B[Bridge Contract]
        B -->|2. sendCrossChainStealthPaymentITS| C[Axelar ITS]
        C -->|3. interchainTransfer| D[Axelar Gateway]
    end
    
    subgraph Axelar["Axelar Network (15-30 min)"]
        D -->|4. Event Detected| E[Validators Vote]
        E -->|5. Consensus| F[Message Approved]
        F -->|6. Relay| G[Relayer Network]
    end
    
    subgraph Dest["Destination Chain (Base Sepolia)"]
        G -->|7. Gateway Call| H[Axelar Gateway]
        H -->|8. Execute| I[Axelar ITS]
        I -->|9. _executeWithInterchainToken| J[Bridge Contract]
        J -->|10. Transfer TUSDC| K[Stealth Address<br/>0xRandom...]
    end
    
    subgraph Claim["Recipient Claims (Later)"]
        K -->|11. Scan & Find| L[Recipient Scans]
        L -->|12. Derive Key| M[Stealth Private Key]
        M -->|13. Withdraw| N[Recipient's Main Wallet]
    end
    
    style A fill:#4169E1
    style K fill:#FFD700
    style N fill:#90EE90
```

---

## 🎥 Video Script Points

1. **Why 30 minutes?**
   - Axelar uses 75+ validators for security
   - Must wait for finality on source chain
   - Multi-step consensus process

2. **TUSDC Chains:**
   - Same address on Eth Sepolia & Base Sepolia
   - Deployed via ITS CREATE3

3. **Explorer visibility:**
   - Sender address is visible
   - Amount is visible
   - Stealth address is visible
   - BUT recipient's real identity is hidden

4. **Not a Treasury:**
   - Bridge routes tokens, doesn't store them
   - ITS handles cross-chain token logic
   - Stealth address receives final funds

---

*Last Updated: December 17, 2024*
