#!/bin/bash
# Quick test script for API service

echo "🚀 Starting API service..."
npm run dev &
API_PID=$!

sleep 3

echo ""
echo "🧪 Testing health endpoint..."
curl -s http://localhost:4000/health | jq '.' || curl http://localhost:4000/health

echo ""
echo "🧪 Testing hello endpoint..."
curl -s http://localhost:4000/hello | jq '.' || curl http://localhost:4000/hello

echo ""
echo ""
echo "✅ API is running! (PID: $API_PID)"
echo "   Press Ctrl+C to stop"
echo ""

# Keep running
wait $API_PID
