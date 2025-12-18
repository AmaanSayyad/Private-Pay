# Unstoppable Wallet Integration - Technical Documentation

## Overview

This document details the integration of **Unstoppable Wallet**, a self-custody, privacy-first wallet solution into PrivatePay dapp. The integration adds multi-chain support with enhanced privacy features while maintaining compatibility with existing blockchain integrations.

---

## 🎯 Integration Goals

- ✅ **Self-Custody Wallet**: BIP39 mnemonic-based key generation
- ✅ **Multi-Chain Support**: Derive keys for Zcash, Solana, Aztec, and Mina from single mnemonic
- ✅ **Privacy Features**: Balance hiding, stealth addresses, decoy mode
- ✅ **No Breaking Changes**: Existing integrations (Arcium, Aztec, Mina) remain functional

---

## 📊 Architecture Overview

```mermaid
graph TB
    subgraph "User Interface"
        A[UnstoppableDashboard]
        B[Wallet Creation Modal]
        C[Import Wallet Modal]
    end
    
    subgraph "Wallet Provider"
        D[UnstoppableProvider]
        E[Wallet State Management]
        F[Encryption/Decryption]
    end
    
    subgraph "Key Derivation"
        G[BIP39 Mnemonic]
        H[multichain.js]
        I1[Zcash Keys]
        I2[Solana Keys]
        I3[Aztec Keys]
        I4[Mina Keys]
    end
    
    subgraph "Storage"
        J[LocalStorage - Encrypted]
    end
    
    A --> D
    B --> D
    C --> D
    D --> E
    D --> F
    E --> G
    G --> H
    H --> I1
    H --> I2
    H --> I3
    H --> I4
    F --> J
    J --> F
    
    style D fill:#a78bfa,stroke:#7c3aed,stroke-width:3px
    style H fill:#fbbf24,stroke:#f59e0b,stroke-width:2px
    style J fill:#34d399,stroke:#10b981,stroke-width:2px
```

---

## 🔑 Key Derivation Flow

```mermaid
sequenceDiagram
    participant U as User
    participant UI as Dashboard
    participant P as Provider
    participant M as multichain.js
    participant Z as Zcash
    participant S as Solana
    participant A as Aztec
    participant Mi as Mina
    
    U->>UI: Create Wallet
    UI->>P: createWallet(password)
    P->>P: Generate BIP39 Mnemonic (24 words)
    
    P->>M: deriveAllChainKeys(mnemonic)
    
    par Multi-Chain Derivation
        M->>Z: getWalletFromMnemonic()
        Z-->>M: Zcash Address + Keys
        
        M->>S: deriveSolanaKeypair()
        S-->>M: Solana PublicKey + SecretKey
        
        M->>A: deriveAztecKeys()
        A-->>M: Aztec Address + Keys
        
        M->>Mi: deriveMinaKeys()
        Mi-->>M: Mina PublicKey + PrivateKey
    end
    
    M-->>P: All Chain Keys
    P->>P: AES-GCM Encrypt with Password
    P->>UI: Wallet Created ✅
    UI->>U: Display All Addresses
```

---

## 🔐 Security Architecture

```mermaid
graph LR
    subgraph "Wallet Creation"
        A1[BIP39 Mnemonic<br/>24 words]
        A2[Master Keys]
        A3[Chain-Specific Keys]
    end
    
    subgraph "Encryption Layer"
        B1[User Password]
        B2[PBKDF2 Key Derivation]
        B3[AES-GCM Encryption]
    end
    
    subgraph "Storage"
        C1[Encrypted Wallet Data]
        C2[localStorage]
    end
    
    A1 --> A2
    A2 --> A3
    A3 --> B3
    B1 --> B2
    B2 --> B3
    B3 --> C1
    C1 --> C2
    
    style B3 fill:#ef4444,stroke:#dc2626,stroke-width:3px
    style C1 fill:#34d399,stroke:#10b981,stroke-width:2px
```

---

## 🛠️ Implementation Details

### 1. Multi-Chain Key Derivation

```mermaid
graph TD
    A[BIP39 Mnemonic] --> B[BIP39 Seed]
    
    B --> C1[Zcash<br/>getWalletFromMnemonic]
    B --> C2[Solana<br/>BIP44: m/44'/501'/0'/0']
    B --> C3[Aztec<br/>BIP44: m/44'/60'/0'/0/0]
    B --> C4[Mina<br/>BIP44: m/44'/12586'/0'/0']
    
    C1 --> D1[Zcash Address<br/>tmNs...WENWTxg]
    C2 --> D2[Solana PublicKey<br/>Base58 Encoded]
    C3 --> D3[Aztec Address<br/>Hex Encoded]
    C4 --> D4[Mina PublicKey<br/>Base64 Encoded]
    
    style A fill:#8b5cf6,stroke:#7c3aed,stroke-width:3px
    style D1 fill:#fbbf24,stroke:#f59e0b,stroke-width:2px
    style D2 fill:#a78bfa,stroke:#8b5cf6,stroke-width:2px
    style D3 fill:#60a5fa,stroke:#3b82f6,stroke-width:2px
    style D4 fill:#34d399,stroke:#10b981,stroke-width:2px
```

