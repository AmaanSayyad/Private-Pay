# Bridge Backend Services

Backend services for Zcash-Aztec bridge operations.

## Services

### 1. Bridge Operator
Monitors Zcash and Aztec blockchains, processes deposits and withdrawals.

### 2. Oracle Service
Fetches ZEC/USD price from multiple sources, updates on Aztec.

## Setup

```bash
cd backend
npm install
```

## Configuration

Create `.env` file:

```env
# Zcash Configuration
ZCASH_RPC_URL=http://localhost:18232
ZCASH_RPC_USER=rpcuser
ZCASH_RPC_PASSWORD=rpcpassword
ZCASH_BRIDGE_ADDRESS=ztest...

# Aztec Configuration
AZTEC_PXE_URL=http://localhost:8080
AZTEC_BRIDGE_CONTRACT=0x...

# Oracle Configuration
COINMARKETCAP_API_KEY=your_key_here
```

## Run

```bash
npm start
```

## Development

```bash
npm run dev
```





