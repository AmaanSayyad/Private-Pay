---
inclusion: always
---

# PrivatePay Project Context

## Project Overview

PrivatePay is a privacy-focused payment platform built on Aptos blockchain that enables completely untraceable and unidentifiable transactions using stealth addresses. The system implements cutting-edge cryptographic protocols to ensure sender privacy, receiver privacy, and observer blindness.

## Core Technologies

### Blockchain & Cryptography
- **Aptos Blockchain**: Layer 1 blockchain using Move programming language
- **secp256k1**: Elliptic curve for all cryptographic operations
- **@noble/secp256k1**: JavaScript library for elliptic curve operations
- **@noble/hashes**: Cryptographic hashing (SHA-256, SHA3-256)
- **ECDH**: Elliptic Curve Diffie-Hellman for shared secret computation

### Frontend Stack
- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **NextUI**: Component library
- **Jotai**: State management
- **TailwindCSS**: Styling
- **Framer Motion**: Animations
- **React Router**: Navigation

### Backend & Database
- **Supabase**: PostgreSQL database and authentication
- **Node.js**: Backend API
- **Aptos SDK**: Blockchain interaction

### Key Libraries
- **ethers.js v6**: Ethereum-compatible transaction signing
- **@aptos-labs/ts-sdk**: Aptos blockchain interaction
- **axios**: HTTP client
- **react-hot-toast**: Toast notifications

## Architecture Principles

### Privacy First
- All private key operations happen client-side
- Never transmit private keys to backend
- Use stealth addresses for complete unlinkability
- Implement view hints for efficient payment detection

### Security Best Practices
- Validate all cryptographic inputs
- Use secure random number generation
- Encrypt private keys before local storage
- Implement proper error handling without exposing sensitive data

### User Experience
- Simple payment links (username.privatepay.me)
- One-click wallet connection
- Clear transaction confirmations
- Real-time balance updates

## Code Organization

### `/src/lib/aptos/stealthAddress.js`
Core cryptographic functions for stealth address generation. This is the most critical file in the project. Any changes must:
- Maintain compatibility with BIP 0352 / EIP 5564 standards
- Preserve key format (32 bytes private, 33 bytes compressed public)
- Use proper error handling
- Include comprehensive tests

### `/src/components/payment/Payment.jsx`
Payment interface for payers. Handles:
- Payment link resolution
- Stealth address generation
- Wallet connection
- Transaction submission

### `/src/components/transfer/Transfer.jsx`
Withdrawal interface for recipients. Handles:
- Stealth address retrieval
- Stealth private key computation
- Transaction batching
- Cross-chain transfers

### `/src/lib/supabase.js`
Database operations. All queries should:
- Use parameterized queries
- Handle errors gracefully
- Implement proper indexing
- Use row-level security

## Development Guidelines

### When Adding New Features
1. Update requirements.md with EARS-compliant acceptance criteria
2. Update design.md with correctness properties
3. Add tasks to tasks.md with requirement references
4. Implement with comprehensive error handling
5. Write both unit tests and property-based tests
6. Update this steering document if architecture changes

### When Modifying Cryptography
1. Review the stealth address protocol specification
2. Ensure backward compatibility with existing addresses
3. Run all property-based tests (minimum 100 iterations)
4. Validate key formats and compression flags
5. Never log or expose private keys
6. Test with known test vectors if available

### When Working with Blockchain
1. Always estimate gas before transactions
2. Handle network timeouts with retry logic
3. Validate addresses before sending funds
4. Display transaction hashes and explorer links
5. Implement proper error messages for common failures

### Testing Requirements
- **Unit Tests**: Test specific examples and edge cases
- **Property-Based Tests**: Test universal properties across random inputs
- **Integration Tests**: Test complete user flows
- **Manual Testing**: Test wallet interactions and UI/UX

### Property-Based Testing Standards
- Use fast-check library for JavaScript
- Run minimum 100 iterations per property
- Tag each test with format: `// **Feature: stealth-payment-system, Property X: [name]**`
- Test cryptographic properties thoroughly (key generation, ECDH, address derivation)

