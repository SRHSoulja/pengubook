#!/bin/bash

# Test Services Script
# Run this FROM WSL TERMINAL (not Windows)

echo "🧪 PeBloq Services Test"
echo "======================"
echo ""

# Check if we're in WSL
if [[ $(pwd) == //* ]]; then
  echo "❌ ERROR: You're running from Windows terminal!"
  echo "   Current path: $(pwd)"
  echo ""
  echo "   Run this from WSL terminal instead:"
  echo "   1. Type: wsl"
  echo "   2. Then: cd ~/PenguBook/pebloq-mono"
  echo "   3. Then: ./TEST_SERVICES.sh"
  exit 1
fi

echo "✅ Running from WSL"
echo ""

# Install Socket service
echo "📦 Installing Socket service..."
cd ~/PenguBook/pebloq-mono/services/socket
npm install

echo ""
echo "✅ Both services installed!"
echo ""
echo "🚀 Testing API Service..."
cd ~/PenguBook/pebloq-mono/services/api
timeout 3s npm run dev &
sleep 2
curl -s http://localhost:4000/health || echo "API not responding"

echo ""
echo "🚀 Testing Socket Service..."
cd ~/PenguBook/pebloq-mono/services/socket
timeout 3s npm run dev &
sleep 2
curl -s http://localhost:4001/health || echo "Socket not responding"

echo ""
echo "🎉 Setup complete!"
echo ""
echo "To run services manually:"
echo "  Terminal 1: cd ~/PenguBook/pebloq-mono/services/api && npm run dev"
echo "  Terminal 2: cd ~/PenguBook/pebloq-mono/services/socket && npm run dev"
