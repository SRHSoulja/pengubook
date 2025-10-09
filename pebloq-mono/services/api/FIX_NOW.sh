#!/bin/bash

echo "🔧 Using main PenguBook Prisma schema to generate fresh client..."
cd ~/PenguBook

# Generate using the main project's working schema
npx prisma generate

echo ""
echo "📦 Copying fresh client to API service..."
# Copy to API service
cp -r node_modules/.prisma/client ~/PenguBook/pebloq-mono/services/api/node_modules/.prisma/

echo "✅ Done!"
echo ""
echo "🚀 Starting API..."
cd ~/PenguBook/pebloq-mono/services/api
npm run dev
