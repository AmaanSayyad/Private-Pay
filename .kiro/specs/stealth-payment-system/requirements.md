# Requirements Document - Stealth Payment System

## Introduction

PrivatePay is a privacy-focused payment platform built on Aptos blockchain that enables completely untraceable and unidentifiable transactions using stealth addresses. The system implements ECDH key exchange, secp256k1 elliptic curve cryptography, and stealth address protocols (adapted from BIP 0352/EIP 5564) to provide sender privacy, receiver privacy, and observer blindness. Users can create static payment links that generate unique stealth addresses for each transaction, ensuring complete unlinkability between parties.

## Glossary

- **Stealth Address**: A one-time-use address generated for each transaction that cannot be linked to the recipient's identity
- **Meta Address**: A static identifier composed of spend public key and viewing public key used to generate stealth addresses
- **Ephemeral Key**: A temporary key pair generated for each transaction to compute shared secrets
- **ECDH**: Elliptic Curve Diffie-Hellman key exchange protocol for computing shared secrets
- **Spend Key**: Private/public key pair used by recipient to spend funds from stealth addresses
- **Viewing Key**: Private/public key pair used by recipient to detect incoming payments
- **View Hint**: First byte of shared secret used to optimize payment detection
- **Payment Link**: Static URL (e.g., username.privatepay.me) that generates unique stealth addresses
- **DarkPool**: Privacy mixer using ROFL (Runtime Offchain Logic) for additional transaction obfuscation
- **Treasury Wallet**: Central wallet that temporarily holds funds before distribution to stealth addresses
- **Aptos**: Layer 1 blockchain platform using Move programming language
- **secp256k1**: Elliptic curve used for cryptographic operations

## Requirements

### Requirement 1: Meta Address Generation

**User Story:** As a user, I want to generate a meta address for my account, so that I can receive private payments without exposing my identity.

#### Acceptance Criteria

1. WHEN a user creates an account THEN the system SHALL generate a spend key pair using secp256k1 elliptic curve cryptography
2. WHEN a user creates an account THEN the system SHALL generate a viewing key pair using secp256k1 elliptic curve cryptography
3. WHEN spend and viewing key pairs are generated THEN the system SHALL combine the public keys to create a meta address
4. WHEN private keys are generated THEN the system SHALL store them securely in the user's local storage with encryption
5. WHEN a meta address is created THEN the system SHALL validate that both public keys are 33 bytes compressed format

### Requirement 2: Stealth Address Generation

**User Story:** As a payer, I want the system to generate a unique stealth address for each payment, so that my transaction cannot be linked to the recipient's identity.

#### Acceptance Criteria

1. WHEN a payer accesses a payment link THEN the system SHALL generate an ephemeral key pair using secure random number generation
2. WHEN an ephemeral key pair is generated THEN the system SHALL compute a shared secret using ECDH between ephemeral private key and recipient's viewing public key
3. WHEN a shared secret is computed THEN the system SHALL derive a tweak value by hashing the shared secret concatenated with index k using SHA-256
4. WHEN a tweak value is derived THEN the system SHALL compute the stealth public key by adding the recipient's spend public key to the product of tweak and generator point G
5. WHEN a stealth public key is computed THEN the system SHALL derive an Aptos address by taking the first 16 bytes of SHA3-256 hash of the stealth public key
6. WHEN a stealth address is generated THEN the system SHALL create a view hint from the first byte of the shared secret
7. WHEN stealth address generation completes THEN the system SHALL return the stealth address, ephemeral public key, view hint, and index k

### Requirement 3: Payment Link Creation

**User Story:** As a recipient, I want to create a static payment link with my username, so that I can share a single URL that generates unique stealth addresses for each payer.

#### Acceptance Criteria

