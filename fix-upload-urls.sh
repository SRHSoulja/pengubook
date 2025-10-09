#!/bin/bash

# Fix all hardcoded /api/upload URLs to use Railway API

cd "$(dirname "$0")"

echo "Fixing upload URLs in frontend components..."

# Replace in RichContentEditor.tsx
sed -i "s|await fetch('/api/upload'|await fetch(\`\${process.env.NEXT_PUBLIC_API_URL}/upload\`|g" src/components/RichContentEditor.tsx

# Replace in EnhancedPostComposer.tsx
sed -i "s|await fetch('/api/upload'|await fetch(\`\${process.env.NEXT_PUBLIC_API_URL}/upload\`|g" src/components/EnhancedPostComposer.tsx

# Replace in BannerUploader.tsx
sed -i "s|await fetch('/api/upload'|await fetch(\`\${process.env.NEXT_PUBLIC_API_URL}/upload\`|g" src/components/BannerUploader.tsx

# Replace in MediaUploader.tsx
sed -i "s|await fetch('/api/upload'|await fetch(\`\${process.env.NEXT_PUBLIC_API_URL}/upload\`|g" src/components/editor/MediaUploader.tsx

echo "✅ Fixed all upload URLs!"
echo "Committing changes..."

git add src/components/
git commit -m "fix: update all upload URLs to use Railway API (NEXT_PUBLIC_API_URL)"
git push

echo "🚀 Done! Vercel will redeploy with the fix."
