---
inclusion: always
---

# PrivatePay Coding Standards

## General Principles

### Code Quality
- Write self-documenting code with clear variable and function names
- Keep functions small and focused on a single responsibility
- Prefer composition over inheritance
- Use early returns to reduce nesting
- Comment complex algorithms and cryptographic operations

### Consistency
- Follow existing code patterns in the project
- Use consistent naming conventions
- Maintain consistent file structure
- Keep similar components organized together

## JavaScript/React Standards

### Naming Conventions

**Variables and Functions**
```javascript
// Use camelCase for variables and functions
const userBalance = 100;
const calculateTotalAmount = (items) => { ... };

// Use PascalCase for React components
const PaymentDialog = () => { ... };

// Use UPPER_SNAKE_CASE for constants
const TREASURY_WALLET = "0x...";
const MAX_RETRY_ATTEMPTS = 3;

// Prefix boolean variables with is/has/should
const isLoading = true;
const hasBalance = false;
const shouldRetry = true;
```

**Files**
```
// React components: PascalCase.jsx
Payment.jsx
StealthAddress.jsx

// Utilities and services: camelCase.js
stealthAddress.js
supabase.js
aptos.js

// Hooks: use-kebab-case.js
use-session.js
use-event.js
```

### React Component Structure

```javascript
import { useState, useEffect } from "react";
import { Button } from "@nextui-org/react";
import toast from "react-hot-toast";

// 1. Component definition
export default function ComponentName({ prop1, prop2 }) {
  // 2. Hooks (useState, useEffect, custom hooks)
  const [state, setState] = useState(initialValue);
  
  useEffect(() => {
    // Effect logic
  }, [dependencies]);
  
  // 3. Event handlers
  const handleClick = async () => {
    try {
      // Handler logic
    } catch (error) {
      console.error("Error:", error);
      toast.error("User-friendly message");
    }
  };
  
  // 4. Helper functions
  const formatValue = (value) => {
    return value.toFixed(2);
  };
  
  // 5. Early returns for loading/error states
  if (isLoading) {
    return <Spinner />;
  }
  
  if (error) {
    return <ErrorMessage message={error} />;
  }
  
  // 6. Main render
  return (
    <div className="container">
      {/* JSX */}
    </div>
  );
}
```

### State Management

**Use Jotai for Global State**
```javascript
// In store file
import { atom } from "jotai";

export const userAtom = atom(null);
export const balanceAtom = atom(0);

// In component
import { useAtom } from "jotai";
import { userAtom } from "../store/user-store";

const [user, setUser] = useAtom(userAtom);
```

**Use useState for Local State**
```javascript
// Keep component state local when possible
const [amount, setAmount] = useState("");
const [isLoading, setIsLoading] = useState(false);
```

### Async/Await and Error Handling

**Always Use Try-Catch**
```javascript
const handleSubmit = async () => {
  setIsLoading(true);
  try {
    const result = await apiCall();
    toast.success("Operation successful");
    return result;
  } catch (error) {
    console.error("Detailed error:", error);
    toast.error(error.message || "Operation failed");
    throw error; // Re-throw if caller needs to handle
  } finally {
    setIsLoading(false);
  }
};
```

**Handle Specific Error Types**
```javascript
try {
  await transaction();
} catch (error) {
  if (error.code === "INSUFFICIENT_FUNDS") {
    toast.error("Insufficient balance");
  } else if (error.code === "USER_REJECTED") {
    toast.error("Transaction rejected");
  } else {
    toast.error("Transaction failed");
  }
}
```

### Cryptographic Code Standards

**Always Validate Inputs**
```javascript
export const generateStealthAddress = (spendPub, viewingPub, ephemeralPriv, k = 0) => {
  // Validate all inputs before processing
  if (!spendPub || !viewingPub || !ephemeralPriv) {
    throw new Error("Missing required parameters");
  }
  
  const spendValidation = validatePublicKey(spendPub);
  if (!spendValidation.valid) {
    throw new Error(`Invalid spend public key: ${spendValidation.error}`);
  }
  
  // Continue with operation
};
```

**Never Log Sensitive Data**
```javascript
// ❌ BAD - Exposes private key
console.log("Private key:", privateKey);

// ✅ GOOD - Log only non-sensitive info
console.log("Generated public key with length:", publicKey.length);

// ✅ GOOD - Log errors without sensitive data
console.error("Key generation failed:", error.message);
```