1. WHEN a user creates a payment link THEN the system SHALL validate that the username is unique across the platform
2. WHEN a username is validated THEN the system SHALL create a subdomain in the format username.privatepay.me
3. WHEN a payment link is created THEN the system SHALL associate the link with the user's meta address in the database
4. WHEN a payment link is stored THEN the system SHALL persist the username, meta address, and creation timestamp to Supabase
5. WHEN a payment link is successfully created THEN the system SHALL return the full URL to the user

### Requirement 4: Payment Processing

**User Story:** As a payer, I want to send APT tokens to a payment link, so that the recipient receives funds privately without revealing their identity.

#### Acceptance Criteria

1. WHEN a payer accesses a payment link THEN the system SHALL retrieve the recipient's meta address from the database
2. WHEN a meta address is retrieved THEN the system SHALL generate a unique stealth address for this transaction
3. WHEN a payer enters an amount THEN the system SHALL validate that the amount is greater than zero and the payer has sufficient balance
4. WHEN a payer confirms payment THEN the system SHALL transfer APT tokens from the payer's wallet to the treasury wallet
5. WHEN a transaction is submitted THEN the system SHALL record the payment details including sender address, recipient username, amount, and transaction hash in the database
6. WHEN a payment is recorded THEN the system SHALL emit a balance-updated event to trigger UI refresh
7. WHEN a transaction completes THEN the system SHALL display a success message with transaction hash and explorer link

### Requirement 5: Payment Detection and Monitoring

**User Story:** As a recipient, I want the system to automatically detect payments sent to my stealth addresses, so that I can see my balance without manual checking.

#### Acceptance Criteria

1. WHEN a payment is sent to a stealth address THEN the system SHALL monitor the Aptos blockchain for transactions to addresses derived from the recipient's meta address
2. WHEN monitoring for payments THEN the system SHALL compute shared secrets using the recipient's viewing private key and ephemeral public keys from transactions
3. WHEN a shared secret is computed THEN the system SHALL derive the expected stealth address and compare it with on-chain transactions
4. WHEN a match is found THEN the system SHALL record the stealth address, balance, ephemeral public key, and index k in the database
5. WHEN stealth addresses are detected THEN the system SHALL aggregate balances by token and chain for display in the user dashboard
6. WHEN the monitoring system encounters errors THEN the system SHALL implement retry logic with exponential backoff

### Requirement 6: Fund Withdrawal

**User Story:** As a recipient, I want to withdraw funds from my stealth addresses to my main wallet, so that I can use the received payments.

#### Acceptance Criteria

1. WHEN a user initiates a withdrawal THEN the system SHALL retrieve all stealth addresses with non-zero balances for the selected token and chain
2. WHEN stealth addresses are retrieved THEN the system SHALL sort them by balance in descending order
3. WHEN a withdrawal amount is specified THEN the system SHALL create a withdrawal queue by selecting stealth addresses until the amount is fulfilled
4. WHEN a stealth address is selected for withdrawal THEN the system SHALL compute the stealth private key by adding the spend private key to the tweak value
5. WHEN a stealth private key is computed THEN the system SHALL create a transaction signer using the stealth private key
6. WHEN a transaction is created THEN the system SHALL estimate gas fees and ensure sufficient balance to cover both transfer amount and gas
7. WHEN multiple stealth addresses are used THEN the system SHALL batch all transactions and submit them sequentially
8. WHEN all transactions are confirmed THEN the system SHALL update the database to mark stealth addresses as withdrawn

### Requirement 7: Cross-Chain Bridge Integration

**User Story:** As a user, I want to transfer funds from my stealth addresses on one chain to another chain, so that I can maintain privacy across multiple blockchains.

#### Acceptance Criteria

