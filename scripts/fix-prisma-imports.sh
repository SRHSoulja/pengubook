#!/bin/bash

# Script to replace PrismaClient instantiation with singleton import
# This fixes the connection pool exhaustion issue

echo "🔧 Fixing Prisma Client imports..."

# Find all TypeScript files in src that use 'new PrismaClient()'
files=$(find src -name "*.ts" -type f -exec grep -l "new PrismaClient()" {} \;)

count=0
for file in $files; do
  echo "Processing: $file"

  # Check if file already imports from @lib/prisma
  if grep -q "from '@/lib/prisma'" "$file" || grep -q 'from "@/lib/prisma"' "$file"; then
    echo "  ⏭️  Already imports from @/lib/prisma, skipping..."
    continue
  fi

  # Replace the import line
  sed -i "s/import { PrismaClient } from '@prisma\/client'/import { prisma } from '@\/lib\/prisma'/g" "$file"
  sed -i 's/import { PrismaClient } from "@prisma\/client"/import { prisma } from "@\/lib\/prisma"/g' "$file"

  # Replace the instantiation
  sed -i 's/const prisma = new PrismaClient()//g' "$file"
  sed -i 's/const prisma = new PrismaClient({.*})//g' "$file"

  # Remove empty lines left behind
  sed -i '/^$/N;/^\n$/d' "$file"

  ((count++))
done

echo ""
echo "✅ Fixed $count files"
echo "📝 Created singleton at: src/lib/prisma.ts"
