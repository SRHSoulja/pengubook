# Fix Prisma Client Generation

## Problem
Prisma client cannot be generated due to Windows/WSL path issues when running from Windows terminal.

## Solution
I've removed the custom output path from the Prisma schema. Now you need to run the generation command **from inside WSL terminal**.

## Steps to Fix

### 1. Open WSL Terminal
```bash
# In Windows PowerShell or Command Prompt, run:
wsl
```

### 2. Navigate to API Service
```bash
cd ~/PenguBook/pebloq-mono/services/api
```

### 3. Generate Prisma Client
```bash
npx prisma generate --schema=../../packages/prisma/schema.prisma
```

### 4. Start API Service
```bash
npm run dev
```

## Expected Output

When Prisma generates successfully, you should see:
```
✔ Generated Prisma Client to ./node_modules/@prisma/client in XXms
```

Then when you run the API, you should see:
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

## What Changed
- Removed `output = "../../node_modules/.prisma/client"` from schema
- Prisma will now use default location: `services/api/node_modules/@prisma/client`
- This should resolve the "path argument undefined" error

## If Still Failing

If you still get errors, check:

1. **DATABASE_URL is set**: `echo $DATABASE_URL` should show your database URL
2. **Prisma CLI is installed**: `npx prisma --version` should work
3. **Schema is valid**: `npx prisma validate --schema=../../packages/prisma/schema.prisma`

## Next Steps After Fixing

Once the API starts successfully:
1. Test the health endpoint: `curl http://localhost:4000/health`
2. Test wallet login flow with nonce generation
3. Continue implementing remaining routes (see PROGRESS.md)