1. WHEN a user selects a token and destination chain THEN the system SHALL validate that a bridge route exists using cBridge configuration
2. WHEN a bridge route is validated THEN the system SHALL compute the withdrawal queue from stealth addresses on the source chain
3. WHEN stealth addresses are selected THEN the system SHALL compute stealth private keys for each address
4. WHEN a cross-chain transfer is initiated THEN the system SHALL call the cBridge pool transfer function with stealth signer, source chain, destination chain, token symbol, and amount
5. WHEN a bridge transfer is submitted THEN the system SHALL record the transfer ID and monitor the bridge status
6. WHEN a bridge transfer completes THEN the system SHALL update the user's balance on the destination chain

### Requirement 8: Wallet Integration

**User Story:** As a user, I want to connect my Aptos wallet (Petra) to the platform, so that I can send and receive payments.

#### Acceptance Criteria

1. WHEN a user clicks connect wallet THEN the system SHALL detect if Petra wallet extension is installed
2. WHEN Petra wallet is detected THEN the system SHALL request wallet connection with appropriate permissions
3. WHEN a wallet connection is approved THEN the system SHALL retrieve the user's Aptos address and store it in the session
4. WHEN a wallet is connected THEN the system SHALL fetch the user's APT balance from the blockchain
5. WHEN a wallet connection fails THEN the system SHALL display an error message with troubleshooting steps

### Requirement 9: User Dashboard

**User Story:** As a user, I want to view my payment history and stealth address balances in a dashboard, so that I can track my private transactions.

#### Acceptance Criteria

1. WHEN a user accesses the dashboard THEN the system SHALL display aggregated balances grouped by token and chain
2. WHEN balances are displayed THEN the system SHALL show both USD value and token amount for each asset
3. WHEN a user views transaction history THEN the system SHALL display sent and received payments with timestamps, amounts, and transaction hashes
4. WHEN a user clicks on a transaction THEN the system SHALL open the blockchain explorer in a new tab
5. WHEN the dashboard loads THEN the system SHALL fetch real-time token prices from CoinGecko API

### Requirement 10: Cryptographic Security

**User Story:** As a system architect, I want all cryptographic operations to follow industry standards, so that user funds and privacy are protected.

#### Acceptance Criteria

1. WHEN generating random private keys THEN the system SHALL use crypto.getRandomValues for secure random number generation
2. WHEN performing elliptic curve operations THEN the system SHALL use the @noble/secp256k1 library with compressed public keys
3. WHEN hashing data THEN the system SHALL use SHA-256 for tweak derivation and SHA3-256 for Aptos address derivation
4. WHEN storing sensitive keys THEN the system SHALL encrypt private keys before storing in local storage
5. WHEN validating public keys THEN the system SHALL verify 33-byte compressed format with valid compression flag (0x02 or 0x03)
6. WHEN computing shared secrets THEN the system SHALL use ECDH with proper point multiplication and validation

### Requirement 11: Error Handling and Validation

**User Story:** As a user, I want clear error messages when something goes wrong, so that I can understand and resolve issues.

#### Acceptance Criteria

1. WHEN a transaction fails THEN the system SHALL display a user-friendly error message with the failure reason
2. WHEN invalid input is provided THEN the system SHALL validate and display specific validation errors
3. WHEN network errors occur THEN the system SHALL implement retry logic with exponential backoff up to 3 attempts
4. WHEN insufficient balance is detected THEN the system SHALL prevent transaction submission and display the required amount
5. WHEN cryptographic operations fail THEN the system SHALL log detailed error information for debugging while showing generic messages to users

### Requirement 12: Photon Rewards Integration

**User Story:** As a user, I want to earn rewards for using the platform, so that I am incentivized to make private payments.

#### Acceptance Criteria

1. WHEN a user completes a payment THEN the system SHALL track the event using Photon SDK with transaction details
2. WHEN a user views a payment page THEN the system SHALL track an unrewarded event for analytics
3. WHEN a user completes a transfer THEN the system SHALL track a rewarded event with transfer type, amount, token symbol, and chain information
4. WHEN tracking events THEN the system SHALL include user wallet address for reward attribution
5. WHEN Photon API calls fail THEN the system SHALL log errors without blocking the main transaction flow
