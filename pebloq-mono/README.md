# PeBloq Monorepo - Railway Migration

## ✅ Setup Progress

- [x] Created monorepo directory structure
- [x] Root workspace configuration (package.json, turbo.json)
- [x] Shared packages (@pebloq/shared, @pebloq/prisma)
- [ ] API service (Fastify)
- [ ] Socket service (Socket.IO)
- [ ] Worker service (BullMQ)
- [ ] Web service (Next.js)
- [ ] Railway deployment configs

## 📦 Next Steps

### Step 1: Install Root Dependencies

```bash
cd pebloq-mono
npm install
```

### Step 2: Copy Your .env File

```bash
cp ../.env .env
```

Then edit `.env` and add these new variables:

```bash
# Add these to your .env
NEXT_PUBLIC_API_URL="http://localhost:4000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:4001"
API_URL="http://localhost:4000"
SOCKET_URL="http://localhost:4001"
JWT_SECRET="your-jwt-secret-min-32-chars"
```

### Step 3: Build Shared Packages

```bash
cd packages/prisma
npm install
npm run build

cd ../shared
npm install
npm run build

cd ../..
```

### Step 4: I'll Help Create the Services

Tell me when you're ready and I'll create the API, Socket, Worker, and Web services with all the code migration.

## 🏗️ Architecture Overview

```
pebloq-mono/
├── services/
│   ├── web/        → Next.js frontend (port 3000)
│   ├── api/        → Fastify REST API (port 4000)
│   ├── socket/     → Socket.IO server (port 4001)
│   └── worker/     → BullMQ background jobs
├── packages/
│   ├── prisma/     → Shared database client
│   ├── shared/     → Shared types & constants
│   └── config/     → Shared configs
├── railway/        → Railway deployment configs
└── package.json    → Root workspace
```

## 🚀 Development Commands (After Full Setup)

```bash
# Run all services
npm run dev

# Run individual services
npm run dev:web      # http://localhost:3000
npm run dev:api      # http://localhost:4000
npm run dev:socket   # http://localhost:4001
npm run dev:worker   # Background

# Build all
npm run build

# Database
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema changes
npm run db:studio    # Open Prisma Studio
```

## 📝 Current Status

**Files Created:**
- ✅ Root package.json (workspace config)
- ✅ turbo.json (build orchestration)
- ✅ tsconfig.base.json (shared TypeScript config)
- ✅ .env.example (environment template)
- ✅ packages/shared/* (shared types & constants)
- ✅ packages/prisma/* (database client)

**Next:**
1. Install dependencies
2. Copy environment variables
3. Build shared packages
4. Then we'll create the services!
