#!/bin/bash
# Install missing API dependencies

cd ~/PenguBook/pebloq-mono/services/api

echo "📦 Installing missing dependencies..."
npm install @prisma/client@5.0.0 siwe@3.0.0 cloudinary@2.7.0

echo "✅ Dependencies installed!"
echo "Restart your API service (Ctrl+C then npm run dev)"
