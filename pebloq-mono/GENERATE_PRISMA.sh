#!/bin/bash

# Generate Prisma Client from packages/prisma directory
# This script should be run from WSL terminal

echo "🔧 Generating Prisma Client..."
echo ""

# Check if we're in WSL
if [ -z "$WSL_DISTRO_NAME" ]; then
    echo "⚠️  Warning: This script should be run from WSL terminal"
    echo "   Run 'wsl' in PowerShell, then run this script again"
    exit 1
fi

# Navigate to packages/prisma
cd ~/PenguBook/pebloq-mono/packages/prisma || exit 1

echo "📍 Current directory: $(pwd)"
echo ""

# Check DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  DATABASE_URL not found. Loading from .env..."
    export $(cat ../../.env | grep DATABASE_URL)
fi

echo "✓ DATABASE_URL is set"
echo ""

# Generate Prisma Client
echo "🔄 Running: npx prisma generate"
npx prisma generate

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Prisma Client generated successfully!"
    echo ""
    echo "📦 Client location: packages/prisma/node_modules/@prisma/client"
    echo ""
    echo "🚀 Now you can start the API service:"
    echo "   cd ~/PenguBook/pebloq-mono/services/api"
    echo "   npm run dev"
else
    echo ""
    echo "❌ Prisma generation failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check DATABASE_URL: echo \$DATABASE_URL"
    echo "2. Validate schema: npx prisma validate"
    echo "3. Check Prisma version: npx prisma --version"
fi