## Common Patterns

### Error Handling
```javascript
try {
  // Operation
} catch (error) {
  console.error("Detailed error for debugging:", error);
  toast.error("User-friendly message");
  // Never expose private keys or sensitive data in errors
}
```

### Cryptographic Validation
```javascript
// Always validate inputs before cryptographic operations
const validation = validatePublicKey(pubKey);
if (!validation.valid) {
  throw new Error(validation.error);
}
```

### Transaction Submission
```javascript
// Always show loading state and handle errors
setIsLoading(true);
try {
  const result = await sendTransaction(...);
  toast.success(`Transaction confirmed: ${result.hash}`);
} catch (error) {
  toast.error(`Transaction failed: ${error.message}`);
} finally {
  setIsLoading(false);
}
```

## Environment Variables

### Required Variables
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- `VITE_TREASURY_WALLET_ADDRESS`: Treasury wallet for receiving payments
- `VITE_WEBSITE_HOST`: Domain for payment links (privatepay.me)
- `VITE_PHOTON_API_KEY`: Photon rewards API key
- `VITE_PHOTON_CAMPAIGN_ID`: Photon campaign identifier

## Key Concepts

### Meta Address
A static identifier composed of:
- Spend public key (33 bytes compressed)
- Viewing public key (33 bytes compressed)

Used to generate unlimited stealth addresses without revealing identity.

### Stealth Address
A one-time-use address generated for each transaction:
1. Payer generates ephemeral key pair
2. Computes shared secret via ECDH
3. Derives tweak from shared secret
4. Computes stealth public key = spend_pub + tweak*G
5. Derives Aptos address from stealth public key

### Payment Detection
Recipient monitors blockchain:
1. Computes shared secret using viewing private key
2. Derives expected stealth address
3. Checks if address received funds
4. Computes stealth private key to spend funds

### Withdrawal Queue
When withdrawing funds:
1. Retrieve all stealth addresses with balances
2. Sort by balance descending
3. Select addresses until amount is fulfilled
4. Compute stealth private key for each
5. Create and sign transactions
6. Submit batch to blockchain

## Performance Considerations

### Cryptographic Operations
- Cache public keys to avoid recomputation
- Use Web Workers for heavy computations (future enhancement)
- Batch stealth address generation when possible

### Database Queries
- Use indexes on frequently queried fields
- Implement pagination for large result sets
- Cache payment link lookups

### Blockchain Interactions
- Batch transaction submissions
- Use exponential backoff for retries
- Implement WebSocket for real-time updates (future enhancement)

## Security Checklist

Before deploying any changes:
- [ ] No private keys logged or exposed in errors
- [ ] All user inputs validated
- [ ] Cryptographic operations use proper libraries
- [ ] Error messages are user-friendly but not revealing
- [ ] HTTPS used for all API calls
- [ ] Rate limiting implemented on backend
- [ ] Database queries use parameterized statements
- [ ] Local storage encryption for sensitive data

## Troubleshooting

### Common Issues

**"Invalid public key format"**
- Check that key is 33 bytes (66 hex characters)
- Verify compression flag is 0x02 or 0x03
- Ensure no 0x prefix in validation

**"Stealth address mismatch"**
- Verify ephemeral public key is correct
- Check that viewing private key matches meta address
- Ensure k index is consistent

**"Insufficient balance"**
- Check that stealth addresses have been detected
- Verify balance aggregation is correct
- Ensure gas fees are accounted for

**"Transaction failed"**
- Check network connection
- Verify wallet has sufficient balance
- Ensure correct network (testnet vs mainnet)
- Check gas price is reasonable

## Resources

- [Aptos Documentation](https://aptos.dev/)
- [BIP 0352 - Silent Payments](https://github.com/bitcoin/bips/blob/master/bip-0352.mediawiki)
- [EIP 5564 - Stealth Addresses](https://eips.ethereum.org/EIPS/eip-5564)
- [@noble/secp256k1 Docs](https://github.com/paulmillr/noble-secp256k1)
- [Supabase Documentation](https://supabase.com/docs)
