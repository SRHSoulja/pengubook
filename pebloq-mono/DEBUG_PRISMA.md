# Debug Prisma "path argument undefined" Error

## Current Situation

You're getting this error even with WSL native npm:
```
Error: The "path" argument must be of type string. Received undefined
```

## Diagnostic Steps

### Step 1: Test with Minimal Schema (No env variables)

```bash
cd ~/PenguBook/pebloq-mono/packages/prisma
npx prisma generate --schema=./test-schema.prisma
```

**If this works**: The issue is with `env("DATABASE_URL")` resolution.
**If this fails**: There's a deeper Prisma installation issue.

### Step 2: Check Environment Variable Resolution

```bash
cd ~/PenguBook/pebloq-mono/packages/prisma

# Method 1: Export env vars
export $(cat ../../.env | grep DATABASE_URL | xargs)
echo "DATABASE_URL=$DATABASE_URL"
npx prisma generate

# Method 2: Use dotenv-cli
npm install -g dotenv-cli
dotenv -e ../../.env -- npx prisma generate
```

### Step 3: Try Direct Path (No Relative)

```bash
cd ~/PenguBook/pebloq-mono/services/api
npx prisma generate --schema=/home/arson/PenguBook/pebloq-mono/packages/prisma/schema.prisma
```

### Step 4: Check Prisma Versions

```bash
npx prisma --version

# Should see something like:
# prisma: 5.x.x
# @prisma/client: 5.x.x
```

If versions mismatch, reinstall:
```bash
cd ~/PenguBook/pebloq-mono/services/api
npm uninstall prisma @prisma/client
npm install prisma@latest @prisma/client@latest
```

### Step 5: Use Debug Mode

```bash
cd ~/PenguBook/pebloq-mono/services/api
DEBUG=* npx prisma generate --schema=../../packages/prisma/schema.prisma 2>&1 | tee debug.log
```

Look for lines containing "path" or "undefined" in the output.

### Step 6: Try Installing Prisma Globally

```bash
npm install -g prisma
prisma generate --schema=~/PenguBook/pebloq-mono/packages/prisma/schema.prisma
```

### Step 7: Check Node/NPM Setup

```bash
which node
which npm
node --version
npm --version

# All should point to WSL paths, not /mnt/c/...
# Node should be v20+
# NPM should be v10+
```

## Possible Root Causes

### 1. Environment Variable Not Loading

Prisma can't resolve `env("DATABASE_URL")` in datasource.

**Fix**: Create `.env` file in packages/prisma:
```bash
cd ~/PenguBook/pebloq-mono/packages/prisma
echo 'DATABASE_URL="postgresql://neondb_owner:npg_2LywrRoeVU1q@ep-plain-hill-ae080est-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&pgbouncer=true"' > .env
npx prisma generate
```

### 2. Schema Path Resolution Bug

Prisma 5.0.0 might have a bug with relative paths.

**Fix**: Upgrade to latest:
```bash
cd ~/PenguBook/pebloq-mono/services/api
npm install prisma@latest @prisma/client@latest
```

### 3. Node Module Resolution

The "type": "module" in package.json might be causing issues.

**Fix**: Temporarily remove it:
```bash
cd ~/PenguBook/pebloq-mono/services/api
# Edit package.json and remove "type": "module"
npx prisma generate --schema=../../packages/prisma/schema.prisma
# Add "type": "module" back after
```

### 4. Corrupted node_modules

**Fix**: Fresh install:
```bash
cd ~/PenguBook/pebloq-mono/services/api
rm -rf node_modules package-lock.json
npm install
npx prisma generate --schema=../../packages/prisma/schema.prisma
```

## Workaround: Use Main Prisma Schema

The main PenguBook project has a working Prisma setup. Use that:

```bash
# Generate using main project's schema
cd ~/PenguBook
npx prisma generate

# Then copy the client to monorepo
cp -r node_modules/@prisma/client ~/PenguBook/pebloq-mono/services/api/node_modules/@prisma/

# Start API
cd ~/PenguBook/pebloq-mono/services/api
npm run dev
```

## Report Issue to Prisma

If none of the above work, this might be a Prisma bug:

1. Save the error output
2. Run `npx prisma --version`
3. Report at https://github.com/prisma/prisma/issues

Include:
- Full error message
- Prisma version
- Node version
- OS (WSL2 Ubuntu 22.04)
- Schema file (sanitized)

## What to Try Right Now

**RECOMMENDED ORDER:**

1. ✅ Create .env in packages/prisma with DATABASE_URL (Step 1 of Root Cause #1)
2. ✅ Try generating from packages/prisma directory: `cd ~/PenguBook/pebloq-mono/packages/prisma && npx prisma generate`
3. ✅ If that fails, use absolute path (Step 3)
4. ✅ If that fails, upgrade Prisma (Step 4)
5. ✅ If all fails, use main project's generated client (Workaround)

Let me know which step works and I can update the scripts accordingly!
