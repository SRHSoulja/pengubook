#!/bin/bash

echo "🔧 Quick Fix for Prisma Generation Issue"
echo ""

# Solution 1: Create .env in packages/prisma
echo "📝 Creating .env in packages/prisma..."
cd ~/PenguBook/pebloq-mono/packages/prisma

# Copy DATABASE_URL from root .env
export $(cat ../../.env | grep DATABASE_URL | xargs)
echo "DATABASE_URL=$DATABASE_URL" > .env

echo "✓ .env created in packages/prisma"
echo ""

# Try generating
echo "🔄 Attempting to generate Prisma client..."
npx prisma generate

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Prisma client generated!"
    echo ""
    echo "🚀 Now start the API:"
    echo "   cd ~/PenguBook/pebloq-mono/services/api"
    echo "   npm run dev"
else
    echo ""
    echo "❌ Still failing. Trying alternative method..."
    echo ""

    # Fallback: Use main project's Prisma
    echo "📋 Using main project's Prisma schema..."
    cd ~/PenguBook
    npx prisma generate

    if [ $? -eq 0 ]; then
        echo ""
        echo "✓ Generated using main schema"
        echo "📦 Copying to monorepo..."

        mkdir -p ~/PenguBook/pebloq-mono/services/api/node_modules/@prisma
        cp -r node_modules/@prisma/client ~/PenguBook/pebloq-mono/services/api/node_modules/@prisma/

        echo "✅ Workaround successful!"
        echo ""
        echo "🚀 Start the API:"
        echo "   cd ~/PenguBook/pebloq-mono/services/api"
        echo "   npm run dev"
    else
        echo ""
        echo "❌ Both methods failed."
        echo "📖 See DEBUG_PRISMA.md for more troubleshooting steps"
    fi
fi
