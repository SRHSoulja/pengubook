# 🚀 Start PeBloq API - Simple Instructions

## You Are Here: 95% Ready! ✅

Everything is built and configured. Just need ONE command to generate Prisma client.

## What You Need to Do

### Step 1: Open Ubuntu Terminal
```
Click Start → Type "Ubuntu" → Open Ubuntu app
```

### Step 2: Run These Commands
```bash
cd ~/PenguBook/pebloq-mono/services/api
npx prisma generate --schema=../../packages/prisma/schema.prisma
npm run dev
```

### Step 3: See Success! 🎉
```
🚀 PeBloq API ready at http://0.0.0.0:4000
📊 Health check: http://0.0.0.0:4000/health

📋 Available routes:
  🔐 /auth - Authentication
  📝 /posts - Posts CRUD
  👤 /users - User profiles
  📤 /upload - File uploads
  💬 /comments - Comments
  🔔 /notifications - Notifications
  👥 /communities - Communities
```

## Test It Works

In another terminal:
```bash
curl http://localhost:4000/health
```

Should return:
```json
{
  "status": "ok",
  "service": "pebloq-api",
  "timestamp": "2025-10-08T..."
}
```

## What's Built So Far

✅ **30 API Endpoints** including:
- Wallet authentication (SIWE + nonce)
- Post CRUD with likes/comments
- User profiles and following
- Direct Cloudinary uploads (100MB+ files!)
- Notifications system
- Community management

✅ **No More Vercel Limits!**
- Was: 4.5MB max upload → **Now: 100MB+**
- Was: 10 second timeout → **Now: No limit**
- Was: No WebSockets → **Now: Socket.IO ready**

## Why Ubuntu Terminal?

Your Windows npm can't access WSL files properly (UNC path issue). Ubuntu terminal uses native WSL npm which works perfectly.

## What's Next After This Works?

1. Test the 30 endpoints
2. Build remaining ~86 routes (see PROGRESS.md)
3. Start Socket.IO service for real-time chat
4. Migrate frontend to use new API
5. Deploy to Railway

---

**TLDR: Open Ubuntu terminal, run 2 commands, API starts with 30 endpoints!** 🚀
