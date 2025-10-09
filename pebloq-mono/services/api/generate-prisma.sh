#!/bin/bash

# Load environment variables from root .env
export $(cat ../../.env | grep -v '^#' | xargs)

# Check DATABASE_URL is loaded
echo "DATABASE_URL set: ${DATABASE_URL:0:30}..."

# Generate Prisma client
npx prisma generate --schema=../../packages/prisma/schema.prisma

echo ""
echo "If successful, start API with: npm run dev"
