# Environment Setup Guide

**Last Updated**: 2025-01-27

---

## Overview

This guide covers all environment variables required for PrivatePay, including setup instructions and verification steps.

---

## Quick Start

1. Copy `.env.example` to `.env`
2. Fill in required variables (see sections below)
3. Run `npm install`
4. Verify setup with `npm run dev`

---

## Required Environment Variables

### Core Application

```bash
# Application Environment
VITE_APP_ENVIRONMENT=production  # or 'testnet'
VITE_WEBSITE_HOST=https://your-domain.com

# Supabase (Required)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Zcash Integration (Optional)

```bash
# Zcash RPC Configuration
VITE_ZCASH_RPC_URL=http://localhost:18232  # testnet
VITE_ZCASH_RPC_USER=your-rpc-user
VITE_ZCASH_RPC_PASSWORD=your-rpc-password
VITE_ZCASH_NETWORK=testnet  # or 'mainnet'
```

### Aztec Integration (Optional)

```bash
# Aztec Configuration
VITE_AZTEC_RPC_URL=https://api.aztec.network
VITE_AZTEC_API_KEY=your-api-key
```

---

## How to Obtain Values

### Supabase

1. Go to https://supabase.com
2. Create a new project
3. Go to Settings → API
4. Copy `Project URL` → `VITE_SUPABASE_URL`
5. Copy `anon public` key → `VITE_SUPABASE_ANON_KEY`

### Zcash RPC

1. Install and run a Zcash node
2. Configure RPC credentials in `zcash.conf`
3. Use testnet for development: `zcashd -testnet`

### Aztec

1. Sign up at https://aztec.network
2. Get API key from dashboard
3. Use testnet RPC for development

---

## Verification

### Check Environment Variables

```bash
# Node.js script (if needed)
node -e "console.log(process.env.VITE_SUPABASE_URL)"
```

### Test Setup

1. Start dev server: `npm run dev`
2. Check browser console for errors
3. Verify wallet connections work
4. Test core features

---

## Production Deployment

For Vercel deployment:

1. Go to Project Settings → Environment Variables
2. Add all required variables
3. Set `VITE_APP_ENVIRONMENT=production`
4. Redeploy after adding variables

---

## Troubleshooting

### Missing Variables

- Check `.env.example` for complete list
- Ensure all `VITE_` prefixed variables are set
- Restart dev server after changes

### RPC Connection Issues

- Verify Zcash node is running
- Check firewall settings
- Test RPC with: `curl -u user:pass http://localhost:18232`

---

## Security Notes

⚠️ **Never commit `.env` file to git**  
✅ `.env.example` is safe to commit  
✅ Use Vercel/Netlify environment variables for production

---

## See Also

- `docs/DEPLOYMENT.md` - Deployment guide
- `docs/SECURITY_AUDIT.md` - Security information
- `.env.example` - Complete variable template




