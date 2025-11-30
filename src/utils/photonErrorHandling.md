# Photon Error Handling and Recovery Implementation

This document describes the error handling and recovery mechanisms implemented for the Photon integration.

## Overview

The error handling implementation provides robust recovery mechanisms for the Photon integration, ensuring that errors don't crash the application and failed operations are automatically retried.

## Components

### 1. PhotonErrorBoundary Component

**Location:** `src/components/shared/PhotonErrorBoundary.jsx`

**Purpose:** Catches React errors in Photon components and provides graceful fallback UI.

**Features:**
- Prevents Photon errors from crashing the entire application
- Displays user-friendly error messages
- Optional "Try Again" button to reset error state
- Optional detailed error information for debugging
- Customizable fallback UI

**Usage:**
```jsx
<PhotonErrorBoundary
  title="Custom Error Title"
  message="Custom error message"
  showReset={true}
  showDetails={false}
  onError={(error, errorInfo) => {/* custom error handler */}}
  onReset={() => {/* custom reset handler */}}
>
  <YourComponent />
</PhotonErrorBoundary>
```

**Requirements Satisfied:**
- 1.5: Display error messages on failure
- 5.5: Graceful degradation for missing configuration

### 2. Event Queue with Retry Logic

**Location:** `src/utils/photonEventQueue.js`

**Purpose:** Manages a queue of failed Photon events in localStorage for automatic retry.

**Features:**
- Stores failed events in localStorage
- Exponential backoff retry strategy (1s, 2s, 4s, 8s...)
- Maximum 3 retry attempts per event
- Automatic cleanup of events that exceed max retries
- Separate tracking for rewarded and unrewarded events
- Queue statistics and monitoring

**API:**
```javascript
// Queue an event for retry
queueEvent(type, eventData)

// Get all queued events
getQueuedEvents()

// Get events ready for retry
getEventsReadyForRetry()

// Process the queue (retry failed events)
processEventQueue(sendRewardedEventFn, sendUnrewardedEventFn)

// Remove a specific event
removeQueuedEvent(eventId)

// Clear all queued events
clearEventQueue()

// Get queue statistics
getQueueStats()
```

**Requirements Satisfied:**
- 2.5: Log errors without blocking user workflow
- 3.5: Queue events for retry on network errors

### 3. Token Refresh on 401 Errors

**Location:** `src/api/photonService.js` (response interceptor)

**Purpose:** Automatically refreshes expired access tokens when API calls return 401 Unauthorized.

**Features:**
- Intercepts 401 responses
- Automatically calls refresh token endpoint
- Updates stored user data with new tokens
- Retries the original failed request with new token
- Clears session if refresh fails
- Prevents infinite retry loops with `_retry` flag

**Flow:**
1. API call returns 401 Unauthorized
2. Interceptor catches the error
3. Retrieves refresh token from localStorage
4. Calls `/auth/refresh` endpoint
5. Updates stored tokens
6. Retries original request with new access token
7. If refresh fails, clears session and prompts re-authentication

**Requirements Satisfied:**
- 6.4: Implement token refresh on 401 errors
- 6.5: Prompt re-authentication when token refresh fails

### 4. Rate Limiting Handling

**Location:** `src/api/photonService.js` (response interceptor)

**Purpose:** Handles 429 Too Many Requests responses with automatic retry.

**Features:**
- Respects `Retry-After` header if present
- Default 2-second delay if header not present
- Automatically retries the request after delay

### 5. Enhanced PhotonProvider

**Location:** `src/providers/PhotonProvider.jsx`

**Enhancements:**
- Automatic event queue processing every 30 seconds
- Graceful degradation when Photon is not configured
- Improved session restoration with error handling
- Automatic token refresh on expired tokens
- Event queueing for network and server errors
- Queue cleanup on logout

**New Context Values:**
```javascript
{
  isEnabled: boolean,           // Whether Photon is configured
  retryFailedEvents: () => {},  // Manual retry trigger
  getQueueStats: () => {},      // Get queue statistics
}
```

**Requirements Satisfied:**
- 1.5: Error handling for registration failures
- 2.5: Non-blocking error handling for rewarded events
- 3.5: Queue unrewarded events for retry
- 5.5: Graceful degradation for missing configuration
- 6.5: Handle token refresh failures

### 6. Component-Level Error Boundaries

**Components Wrapped:**
- `PhotonProvider` (in RootProvider)
- `PhotonWalletDisplay`
- `PhotonOnboardingButton`

