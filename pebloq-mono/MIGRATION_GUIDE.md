# PeBloq Railway Migration Guide

## 🚨 Current Issue: NPM Workspace Symlinks on WSL/Windows

The npm workspaces feature has issues with Windows/WSL paths. **We'll use a simpler approach.**

## ✅ Simplified Setup (No Workspaces)

Instead of complex workspaces, we'll:
1. Share Prisma schema across services (copy it)
2. Each service has its own package.json
3. Use Turbo to run services in parallel

## 📦 Manual Setup Steps

### 1. Install Prisma (Shared)

```bash
cd pebloq-mono
cp ../.env .env  # Already done ✅

# Install Prisma globally in the project
npm install -D prisma@5.0.0
npm install @prisma/client@5.0.0

# Generate Prisma client from schema
npx prisma generate --schema=packages/prisma/schema.prisma
```

### 2. Create API Service

```bash
cd services/api
npm init -y
npm install fastify@4.26.0 @fastify/cors@9.0.0 @fastify/helmet@11.0.0
npm install @prisma/client@5.0.0
npm install -D typescript@5.0.0 tsx@4.7.0 @types/node@20.0.0
```

### 3. Create Socket Service

```bash
cd ../socket
npm init -y
npm install socket.io@4.8.1 jsonwebtoken@9.0.2
npm install @prisma/client@5.0.0
npm install -D typescript@5.0.0 tsx@4.7.0 @types/node@20.0.0
```

### 4. Create Worker Service

```bash
cd ../worker
npm init -y
npm install bullmq@5.4.0 ioredis@5.3.2
npm install @prisma/client@5.0.0
npm install -D typescript@5.0.0 tsx@4.7.0 @types/node@20.0.0
```

## 🎯 OR: Let Me Create the Services

I can create all the service files with proper code directly. Just let me know and I'll:

1. Create services/api with full Fastify setup
2. Create services/socket with Socket.IO
3. Create services/worker with BullMQ
4. Copy and adapt the Next.js frontend to services/web

Each will be standalone (no workspace issues) and ready to run!

## 🚀 What's Next?

**Option A:** You run the manual steps above
**Option B:** I create all the service code files directly

Which would you prefer?
