#!/bin/bash

# PeBloq Railway Migration Setup Script
# This script sets up the monorepo structure without npm workspaces (to avoid WSL/Windows symlink issues)

set -e

echo "🚂 PeBloq Railway Migration Setup"
echo "=================================="
echo ""

# Colors for output
GREEN='\033[0.32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Install Turbo globally (optional but recommended)
echo -e "${BLUE}📦 Installing Turbo CLI...${NC}"
npm install -g turbo || echo "Turbo already installed or failed (non-fatal)"

# Step 2: Install Prisma package
echo -e "${BLUE}📦 Installing Prisma package dependencies...${NC}"
cd packages/prisma
npm install @prisma/client@5.0.0 prisma@5.0.0 --save
npm run build
cd ../..

# Step 3: Install Shared package
echo -e "${BLUE}📦 Installing Shared package dependencies...${NC}"
cd packages/shared
npm install zod@3.22.0 typescript@5.0.0 @types/node@20.0.0 --save-dev
# Skip build for now - no compilation needed
cd ../..

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "📋 Next steps:"
echo "1. Check that .env file is configured (already done)"
echo "2. Run 'npm run db:generate' to generate Prisma client"
echo "3. I'll create the service files next"
echo ""
