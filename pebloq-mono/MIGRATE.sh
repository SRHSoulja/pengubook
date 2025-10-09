#!/bin/bash

# PeBloq Railway Migration - Automated Setup
# Run this from WSL terminal: bash MIGRATE.sh

set -e

echo "🚂 PeBloq Railway Migration - Starting..."
echo "========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running from WSL
if [[ ! $(pwd) =~ ^/home ]]; then
  echo -e "${RED}❌ ERROR: Run this from WSL terminal, not Windows!${NC}"
  echo "Type: wsl"
  echo "Then: cd ~/PenguBook/pebloq-mono && bash MIGRATE.sh"
  exit 1
fi

echo -e "${GREEN}✅ Running from WSL${NC}"
echo ""

# Step 1: Remove parent .env conflict
echo -e "${BLUE}📁 Fixing .env conflicts...${NC}"
if [ -f ../.env ]; then
  mv ../.env ../.env.backup
  echo "Backed up parent .env"
fi

# Step 2: Install Prisma globally
echo -e "${BLUE}📦 Installing Prisma...${NC}"
npm install -g prisma@5.0.0 || echo "Prisma already installed"

# Step 3: Generate Prisma client
echo -e "${BLUE}🔧 Generating Prisma client...${NC}"
cd ~/PenguBook/pebloq-mono
npx prisma generate --schema=packages/prisma/schema.prisma

# Step 4: Install API dependencies if needed
echo -e "${BLUE}📦 Checking API service...${NC}"
cd ~/PenguBook/pebloq-mono/services/api
if [ ! -d "node_modules" ]; then
  npm install
fi

# Install Prisma client
npm install @prisma/client@5.0.0

# Step 5: Install Socket dependencies
echo -e "${BLUE}📦 Checking Socket service...${NC}"
cd ~/PenguBook/pebloq-mono/services/socket
if [ ! -d "node_modules" ]; then
  npm install
fi
npm install @prisma/client@5.0.0

# Step 6: Test services
echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "🧪 Testing services..."
echo ""

# Test API
cd ~/PenguBook/pebloq-mono/services/api
echo -e "${BLUE}Starting API service (background)...${NC}"
npm run dev &
API_PID=$!
sleep 3

curl -s http://localhost:4000/health && echo -e "${GREEN}✅ API working!${NC}" || echo -e "${RED}❌ API failed${NC}"

# Kill background process
kill $API_PID 2>/dev/null || true

echo ""
echo -e "${GREEN}🎉 Migration setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Terminal 1: cd ~/PenguBook/pebloq-mono/services/api && npm run dev"
echo "2. Terminal 2: cd ~/PenguBook/pebloq-mono/services/socket && npm run dev"
echo ""
echo "Then Claude will migrate all the routes!"
