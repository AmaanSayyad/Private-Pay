# Photon Event Tracking Integration Guide

This document outlines the Photon event tracking integration across the Squidl application.

## Overview

Photon tracking has been integrated into key user actions to enable:
- **Rewarded Events**: Actions that earn users PAT tokens
- **Unrewarded Events**: Attribution tracking for analytics without token rewards

## Integrated Components

### 1. Transfer Component (`src/components/transfer/Transfer.jsx`)

**Rewarded Events:**
- `transfer_completed` - Triggered on successful public transfers
  - Metadata: transferType, amount, tokenSymbol, chainId, chainName, txCount
  
- `transfer_completed` - Triggered on successful cross-chain transfers
  - Metadata: transferType (private_cross_chain), amount, tokenSymbol, sourceChainId, destinationChainId, txCount

### 2. Aptos Withdraw Component (`src/components/transfer/AptosWithdraw.jsx`)

**Rewarded Events:**
- `aptos_withdrawal_completed` - Triggered on successful withdrawals from treasury
  - Metadata: amount, tokenSymbol (APT), destinationAddress, txHash

### 3. Aptos Send Payment Component (`src/components/aptos/AptosSendPayment.jsx`)

**Rewarded Events:**
- `aptos_stealth_payment_sent` - Triggered on successful stealth payments
  - Metadata: amount, tokenSymbol (APT), recipientAddress, stealthAddress, txHash

### 4. Aptos Send to Username Component (`src/components/aptos/AptosSendToUsername.jsx`)

**Rewarded Events:**
- `aptos_username_payment_sent` - Triggered on successful username payments
  - Metadata: amount, tokenSymbol (APT), recipientUsername, recipientActualUsername, txHash

### 5. Payment Links Component (`src/components/payment-links/PaymentLinks.jsx`)

**Unrewarded Events:**
- `payment_link_copied` - Triggered when user copies a payment link
  - Metadata: alias, username

### 6. Create Link Dialog (`src/components/dialogs/CreateLinkDialog.jsx`)

**Unrewarded Events:**
- `payment_link_created` - Triggered when a new payment link is created
  - Metadata: alias, username, totalLinks

### 7. Payment Component (`src/components/payment/Payment.jsx`)

**Unrewarded Events:**
- `payment_page_viewed` - Triggered when a payment page is loaded
  - Metadata: alias, recipientUsername

## Event Types Summary

### Rewarded Events (Earn PAT Tokens)
1. `transfer_completed` - Public and cross-chain transfers
2. `aptos_withdrawal_completed` - Treasury withdrawals
3. `aptos_stealth_payment_sent` - Stealth payments
4. `aptos_username_payment_sent` - Username-based payments

### Unrewarded Events (Attribution Only)
1. `payment_link_created` - Payment link creation
2. `payment_link_copied` - Payment link sharing
3. `payment_page_viewed` - Payment page views

## Usage Pattern

All tracking calls follow this pattern:

```javascript
import { usePhoton } from "../../providers/PhotonProvider.jsx";

function MyComponent() {
  const { trackRewardedEvent, trackUnrewardedEvent } = usePhoton();
  
  // For rewarded actions
  trackRewardedEvent("event_type", {
    // metadata object
  });
  
  // For attribution tracking
  trackUnrewardedEvent("event_type", {
    // metadata object
  });
}
```

## Error Handling

- All tracking calls are non-blocking (Requirements 2.5, 3.5)
- Failed events are automatically queued for retry
- Network errors trigger automatic retry every 30 seconds
- Rewarded events show toast notifications on success
- Unrewarded events are silent to avoid interrupting user experience

## Requirements Validation

This implementation satisfies:
- **Requirement 2.1**: Rewarded events trigger campaign events to Photon
- **Requirement 3.1**: Unrewarded events track user actions for attribution
- **Requirement 2.4**: Success notifications display token amounts
- **Requirement 3.4**: Attribution tracking doesn't interrupt user experience
- **Requirement 2.5, 3.5**: Event failures don't block user workflow