**Use Proper Types for Cryptographic Data**
```javascript
// Use Uint8Array for binary data
const privateKey: Uint8Array = generatePrivateKey();

// Use hex strings for display/storage
const privateKeyHex: string = bytesToHex(privateKey);

// Always specify encoding
const publicKey = getPublicKey(privateKey, true); // true = compressed
```

### Component Props and PropTypes

**Destructure Props**
```javascript
// ✅ GOOD
export default function Payment({ alias, amount, onSuccess }) {
  // Use props directly
}

// ❌ BAD
export default function Payment(props) {
  // Accessing props.alias, props.amount everywhere
}
```

**Document Complex Props**
```javascript
/**
 * Payment component for processing stealth payments
 * @param {string} alias - Payment link alias (username)
 * @param {number} amount - Payment amount in APT
 * @param {Function} onSuccess - Callback when payment succeeds
 * @param {Object} metaAddress - Recipient's meta address
 * @param {string} metaAddress.spendPublicKey - Spend public key (hex)
 * @param {string} metaAddress.viewingPublicKey - Viewing public key (hex)
 */
export default function Payment({ alias, amount, onSuccess, metaAddress }) {
  // Component logic
}
```

## CSS/Styling Standards

### TailwindCSS Usage

**Use Utility Classes**
```jsx
// ✅ GOOD - Utility classes
<div className="flex items-center justify-between p-4 rounded-lg bg-white">

// ❌ BAD - Inline styles
<div style={{ display: 'flex', padding: '16px' }}>
```

**Use Custom Classes for Repeated Patterns**
```css
/* In index.css */
.card {
  @apply bg-white rounded-[32px] p-6 shadow-lg border border-gray-200;
}

.btn-primary {
  @apply bg-primary text-white font-bold py-3 px-6 rounded-[42px] hover:opacity-90;
}
```

**Responsive Design**
```jsx
<div className="w-full md:w-1/2 lg:w-1/3">
  {/* Mobile: full width, Tablet: half, Desktop: third */}
</div>
```

## Testing Standards

### Unit Tests

**Test File Naming**
```
// Component tests
Payment.test.jsx
Transfer.test.jsx

// Utility tests
stealthAddress.test.js
formatting-utils.test.js
```

**Test Structure**
```javascript
import { describe, it, expect } from 'vitest';
import { generatePrivateKey, getPublicKey } from './stealthAddress';

describe('stealthAddress', () => {
  describe('generatePrivateKey', () => {
    it('should generate a 32-byte private key', () => {
      const privateKey = generatePrivateKey();
      expect(privateKey.length).toBe(32);
    });
    
    it('should generate non-zero private key', () => {
      const privateKey = generatePrivateKey();
      expect(privateKey.some(byte => byte !== 0)).toBe(true);
    });
  });
  
  describe('getPublicKey', () => {
    it('should generate 33-byte compressed public key', () => {
      const privateKey = generatePrivateKey();
      const publicKey = getPublicKey(privateKey);
      expect(publicKey.length).toBe(33);
    });
    
    it('should have valid compression flag', () => {
      const privateKey = generatePrivateKey();
      const publicKey = getPublicKey(privateKey);
      expect([0x02, 0x03]).toContain(publicKey[0]);
    });
  });
});
```

### Property-Based Tests

**Use fast-check Library**
```javascript
import fc from 'fast-check';

describe('Property-Based Tests', () => {
  it('Property 1: Key Generation Validity', () => {
    // **Feature: stealth-payment-system, Property 1: Key Generation Validity**
    fc.assert(
      fc.property(fc.constant(null), () => {
        const privKey = generatePrivateKey();
        expect(privKey.length).toBe(32);
        expect(privKey.some(byte => byte !== 0)).toBe(true);
        
        const pubKey = getPublicKey(privKey);
        expect(pubKey.length).toBe(33);
        expect([0x02, 0x03]).toContain(pubKey[0]);
      }),
      { numRuns: 100 }
    );
  });
});
```

**Property Test Requirements**
- Run minimum 100 iterations
- Tag with feature and property name
- Test universal properties, not specific examples
- Use appropriate generators for input types

## Git Commit Standards

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples**
```
feat(payment): add stealth address generation

Implement stealth address generation using ECDH and secp256k1.
Includes validation for public keys and proper error handling.

Closes #123

---

fix(transfer): handle insufficient balance error

Add proper error handling when stealth addresses don't have
enough balance to cover transfer amount and gas fees.

---

test(crypto): add property tests for ECDH symmetry

Add property-based tests to verify ECDH(privA, pubB) = ECDH(privB, pubA)
for all key pairs. Runs 100 iterations per test.
```

## Documentation Standards

### Code Comments

