#!/bin/bash
# Fix Prisma Client Generation

echo "🔧 Fixing Prisma Client..."
echo ""

# Navigate to API service
cd ~/PenguBook/pebloq-mono/services/api

# Install Prisma CLI locally
echo "📦 Installing Prisma CLI..."
npm install --save-dev prisma@5.0.0

# Install Prisma Client
echo "📦 Installing Prisma Client..."
npm install @prisma/client@5.0.0

# Generate Prisma Client
echo "🔨 Generating Prisma Client..."
npx prisma generate --schema=../../packages/prisma/schema.prisma

echo ""
echo "✅ Prisma client generated!"
echo ""
echo "Now restart your API:"
echo "  npm run dev"