**Features:**
- Each component has its own error boundary
- Errors in one component don't affect others
- Graceful degradation when Photon is not configured
- Components return `null` when `isEnabled` is false

## Error Handling Strategies

### Network Errors
- **Detection:** No response from server or `ECONNABORTED` error code
- **Action:** Queue event for retry with exponential backoff
- **User Feedback:** Toast notification for rewarded events, silent for unrewarded

### Server Errors (5xx)
- **Detection:** Response status >= 500
- **Action:** Queue event for retry
- **User Feedback:** Toast notification for rewarded events, silent for unrewarded

### Authentication Errors (401)
- **Detection:** Response status 401
- **Action:** Attempt token refresh, retry original request
- **Fallback:** Clear session and prompt re-authentication
- **User Feedback:** Toast notification on session expiration

### Rate Limiting (429)
- **Detection:** Response status 429
- **Action:** Wait for specified delay, then retry
- **User Feedback:** Silent (handled automatically)

### Validation Errors (400)
- **Detection:** Response status 400
- **Action:** Log error, don't retry
- **User Feedback:** Display error message to user

### Configuration Errors
- **Detection:** Missing API key or campaign ID
- **Action:** Disable Photon features, log warning
- **User Feedback:** Components gracefully hide themselves

## Testing the Implementation

### Manual Testing Checklist

1. **Error Boundary Testing:**
   - Trigger an error in PhotonProvider
   - Verify error boundary catches it
   - Verify app continues to work
   - Test "Try Again" button

2. **Event Queue Testing:**
   - Disconnect network
   - Trigger rewarded event
   - Verify event is queued
   - Reconnect network
   - Verify event is retried automatically

3. **Token Refresh Testing:**
   - Wait for token to expire
   - Make an API call
   - Verify token is refreshed automatically
   - Verify original request succeeds

4. **Graceful Degradation Testing:**
   - Remove API key from .env
   - Verify Photon components don't render
   - Verify no errors in console
   - Verify app works normally

5. **Rate Limiting Testing:**
   - Trigger many events quickly
   - Verify 429 responses are handled
   - Verify automatic retry after delay

## Configuration

### Environment Variables

```env
VITE_PHOTON_API_KEY=your_api_key_here
VITE_PHOTON_CAMPAIGN_ID=your_campaign_id_here
```

If these are missing, Photon features will be gracefully disabled.

### Queue Configuration

Located in `src/utils/photonEventQueue.js`:

```javascript
const MAX_RETRY_ATTEMPTS = 3;        // Maximum retry attempts
const INITIAL_RETRY_DELAY = 1000;    // Initial delay in ms
```

### Retry Interval

Located in `src/providers/PhotonProvider.jsx`:

```javascript
// Process queue every 30 seconds
retryIntervalRef.current = setInterval(() => {
  retryFailedEventsInternal();
}, 30000);
```

## Monitoring and Debugging

### Console Logs

The implementation includes comprehensive logging:
- Event queueing: "Event queued for retry: {id}"
- Retry attempts: "Event {id} retry failed (attempt {n}/{max})"
- Successful retries: "Successfully retried event {id}"
- Token refresh: "Attempting to refresh expired token..."
- Configuration warnings: "Photon is not configured..."

### Queue Statistics

Get queue stats programmatically:

```javascript
const { getQueueStats } = usePhoton();
const stats = getQueueStats();
// { total, rewarded, unrewarded, readyForRetry }
```

### LocalStorage Inspection

View queued events in browser DevTools:
- Key: `photon_event_queue`
- Format: JSON array of queued events

## Future Enhancements

Potential improvements for future iterations:

1. **Metrics and Analytics:**
   - Track error rates
   - Monitor retry success rates
   - Alert on high failure rates

2. **Advanced Retry Strategies:**
   - Jitter in exponential backoff
   - Priority queue for important events
   - Batch retry for efficiency

3. **User Notifications:**
   - Dashboard showing queued events
   - Manual retry button in UI
   - Success/failure statistics

4. **Error Reporting:**
   - Integration with error tracking service (Sentry, etc.)
   - Automatic bug reports for critical errors
   - User feedback collection

## Requirements Coverage

This implementation satisfies the following requirements:

- ✅ 1.5: Display error messages on registration failure
- ✅ 2.5: Log errors without blocking user workflow for rewarded events
- ✅ 3.5: Queue unrewarded events for retry on network errors
- ✅ 5.5: Graceful degradation for missing configuration
- ✅ 6.4: Implement token refresh on 401 errors
- ✅ 6.5: Prompt re-authentication when token refresh fails

All error handling requirements from the design document have been implemented.
