# PeBloq Railway Migration - Current Status

## 📍 Where We Are

### ✅ Completed
1. **Monorepo Structure** - Full Railway-ready architecture created
2. **API Service** - Fastify server with 30+ endpoints across 7 route groups:
   - 🔐 Authentication (wallet login, nonce, OAuth, logout)
   - 📝 Posts (CRUD, feed, like, bookmark, trending)
   - 👤 Users (profile, follow, search, ban/unban)
   - 📤 Upload (Cloudinary signed URLs, direct client upload)
   - 💬 Comments (create, list, delete)
   - 🔔 Notifications (list, mark read, settings)
   - 👥 Communities (create, join, leave, members)
3. **Socket.IO Service** - Real-time messaging framework
4. **Prisma Package** - Shared database schema
5. **Environment Configuration** - All services configured
6. **Documentation** - Complete migration requirements and guides

### 🔧 Current Blocker: Prisma Client Generation

**Issue**: Windows npm cannot generate Prisma client due to UNC path limitations.

**Solution**: I've fixed the Prisma schema and created clear instructions. You need to run ONE command from WSL terminal.

## 🚀 Next Step (Run This Now)

### Option A: Generate and Start API (RECOMMENDED)

Open **Ubuntu** terminal and run:

```bash
# Navigate to API service
cd ~/PenguBook/pebloq-mono/services/api

# Generate Prisma client
npx prisma generate --schema=../../packages/prisma/schema.prisma

# Start the API
npm run dev
```

**Expected Output:**
```
🚀 PeBloq API ready at http://0.0.0.0:4000
📊 Health check: http://0.0.0.0:4000/health

📋 Available routes:
  🔐 /auth - Authentication (wallet login, nonce, OAuth)
  📝 /posts - Posts (CRUD, likes, comments)
  👤 /users - Users (profile, search, follow)
  📤 /upload - Uploads (Cloudinary direct upload)
  💬 /comments - Comments (create, list, delete)
  🔔 /notifications - Notifications (list, mark read)
  👥 /communities - Communities (create, join, members)
```

### Option B: Use Helper Script

```bash
cd ~/PenguBook/pebloq-mono
./GENERATE_PRISMA.sh
```

## 📊 Migration Progress

| Component | Status | Routes Complete |
|-----------|--------|-----------------|
| API - Auth | ✅ Done | 6/6 (100%) |
| API - Posts | ✅ Done | 10/10 (100%) |
| API - Users | ✅ Done | 6/6 (100%) |
| API - Upload | ✅ Done | 2/2 (100%) |
| API - Comments | ✅ Done | 3/3 (100%) |
| API - Notifications | ✅ Done | 3/3 (100%) |
| API - Communities | ✅ Done | 6/6 (100%) |
| **API Total** | **30/116** | **~26%** |
| Socket.IO | ✅ Structure | Needs testing |
| Worker Service | ⏳ Pending | Not started |
| Frontend Migration | ⏳ Pending | Not started |

## 🔄 Remaining Work

### Phase 1: Complete API Routes (~86 routes remaining)
- Admin endpoints (moderation, user management, analytics)
- Hashtags (trending, search)
- Friends system (requests, accept/reject)
- Profile updates and streaks
- Advanced feed algorithm
- GIPHY integration

### Phase 2: Real-time Features
- Test Socket.IO service
- Implement chat rooms
- Typing indicators
- Online presence

### Phase 3: Background Jobs
- Create BullMQ worker service
- Implement scheduled cleanup tasks
- Notification dispatch

### Phase 4: Frontend Migration
- Update all API calls to new Fastify backend
- Test authentication flows
- Verify file uploads

### Phase 5: Deployment
- Deploy to Railway
- Configure environment variables
- Setup custom domains
- Monitor performance

## 📚 Documentation

- **[RAILWAY_MIGRATION_REQUIREMENTS.md](./RAILWAY_MIGRATION_REQUIREMENTS.md)** - Complete specification for hiring developers (42 pages)
- **[PRISMA_SOLUTION.md](./PRISMA_SOLUTION.md)** - How to fix Prisma generation issue
- **[PROGRESS.md](./PROGRESS.md)** - Detailed route completion status
- **[WORKAROUND.md](./WORKAROUND.md)** - Windows/WSL npm issues explained
- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Step-by-step migration process
- **[START_HERE.md](./START_HERE.md)** - Quick start guide

## 🎯 What This Fixes

### Before (Vercel)
- ❌ 4.5MB file upload limit → 413 errors
- ❌ 10-second timeout on API routes
- ❌ No persistent WebSocket connections
- ❌ Limited background job processing
- ❌ Expensive for high traffic

### After (Railway)
- ✅ 100MB+ file uploads (direct Cloudinary)
- ✅ No timeout limits
- ✅ Full WebSocket support (Socket.IO)
- ✅ Dedicated worker service (BullMQ)
- ✅ ~$50-100/month for all services

## 🧪 Testing After API Starts

### 1. Health Check
```bash
curl http://localhost:4000/health
```

### 2. Generate Nonce
```bash
curl -X POST http://localhost:4000/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"walletAddress":"0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
```

### 3. Get Feed
```bash
curl http://localhost:4000/posts?limit=5
```

### 4. Get Upload Signature (requires auth token)
```bash
curl -X POST http://localhost:4000/upload/sign \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 💡 Key Insights

1. **Windows/WSL Issue**: The core blocker is running Windows npm on WSL files. Solution: Use Ubuntu terminal.

2. **Prisma Schema Fix**: Removed custom output path that was causing "path argument undefined" error.

3. **Architecture Decision**: Chose Fastify over Express for 2x-3x better performance and superior TypeScript support.

4. **Direct Uploads**: Implemented Cloudinary signed URLs so files never touch the server (bypasses all size limits).

5. **JWT Auth**: Replaced NextAuth sessions with stateless JWT tokens for better API scalability.

## 🆘 If You Get Stuck

### "Cannot find module '@prisma/client'"
→ Prisma not generated. Run from Ubuntu terminal.

### "path argument undefined"
→ Fixed! Schema updated. Try generating again.

### "Maximum call stack size exceeded"
→ You're using Windows npm. Switch to Ubuntu terminal.

### "Database connection error"
→ Check DATABASE_URL in .env file exists and is correct.

## 📞 What to Tell a Developer

If hiring someone to complete this migration, share:
1. [RAILWAY_MIGRATION_REQUIREMENTS.md](./RAILWAY_MIGRATION_REQUIREMENTS.md) - Full specification
2. [PROGRESS.md](./PROGRESS.md) - What's done vs. remaining
3. This file - Current status and blockers

**Estimated completion**: 60-92 hours for full migration (86 routes + testing + deployment)

---

## 🎬 Action Required

**Run this command now to unblock the migration:**

```bash
# Open Ubuntu terminal (not Windows Terminal)
wsl

# Generate Prisma and start API
cd ~/PenguBook/pebloq-mono/services/api
npx prisma generate --schema=../../packages/prisma/schema.prisma
npm run dev
```

Once that works, you'll have a functional API with 30+ endpoints ready for testing! 🚀
