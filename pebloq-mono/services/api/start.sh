#!/bin/bash

echo "🔧 Generating Prisma client in API service..."
npx prisma generate --schema=../../packages/prisma/schema.prisma

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Prisma client ready!"
    echo "🚀 Starting API..."
    echo ""
    npm run dev
else
    echo "❌ Prisma generation failed"
    exit 1
fi
