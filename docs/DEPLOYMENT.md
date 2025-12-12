# Deployment Guide - PrivatePay

**Last Updated**: 2025-01-27

---

## Overview

This guide covers deployment of PrivatePay to production environments. The application is a Vite-based React application with backend services.

---

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Environment variables configured
- Access to deployment platform (Vercel, Netlify, etc.)

---

## Pre-Deployment Checklist

### 1. Environment Variables

✅ Ensure all required environment variables are set:

**Required Variables**:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_ENVIRONMENT` (production/testnet)
- `VITE_WEBSITE_HOST`

**Zcash Variables** (if using Zcash features):
- `VITE_ZCASH_RPC_URL`
- `VITE_ZCASH_RPC_USER`
- `VITE_ZCASH_RPC_PASSWORD`
- `VITE_ZCASH_NETWORK`

**Aztec Variables** (if using Aztec features):
- `VITE_AZTEC_RPC_URL`
- `VITE_AZTEC_API_KEY`

See `.env.example` for complete list.

### 2. Security Audit

✅ Run security audit:
```bash
npm audit
npm audit fix
```

### 3. Build Test

✅ Test production build:
```bash
npm run build
npm run preview
```

### 4. Code Quality

✅ Run linter:
```bash
npm run lint
```

---

## Deployment Platforms

### Vercel (Recommended)

**Configuration**: `vercel.json` already configured

**Steps**:

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel --prod
   ```

3. **Environment Variables**:
   - Add all environment variables in Vercel dashboard
   - Settings → Environment Variables

4. **Build Settings** (auto-detected):
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

**Features**:
- ✅ Automatic HTTPS
- ✅ CDN distribution
- ✅ Preview deployments
- ✅ Environment variable management

---

### Netlify

**Configuration File**: Create `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

**Steps**:

1. **Install Netlify CLI**:
   ```bash
   npm i -g netlify-cli
   ```

2. **Deploy**:
   ```bash
   netlify deploy --prod
   ```

3. **Environment Variables**:
   - Add in Netlify dashboard
   - Site settings → Environment variables

---

### Self-Hosted (Node.js Server)

**Option 1: Static Files (Nginx)**

1. **Build**:
   ```bash
   npm run build
   ```

2. **Copy to server**:
   ```bash
   scp -r dist/* user@server:/var/www/privatepay/
   ```

3. **Nginx Configuration**:
   ```nginx
   server {
       listen 80;
       server_name privatepay.example.com;
       root /var/www/privatepay;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }
   }
   ```

**Option 2: Node.js Server**

Create `server.js`:
```javascript
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(join(__dirname, 'dist')));

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

Run:
```bash
node server.js
```

---

## Backend Services Deployment

### Bridge Operator Service

**Location**: `backend/services/bridgeOperator.js`

**Deployment Options**:

1. **Vercel Serverless Functions**:
   - Create `api/bridge-operator.js`
   - Deploy as serverless function

2. **Node.js Server**:
   ```bash
   cd backend
   npm install
   node index.js
   ```

3. **Docker**:
   ```dockerfile
   FROM node:18
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   CMD ["node", "index.js"]
   ```

### Oracle Service

**Location**: `backend/services/oracle.js`

**Deployment**: Same as Bridge Operator Service

---

## Post-Deployment

### 1. Verify Deployment

- ✅ Check homepage loads
- ✅ Test wallet connections
- ✅ Verify API endpoints
- ✅ Check console for errors

### 2. Monitor

- Set up error tracking (Sentry, etc.)
- Monitor performance (Vercel Analytics, etc.)
- Set up uptime monitoring

### 3. Security Headers

Add to server configuration:

```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';
```

### 4. SSL/TLS

- ✅ Ensure HTTPS is enabled
- ✅ Use valid SSL certificate
- ✅ Redirect HTTP to HTTPS

---

## Rollback Procedure

### Vercel
```bash
vercel rollback [deployment-url]
```

### Netlify
- Go to Deploys in dashboard
- Click "Publish deploy" on previous deployment

### Self-Hosted
```bash
# Restore previous build
cp -r dist.backup dist
```

---

## Continuous Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

---

## Troubleshooting

### Build Failures

1. Check Node.js version (18+)
2. Clear `node_modules` and reinstall
3. Check environment variables
4. Review build logs

### Runtime Errors

1. Check browser console
2. Verify environment variables
3. Check network requests
4. Review server logs

### Performance Issues

1. Enable code-splitting (already done)
2. Optimize images
3. Enable CDN caching
4. Review bundle size

---

## Support

For deployment issues:
- Check logs in deployment platform
- Review `docs/` directory
- Check GitHub issues



