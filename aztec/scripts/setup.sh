#!/bin/bash

# Aztec Contract Setup Script
# Installs dependencies and sets up development environment

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  Aztec Contracts Setup Script        ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js found: $(node --version)${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ npm found: $(npm --version)${NC}"

# Install Aztec CLI (if not installed)
if ! command -v aztec &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Aztec CLI...${NC}"
    npm install -g @aztec/cli || {
        echo -e "${YELLOW}⚠️  Global install failed, trying local...${NC}"
        npm install @aztec/cli --save-dev
    }
else
    echo -e "${GREEN}✅ Aztec CLI found: $(aztec --version)${NC}"
fi

# Install project dependencies
echo -e "${YELLOW}📦 Installing project dependencies...${NC}"
npm install

# Create directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p deployments
mkdir -p tests
mkdir -p scripts

# Make scripts executable
chmod +x scripts/*.js 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Setup Complete!                 ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📋 Next Steps:${NC}"
echo -e "${BLUE}1. Build contracts: npm run build${NC}"
echo -e "${BLUE}2. Run tests: npm test${NC}"
echo -e "${BLUE}3. Deploy to testnet: npm run deploy:testnet${NC}"
echo ""



