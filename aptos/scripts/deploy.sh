#!/bin/bash

# Deploy script for PrivatePay Aptos Contracts
# Usage: ./deploy.sh [testnet|mainnet]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  PrivatePay Aptos Contract Deploy    ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""

# Check if Aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    echo -e "${RED}❌ Aptos CLI not found!${NC}"
    echo "Install it with:"
    echo "  curl -fsSL \"https://aptos.dev/scripts/install_cli.py\" | python3"
    exit 1
fi

echo -e "${GREEN}✅ Aptos CLI found${NC}"

# Get network from argument or default to testnet
NETWORK="${1:-testnet}"

if [ "$NETWORK" != "testnet" ] && [ "$NETWORK" != "mainnet" ]; then
    echo -e "${RED}❌ Invalid network: $NETWORK${NC}"
    echo "Usage: ./deploy.sh [testnet|mainnet]"
    exit 1
fi

echo -e "${YELLOW}📡 Deploying to: $NETWORK${NC}"
echo ""

# Get deployer address from profile
DEPLOYER_ADDRESS=$(aptos config show-profiles --profile $NETWORK 2>/dev/null | grep "account" | awk '{print $2}')

if [ -z "$DEPLOYER_ADDRESS" ]; then
    echo -e "${RED}❌ No $NETWORK profile found!${NC}"
    echo "Create one with:"
    echo "  aptos init --profile $NETWORK --network $NETWORK"
    exit 1
fi

echo -e "${GREEN}👤 Deployer Address: $DEPLOYER_ADDRESS${NC}"
echo ""

# Update Move.toml with deployer address
echo -e "${YELLOW}📝 Updating Move.toml...${NC}"
sed -i.bak "s/squidl_aptos = \".*\"/squidl_aptos = \"$DEPLOYER_ADDRESS\"/" Move.toml
rm -f Move.toml.bak

# Compile contracts
echo -e "${YELLOW}🔨 Compiling contracts...${NC}"
aptos move compile --named-addresses squidl_aptos=$DEPLOYER_ADDRESS

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Compilation failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Compilation successful${NC}"
echo ""

# Run tests
echo -e "${YELLOW}🧪 Running tests...${NC}"
aptos move test --named-addresses squidl_aptos=$DEPLOYER_ADDRESS

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Tests failed!${NC}"
    echo -e "${YELLOW}⚠️  Continue anyway? (y/n)${NC}"
    read -r response
    if [ "$response" != "y" ]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ All tests passed${NC}"
fi

echo ""

# Deploy contracts
echo -e "${YELLOW}🚀 Deploying contracts to $NETWORK...${NC}"
echo -e "${YELLOW}⚠️  This will use gas from your account!${NC}"
echo ""

if [ "$NETWORK" == "mainnet" ]; then
    echo -e "${RED}⚠️  DEPLOYING TO MAINNET!${NC}"
    echo -e "${YELLOW}Are you sure? (type 'yes' to continue)${NC}"
    read -r confirmation
    if [ "$confirmation" != "yes" ]; then
        echo "Deployment cancelled."
        exit 0
    fi
fi

aptos move publish \
    --named-addresses squidl_aptos=$DEPLOYER_ADDRESS \
    --profile $NETWORK \
    --assume-yes

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Deployment Successful!         ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}📝 Contract Details:${NC}"
echo -e "   Network: ${YELLOW}$NETWORK${NC}"
echo -e "   Address: ${YELLOW}$DEPLOYER_ADDRESS${NC}"
echo ""
echo -e "${GREEN}📋 Next Steps:${NC}"
echo "1. Update your .env file:"
echo "   ${YELLOW}VITE_APTOS_MODULE_ADDRESS=$DEPLOYER_ADDRESS${NC}"
echo ""
echo "2. Verify on explorer:"
if [ "$NETWORK" == "testnet" ]; then
    echo "   https://explorer.aptoslabs.com/account/$DEPLOYER_ADDRESS?network=testnet"
else
    echo "   https://explorer.aptoslabs.com/account/$DEPLOYER_ADDRESS?network=mainnet"
fi
echo ""
echo "3. Test the contracts:"
echo "   ${YELLOW}aptos move run --function-id ${DEPLOYER_ADDRESS}::payment_manager::register_for_payments --profile $NETWORK${NC}"
echo ""
echo -e "${GREEN}🎉 Happy building!${NC}"