**When to Comment**
```javascript
// ✅ GOOD - Explain complex algorithms
// Compute stealth public key: stealth_pub = spend_pub + tweak * G
// This uses elliptic curve point addition
const stealthPubPoint = spendPoint.add(tweakPubPoint);

// ✅ GOOD - Explain non-obvious decisions
// Use SHA3-256 for Aptos address derivation (Aptos standard)
const addressHash = sha3_256(stealthPubKey);

// ❌ BAD - State the obvious
// Set loading to true
setIsLoading(true);
```

**JSDoc for Public Functions**
```javascript
/**
 * Generate a stealth address from meta address and ephemeral key
 * 
 * @param {string} spendPubKeyHex - Spend public key (hex, 33 bytes compressed)
 * @param {string} viewingPubKeyHex - Viewing public key (hex, 33 bytes compressed)
 * @param {Uint8Array} ephemeralPrivKey - Ephemeral private key (32 bytes)
 * @param {number} k - Index for multiple addresses (default 0)
 * @returns {Object} Object containing stealthAddress, ephemeralPubKey, viewHint, k
 * @throws {Error} If public keys are invalid or computation fails
 */
export const generateStealthAddress = (spendPubKeyHex, viewingPubKeyHex, ephemeralPrivKey, k = 0) => {
  // Implementation
};
```

### README Documentation

**Include**
- Project overview
- Setup instructions
- Environment variables
- Running the project
- Testing instructions
- Architecture overview
- Key concepts

## Performance Best Practices

### React Performance

**Memoization**
```javascript
import { useMemo, useCallback } from 'react';

// Memoize expensive computations
const aggregatedBalance = useMemo(() => {
  return aggregateAssets(stealthAddresses);
}, [stealthAddresses]);

// Memoize callbacks passed to children
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

**Lazy Loading**
```javascript
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Dashboard />
    </Suspense>
  );
}
```

### Cryptographic Performance

**Cache Public Keys**
```javascript
// Cache derived public keys to avoid recomputation
const publicKeyCache = new Map();

export const getPublicKeyCached = (privateKeyHex) => {
  if (publicKeyCache.has(privateKeyHex)) {
    return publicKeyCache.get(privateKeyHex);
  }
  
  const publicKey = getPublicKey(hexToBytes(privateKeyHex));
  publicKeyCache.set(privateKeyHex, publicKey);
  return publicKey;
};
```

## Security Best Practices

### Input Validation

**Always Validate User Input**
```javascript
const validateAmount = (amount) => {
  if (typeof amount !== 'number') {
    return { valid: false, error: 'Amount must be a number' };
  }
  if (amount <= 0) {
    return { valid: false, error: 'Amount must be positive' };
  }
  if (!Number.isFinite(amount)) {
    return { valid: false, error: 'Amount must be finite' };
  }
  return { valid: true };
};
```

### Sensitive Data Handling

**Encryption Before Storage**
```javascript
// ❌ BAD - Store private key in plain text
localStorage.setItem('privateKey', privateKeyHex);

// ✅ GOOD - Encrypt before storage
const encrypted = encryptPrivateKey(privateKeyHex, userPassword);
localStorage.setItem('encryptedPrivateKey', encrypted);
```

**Clear Sensitive Data**
```javascript
// Clear sensitive data from memory when done
const processTransaction = (privateKey) => {
  try {
    // Use private key
    const signature = sign(transaction, privateKey);
    return signature;
  } finally {
    // Clear private key from memory
    privateKey.fill(0);
  }
};
```

## Accessibility Standards

### Semantic HTML

```jsx
// ✅ GOOD - Semantic elements
<button onClick={handleClick}>Submit</button>
<nav>...</nav>
<main>...</main>

// ❌ BAD - Non-semantic elements
<div onClick={handleClick}>Submit</div>
```

### ARIA Labels

```jsx
<button
  onClick={handleConnect}
  aria-label="Connect Aptos wallet"
>
  Connect Wallet
</button>

<input
  type="number"
  aria-label="Payment amount in APT"
  placeholder="0.00"
/>
```

### Keyboard Navigation

```jsx
// Ensure all interactive elements are keyboard accessible
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</div>
```

## Code Review Checklist

Before submitting code for review:

- [ ] Code follows naming conventions
- [ ] Functions are small and focused
- [ ] Error handling is comprehensive
- [ ] No sensitive data in logs or errors
- [ ] Tests are written and passing
- [ ] Comments explain complex logic
- [ ] No console.logs in production code
- [ ] Accessibility considerations addressed
- [ ] Performance optimizations applied where needed
- [ ] Security best practices followed
