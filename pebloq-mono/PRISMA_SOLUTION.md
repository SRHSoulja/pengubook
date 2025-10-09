# Prisma Client Generation - Complete Solution

## Current Status
✅ Fixed Prisma schema (removed problematic output path)
⏳ Need to run generation command from WSL terminal

## The Issue
Windows npm cannot access WSL files via UNC paths (`\\wsl.localhost\...`). This causes:
- "Maximum call stack size exceeded" errors
- "path argument undefined" errors
- Prisma client failing to generate

## Solution: Use WSL Terminal

### Option 1: Generate in packages/prisma (RECOMMENDED)

This generates Prisma client in the shared packages directory:

```bash
# 1. Open WSL terminal
wsl

# 2. Navigate to prisma package
cd ~/PenguBook/pebloq-mono/packages/prisma

# 3. Install dependencies (if not done)
npm install

# 4. Generate Prisma client
npx prisma generate

# 5. Start API service
cd ~/PenguBook/pebloq-mono/services/api
npm run dev
```

### Option 2: Generate in API service

This generates Prisma client locally in the API service:

```bash
# 1. Open WSL terminal
wsl

# 2. Navigate to API service
cd ~/PenguBook/pebloq-mono/services/api

# 3. Generate with schema path
npx prisma generate --schema=../../packages/prisma/schema.prisma

# 4. Start API
npm run dev
```

### Option 3: Use the helper script

I created a script that does everything:

```bash
# Open WSL terminal
wsl

# Run the script
cd ~/PenguBook/pebloq-mono
./GENERATE_PRISMA.sh
```

## Expected Success Output

### Prisma Generation Success:
```
✔ Generated Prisma Client (5.x.x | library) to ./node_modules/@prisma/client in XXms
```

### API Startup Success:
```
[INFO] 🚀 PeBloq API ready at http://0.0.0.0:4000
[INFO] 📊 Health check: http://0.0.0.0:4000/health
[INFO]
[INFO] 📋 Available routes:
[INFO]   🔐 /auth - Authentication (wallet login, nonce, OAuth)
[INFO]   📝 /posts - Posts (CRUD, likes, comments)
[INFO]   👤 /users - Users (profile, search, follow)
[INFO]   📤 /upload - Uploads (Cloudinary direct upload)
[INFO]   💬 /comments - Comments (create, list, delete)
[INFO]   🔔 /notifications - Notifications (list, mark read)
[INFO]   👥 /communities - Communities (create, join, members)
```

## What I Changed

1. **Removed custom output path** from `packages/prisma/schema.prisma`:
   ```diff
   generator client {
     provider = "prisma-client-js"
   - output   = "../../node_modules/.prisma/client"
   }
   ```

2. **Why this fixes it**: Custom paths were causing path resolution issues with Windows npm. Default location works better.

## Testing the API

Once the API starts, test these endpoints:

### 1. Health Check
```bash
curl http://localhost:4000/health
```

Expected:
```json
{
  "status": "ok",
  "service": "pebloq-api",
  "timestamp": "2025-10-08T..."
}
```

### 2. Generate Nonce (Wallet Auth)
```bash
curl -X POST http://localhost:4000/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

Expected:
```json
{
  "nonce": "abcd1234..."
}
```

### 3. Get Public Feed
```bash
curl http://localhost:4000/posts?limit=10
```

## Troubleshooting

### Error: "Cannot find module '@prisma/client'"
**Solution**: Prisma client not generated. Run `npx prisma generate` from WSL.

### Error: "path argument undefined"
**Solution**: You're using Windows npm. Switch to WSL terminal.

### Error: "DATABASE_URL not found"
**Solution**: Load environment variables:
```bash
export $(cat ~/PenguBook/pebloq-mono/.env | grep DATABASE_URL)
```

### Error: "Maximum call stack size exceeded"
**Solution**: This is Windows npm on WSL paths. Use WSL terminal instead.

## Next Steps After Success

1. ✅ API service running with 30+ routes
2. 🔄 Test all auth endpoints (wallet login, OAuth)
3. 🔄 Test post creation with Cloudinary upload
4. 🔄 Start Socket.IO service for real-time features
5. 🔄 Begin frontend migration to use new API

## Progress

**Completed**:
- ✅ Monorepo structure created
- ✅ Fastify API with 7 route groups (30+ endpoints)
- ✅ JWT authentication middleware
- ✅ Direct Cloudinary upload support
- ✅ Prisma schema fixed

**Current**: Fix Prisma client generation
**Next**: Test API endpoints and continue route implementation

See [PROGRESS.md](./PROGRESS.md) for full migration status.
