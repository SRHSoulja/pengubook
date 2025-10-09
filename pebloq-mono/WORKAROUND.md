# 🔧 Prisma Client Workaround

## Problem
Windows npm can't run `npx prisma generate` due to UNC path issues.

## Solution Options

### Option 1: Use Native Ubuntu Terminal (RECOMMENDED)

1. Open **Ubuntu** app from Start Menu (NOT Windows Terminal)
2. Run:
```bash
cd ~/PenguBook/pebloq-mono/services/api
npx prisma generate --schema=../../packages/prisma/schema.prisma
npm run dev
```

### Option 2: Install WSL npm (One-time setup)

In Ubuntu terminal:
```bash
# Install Node.js in WSL (not Windows)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify it's WSL npm (not Windows)
which npm
# Should show: /usr/bin/npm (NOT /mnt/c/...)

# Then generate Prisma
cd ~/PenguBook/pebloq-mono/services/api
npm install
npx prisma generate --schema=../../packages/prisma/schema.prisma
npm run dev
```

### Option 3: Deploy Without Local Testing

Skip local Prisma and deploy directly to Railway:
- Railway uses Linux, no Windows/WSL issues
- Generate Prisma during deployment
- Test on Railway preview environment

## What's Happening

Your `npm` command is running from Windows (`/mnt/c/Users/Eric/AppData/Roaming/npm`), which can't handle WSL paths like `\\wsl.localhost\...`.

The fix is to use npm **from inside WSL**, not from Windows.

## Quick Test

Run this to see which npm you're using:
```bash
which npm
```

- ✅ Good (WSL): `/usr/bin/npm`
- ❌ Bad (Windows): `/mnt/c/Users/Eric/AppData/...`

If it shows Windows path, you need Option 1 or 2 above.

---

## Current Status

✅ **What's Working:**
- API service structure created
- 30+ routes written (auth, posts, users, upload, communities, etc.)
- All code files ready
- Dependencies installed

⏳ **What's Blocked:**
- Prisma client generation (Windows/WSL npm issue)
- Testing routes with database

🎯 **Fastest Fix:**
Open Ubuntu app and run:
```bash
cd ~/PenguBook/pebloq-mono/services/api
npx prisma generate --schema=../../packages/prisma/schema.prisma
npm run dev
```

Then you'll see all 7 route groups loaded! 🚀

---

## UPDATE: Schema Fixed ✅

I've removed the problematic `output` path from the Prisma schema. This should resolve the "path argument undefined" error.

**Try this now:**
```bash
# In Ubuntu terminal (not Windows)
cd ~/PenguBook/pebloq-mono/services/api
npx prisma generate --schema=../../packages/prisma/schema.prisma
```

See [PRISMA_SOLUTION.md](./PRISMA_SOLUTION.md) for complete details.