### 2. Wallet State Management

```mermaid
stateDiagram-v2
    [*] --> NoWallet: App Start
    NoWallet --> Creating: User Creates Wallet
    NoWallet --> Importing: User Imports Mnemonic
    
    Creating --> Locked: Wallet Created & Encrypted
    Importing --> Locked: Wallet Imported & Encrypted
    
    Locked --> Unlocking: User Enters Password
    Unlocking --> Unlocked: Password Correct
    Unlocking --> Locked: Password Incorrect
    
    Unlocked --> Locked: User Locks Wallet
    Unlocked --> Disconnected: User Disconnects
    
    Disconnected --> [*]: Clear State
    
    note right of Unlocked
        - Keys in Memory
        - Can Sign Transactions
        - Privacy Features Active
    end note
```

### 3. Privacy Features Flow

```mermaid
graph TB
    subgraph "Privacy Controls"
        A[User Dashboard]
        B[Hide Balance Toggle]
        C[Decoy Mode Toggle]
        D[Stealth Address Generator]
    end
    
    subgraph "Privacy State"
        E[isBalanceHidden: boolean]
        F[decoyMode: boolean]
        G[stealthAddresses: array]
    end
    
    subgraph "UI Effects"
        H[Balance Display: ****]
        I[Generate Decoy Transactions]
        J[Display New Stealth Address]
    end
    
    A --> B
    A --> C
    A --> D
    
    B --> E
    C --> F
    D --> G
    
    E --> H
    F --> I
    G --> J
    
    style E fill:#ef4444,stroke:#dc2626,stroke-width:2px
    style F fill:#f59e0b,stroke:#d97706,stroke-width:2px
    style G fill:#10b981,stroke:#059669,stroke-width:2px
```

---

## 📁 File Structure

```mermaid
graph TD
    A[src/] --> B[lib/unstoppable/]
    A --> C[providers/]
    A --> D[pages/]
    
    B --> E[multichain.js<br/>Multi-chain key derivation]
    
    C --> F[UnstoppableProvider.jsx<br/>Wallet state & logic]
    
    D --> G[UnstoppableDashboard.jsx<br/>Wallet UI]
    
    style E fill:#fbbf24,stroke:#f59e0b,stroke-width:3px
    style F fill:#a78bfa,stroke:#8b5cf6,stroke-width:3px
    style G fill:#60a5fa,stroke:#3b82f6,stroke-width:3px
```

### Key Files Added/Modified

| File | Type | Lines | Purpose |
|------|------|-------|---------|
| `src/lib/unstoppable/multichain.js` | NEW | 147 | BIP44 key derivation for all chains |
| `src/providers/UnstoppableProvider.jsx` | MODIFIED | +50 | Added multi-chain key generation |
| `src/pages/UnstoppableDashboard.jsx` | MODIFIED | +90 | Display multi-chain addresses |

---

## 🔄 Integration with Existing Features

```mermaid
graph LR
    subgraph "Unstoppable Wallet"
        A[Zcash Keys]
        B[Solana Keys]
        C[Aztec Keys]
        D[Mina Keys]
    end
    
    subgraph "Existing Features"
        E[Zcash Privacy<br/>/zcash]
        F[Arcium Swaps<br/>/arcium/swap]
        G[Aztec Network<br/>/aztec]
        H[Mina Protocol<br/>/mina-protocol]
    end
    
    A -.->|Can Use| E
    B -.->|Future| F
    C -.->|Future| G
    D -.->|Future| H
    
    E -->|Works Now| I[Shielded Transactions]
    F -->|External Wallet| J[Phantom Required]
    G -->|External Wallet| K[Aztec Wallet Required]
    H -->|External Wallet| L[Auro Wallet Required]
    
    style A fill:#fbbf24,stroke:#f59e0b,stroke-width:2px
    style I fill:#10b981,stroke:#059669,stroke-width:3px
```

**Note**: Currently, only Zcash integration is fully functional. Solana/Aztec/Mina keys are generated but require additional SDK integration to work with their respective pages (future enhancement).

---

## 🚀 User Journey

```mermaid
journey
    title Unstoppable Wallet User Journey
    section Wallet Creation
      Visit /unstoppable: 5: User
      Click Create Wallet: 5: User
      Enter Password: 4: User
      Save 24-word Mnemonic: 5: User
      Wallet Created: 5: System
    section Using Wallet
      View All 4 Chain Addresses: 5: User
      Enable Hide Balance: 4: User
      Generate Stealth Address: 4: User
      Access Zcash Privacy: 5: User
    section Privacy Features
      Toggle Decoy Mode: 4: User
      Create Shielded Note: 5: User
      Privacy Score: 85%: 3: System
```

---

## 🧪 Testing Guide

