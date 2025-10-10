#!/bin/bash

echo "📦 Copying Prisma client from root to API service..."

# Create directory
mkdir -p ~/PenguBook/pebloq-mono/services/api/node_modules/@prisma

# Copy the generated client
cp -r ~/PenguBook/pebloq-mono/node_modules/@prisma/client ~/PenguBook/pebloq-mono/services/api/node_modules/@prisma/

if [ $? -eq 0 ]; then
    echo "✅ Prisma client copied successfully!"
    echo ""
    echo "🚀 Starting API..."
    npm run dev
else
    echo "❌ Failed to copy Prisma client"
    echo "Make sure ~/PenguBook/pebloq-mono/node_modules/@prisma/client exists"
fi
