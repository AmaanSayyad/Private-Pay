# Photon Integration in PrivatePay

## What is Photon?

Photon is a rewards and engagement platform that provides:
- Embedded wallet creation for users
- PAT token rewards for user actions
- Event tracking and analytics
- Passwordless authentication

## How Photon Works in PrivatePay

```mermaid
graph TB
    A[User Opens PrivatePay] --> B{Has Photon Wallet?}
    B -->|No| C[See Demo Mode UI]
    B -->|Yes| D[Show Real Wallet]
    
    C --> E[User Performs Action]
    D --> E
    
    E --> F{Action Type}
    F -->|Rewarded| G[Track Event + Award PAT]
    F -->|Unrewarded| H[Track Event Only]
    
    G --> I[Show Notification]
    H --> J[Silent Tracking]
    
    I --> K[Update Balance]
    J --> K
```

## Architecture

```mermaid
graph LR
    A[React App] --> B[PhotonProvider]
    B --> C[PhotonService]
    C --> D[Photon API]
    
    B --> E[PhotonWalletDisplay]
    B --> F[PhotonOnboardingButton]
    
    G[User Actions] --> H[Event Tracking]
    H --> C
    
    C --> I[Local Storage]
    I --> J[Token Persistence]
```

## Key Components

### 1. PhotonProvider
Context provider that manages:
- User authentication state
- Wallet information
- Event tracking functions
- Token refresh logic

```mermaid
stateDiagram-v2
    [*] --> Loading
    Loading --> Demo: No API Keys
    Loading --> Unauthenticated: Has API Keys
    Unauthenticated --> Authenticated: Register
    Authenticated --> Unauthenticated: Logout
    Demo --> [*]
```

### 2. PhotonWalletDisplay
Shows user's Photon wallet:
- Wallet address
- PAT token balance
- Demo mode instructions (when no API keys)

### 3. PhotonOnboardingButton
Triggers user registration:
- Creates embedded wallet
- Generates JWT token
- Stores access tokens

### 4. Event Tracking

```mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant P as PhotonProvider
    participant S as PhotonService
    participant API as Photon API
    
    U->>A: Performs Action
    A->>P: trackRewardedEvent()
    P->>S: sendRewardedEvent()
    S->>API: POST /campaign-events
    API-->>S: {tokens: 10, success: true}
    S-->>P: Event Response
    P->>A: Show Notification
    A->>U: "You earned 10 PAT!"
```

## Event Types

### Rewarded Events
Actions that earn PAT tokens:
- Completing transfers
- Making payments
- Bridging assets
- First-time actions

### Unrewarded Events
Actions tracked for analytics:
- Page views
- Button clicks
- Feature usage
- User behavior

## Demo Mode vs Production Mode

```mermaid
graph TD
    A[Check .env] --> B{Valid API Keys?}
    B -->|No| C[Demo Mode]
    B -->|Yes| D[Production Mode]
    
    C --> E[Show Demo UI]
    C --> F[No API Calls]
    C --> G[Mock Data]
    
    D --> H[Real Wallet]
    D --> I[API Integration]
    D --> J[Token Rewards]
```

### Demo Mode
- Displays UI components
- Shows placeholder data
- No API calls made
- Helps with development

### Production Mode
- Real wallet creation
- Actual token rewards
- Full API integration
- Requires valid API keys

## Data Flow

```mermaid
flowchart TD
    A[User Registration] --> B[Generate JWT]
    B --> C[Call Photon API]
    C --> D[Receive Wallet + Tokens]
    D --> E[Store in LocalStorage]
    
    F[User Action] --> G[Create Event]
    G --> H{Network Available?}
    H -->|Yes| I[Send to API]
    H -->|No| J[Queue Locally]
    
    I --> K[Update Balance]
    J --> L[Retry Later]
    L --> I
```

## Token Management

```mermaid
sequenceDiagram
    participant A as App
    participant L as LocalStorage
    participant P as PhotonService
    participant API as Photon API
    
    A->>L: Get Access Token
    L-->>A: Token (expires in 1h)
    
    A->>P: Make API Call
    P->>API: Request with Token
    API-->>P: 401 Unauthorized
    
    P->>API: Refresh Token
    API-->>P: New Access Token
    P->>L: Store New Token
    P->>API: Retry Request
    API-->>P: Success
```

## Error Handling

```mermaid
graph TD
    A[API Call] --> B{Success?}
    B -->|Yes| C[Process Response]
    B -->|No| D{Error Type}
    
    D -->|Network| E[Queue Event]
    D -->|401| F[Refresh Token]
    D -->|400| G[Log Error]
    D -->|500| H[Show User Message]
    
    E --> I[Retry Later]
    F --> J[Retry Request]
    G --> K[Continue App]
    H --> K
```

## Configuration

### Environment Variables
```env
VITE_PHOTON_API_KEY=your_api_key
VITE_PHOTON_CAMPAIGN_ID=your_campaign_id
```

### Config Structure
```javascript
PHOTON_CONFIG = {
  apiBaseUrl: "https://stage-api.getstan.app/...",
  apiKey: process.env.VITE_PHOTON_API_KEY,
  campaignId: process.env.VITE_PHOTON_CAMPAIGN_ID,
  enabled: true,
  isDemo: !hasValidKeys
}
```

## Usage Example

### Track a Rewarded Event
```javascript
const { trackRewardedEvent } = usePhoton();

await trackRewardedEvent('transfer_completed', {
  amount: 100,
  token: 'USDC',
  chain: 'ethereum'
});
// User sees: "You earned 5 PAT!"
```

### Track an Unrewarded Event
```javascript
const { trackUnrewardedEvent } = usePhoton();

await trackUnrewardedEvent('page_view', {
  page: '/dashboard',
  timestamp: Date.now()
});
// Silent tracking, no notification
```

## File Structure

```
src/
├── api/
│   └── photonService.js          # API calls
├── components/
│   └── shared/
│       ├── PhotonWalletDisplay.jsx
│       ├── PhotonOnboardingButton.jsx
│       └── PhotonErrorBoundary.jsx
├── providers/
│   └── PhotonProvider.jsx        # State management
├── utils/
│   ├── photonStorage.js          # LocalStorage
│   ├── photonEventQueue.js       # Event queue
│   └── jwtGenerator.js           # JWT creation
└── config.js                     # Configuration
```

## Benefits

1. **User Engagement**: Reward users for actions
2. **Analytics**: Track user behavior
3. **Wallet Management**: Automatic wallet creation
4. **Token Economy**: PAT token rewards
5. **Easy Integration**: Drop-in components

## Limitations

- Requires internet connection for rewards
- Demo mode doesn't award real tokens
- API keys needed for production
- Token refresh every hour

## Future Enhancements

- Batch event processing
- Offline queue improvements
- Custom reward rules
- Advanced analytics dashboard
- Multi-campaign support