### 1. Wallet Creation
```bash
1. Navigate to http://localhost:5173/unstoppable
2. Click "Create New Wallet"
3. Enter a strong password
4. Save the 24-word mnemonic (IMPORTANT!)
5. Verify all 4 chain addresses are displayed:
   - Zcash (starts with 'tm' for testnet)
   - Solana (Base58)
   - Aztec (Hex)
   - Mina (Base64)
```

### 2. Privacy Features
```bash
1. Toggle "Hide Balances" - balances should show as ****
2. Enable "Decoy Mode" - generates fake transactions
3. Click "Generate Stealth Address"
4. Verify privacy score updates (0-100%)
```

### 3. Wallet Import
```bash
1. Disconnect wallet
2. Click "Import Wallet"
3. Enter your 24-word mnemonic
4. Same addresses should be regenerated
```

---

## 📊 Privacy Score Calculation

```mermaid
graph TD
    A[Privacy Score: 0-100%] --> B{Has Stealth Address?}
    A --> C{Balance Hidden?}
    A --> D{Decoy Mode On?}
    A --> E{Shielded Notes?}
    
    B -->|Yes| F[+25 points]
    B -->|No| G[0 points]
    
    C -->|Yes| H[+25 points]
    C -->|No| I[0 points]
    
    D -->|Yes| J[+25 points]
    D -->|No| K[0 points]
    
    E -->|Yes| L[+25 points]
    E -->|No| M[0 points]
    
    F --> N[Calculate Total]
    H --> N
    J --> N
    L --> N
    
    style A fill:#8b5cf6,stroke:#7c3aed,stroke-width:3px
    style N fill:#10b981,stroke:#059669,stroke-width:3px
```

---

## 🔧 Technical Specifications

### Dependencies Added
```json
{
  "tweetnacl": "^1.0.3",
  "@noble/ed25519": "^2.0.0",
  "ed25519-hd-key": "^2.0.0"
}
```

### BIP44 Derivation Paths
| Chain | BIP44 Path | Coin Type |
|-------|------------|-----------|
| Zcash | Custom (via zcash lib) | 133 |
| Solana | m/44'/501'/0'/0' | 501 |
| Aztec | m/44'/60'/0'/0/0 | 60 (ETH placeholder) |
| Mina | m/44'/12586'/0'/0' | 12586 |

### Encryption Specification
- **Algorithm**: AES-GCM
- **Key Derivation**: PBKDF2
- **Iterations**: 100,000
- **Salt**: Randomly generated per wallet
- **IV**: Randomly generated per encryption

---

## 📈 Future Enhancements

```mermaid
graph TD
    A[Current State] --> B[Phase 2: Full Integration]
    
    B --> C1[Arcium Integration<br/>Use Solana keys for swaps]
    B --> C2[Aztec Integration<br/>Use Aztec keys for contracts]
    B --> C3[Mina Integration<br/>Use Mina keys for zk-proofs]
    
    C1 --> D[Unified Wallet Experience]
    C2 --> D
    C3 --> D
    
    D --> E[Mobile SDK]
    D --> F[Hardware Wallet Support]
    D --> G[Social Recovery]
    
    style A fill:#60a5fa,stroke:#3b82f6,stroke-width:2px
    style D fill:#10b981,stroke:#059669,stroke-width:3px
    style E fill:#fbbf24,stroke:#f59e0b,stroke-width:2px
```

---

## 📝 Summary

### What Was Built
- ✅ Self-custody wallet with BIP39 mnemonic generation
- ✅ Multi-chain key derivation (4 chains from 1 mnemonic)
- ✅ Privacy features (balance hiding, stealth addresses, decoy mode)
- ✅ Encrypted storage with AES-GCM
- ✅ Privacy score tracking
- ✅ Fully functional Zcash integration

### Code Statistics
- **Total Lines Added**: ~500 lines
- **Files Created**: 1 new file (`multichain.js`)
- **Files Modified**: 2 files (Provider, Dashboard)
- **Dependencies Added**: 3 packages
- **Development Time**: ~2 hours

### Alignment with Requirements
| Requirement | Status | Notes |
|-------------|--------|-------|
| Self-Custody & Wallet Innovation | ✅ | BIP39 mnemonic, multi-chain support |
| Enhanced Privacy UX | ✅ | Hide balance, stealth addresses, decoy mode |
| Private Asset Management | ✅ | Privacy score, shielded notes |
| No Breaking Changes | ✅ | All existing integrations functional |

---

## 🎬 Demo Video Topics

1. **Wallet Creation Flow**
   - Show mnemonic generation
   - Display all 4 chain addresses
   
2. **Privacy Features**
   - Toggle balance hiding
   - Generate stealth address
   - Enable decoy mode
   
3. **Code Walkthrough**
   - `multichain.js` - BIP44 derivation
   - `UnstoppableProvider.jsx` - State management
   - `UnstoppableDashboard.jsx` - UI components

4. **Integration Architecture**
   - How keys are derived
   - Encryption flow
   - Storage mechanism

---

*Documentation generated for Unstoppable Wallet Integration*  
*Branch: `feature/unstoppable-wallet-integration`*
