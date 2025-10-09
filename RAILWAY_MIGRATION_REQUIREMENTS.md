# PeBloq Railway Migration - Complete Requirements Document

## 📋 Project Overview

Migrate PeBloq (Web3 social platform) from Vercel to Railway to remove hosting limitations.

**Current Stack:**
- Next.js 14.2.32 (App Router)
- Prisma ORM + PostgreSQL (Neon)
- Socket.IO (messaging)
- Cloudinary (uploads)
- Abstract Global Wallet (AGW) authentication
- NextAuth (Discord/Twitter OAuth)

**Current Issues:**
- ❌ 3.5MB upload limit on Vercel
- ❌ 10-second serverless timeout
- ❌ No persistent WebSocket connections
- ❌ High costs for API-heavy apps

---

## 🎯 Goal Architecture

Refactor into Railway monorepo with independent services:

```
pebloq-mono/
├── services/
│   ├── web/        → Next.js frontend (SSR + client)
│   ├── api/        → Fastify REST API
│   ├── socket/     → Socket.IO server
│   └── worker/     → BullMQ background jobs
├── packages/
│   ├── prisma/     → Shared database schema
│   └── shared/     → Shared TypeScript types
└── .env            → Environment variables
```

---

## 📦 Tech Stack Requirements

### Frontend (services/web)
- **Framework**: Next.js 14 (App Router, SSR)
- **State**: React Query for API calls
- **Auth**: Abstract Global Wallet (AGW) + NextAuth
- **UI**: TailwindCSS
- **API Calls**: Point to `NEXT_PUBLIC_API_URL` (Fastify backend)
- **WebSocket**: socket.io-client → `NEXT_PUBLIC_SOCKET_URL`

### Backend API (services/api)
- **Framework**: Fastify (NOT Express - faster, better TypeScript)
- **Database**: Prisma Client
- **Auth**: JWT middleware (`withAuth` function)
- **File Uploads**:
  - Direct Cloudinary uploads (signed URLs)
  - Register uploads with API for quota tracking
- **Content Moderation**: AWS Rekognition
- **Rate Limiting**: Upstash Redis

### Socket Service (services/socket)
- **Framework**: Socket.IO 4.8+
- **Auth**: JWT token in socket handshake
- **Features**:
  - Real-time messaging
  - Typing indicators
  - Online status
  - Notification broadcasts

### Worker Service (services/worker)
- **Framework**: BullMQ + ioredis
- **Jobs**:
  - Cleanup expired nonces (hourly)
  - Cleanup expired CSRF tokens (hourly)
  - Cleanup expired messages (daily)
  - Achievement checking (on trigger)
  - Content moderation (queued)

---

## 🔄 Migration Tasks

### Phase 1: Setup Monorepo Structure (DONE ✅)

- [x] Create directory structure
- [x] Create root configs (package.json, turbo.json, .env)
- [x] Setup packages/prisma with schema
- [x] Setup packages/shared with types
- [x] Create services/api basic structure
- [x] Create services/socket basic structure

**Status**: Structure created in `~/PenguBook/pebloq-mono/`

---

### Phase 2: Migrate API Routes (116 routes total)

**Current Location**: `src/app/api/**/route.ts` (Next.js App Router)
**Target Location**: `services/api/src/routes/*.ts` (Fastify)

#### Route Groups to Migrate:

**Auth Routes** → `services/api/src/routes/auth.ts`
- `/api/auth/wallet-login` - AGW wallet authentication
- `/api/auth/nonce` - Generate nonce for wallet signature
- `/api/auth/verify-session` - Verify JWT token
- `/api/auth/logout` - Revoke session
- `/api/auth/link-social` - Link Discord/Twitter to wallet user
- `/api/auth/unlink-social` - Unlink social account
- `/api/auth/oauth-register` - Create OAuth-only user
- `/api/auth/[...nextauth]` - NextAuth callbacks (keep in Next.js)

**Posts Routes** → `services/api/src/routes/posts.ts` (STARTED ✅)
- `GET /api/posts` - Get feed posts (pagination with cursor)
- `POST /api/posts` - Create new post
- `GET /api/posts/:id` - Get single post
- `PATCH /api/posts/:id` - Edit post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like/unlike post
- `GET /api/posts/:id/comments` - Get post comments
- `POST /api/posts/:id/comments` - Create comment
- `GET /api/posts/:id/reactions` - Get reactions
- `POST /api/posts/:id/reactions` - Add reaction
- `GET /api/posts/:id/edits` - Get edit history
- `GET /api/posts/:id/interactions` - Get engagement metrics
- `GET /api/posts/search` - Search posts

**Users Routes** → `services/api/src/routes/users.ts` (STARTED ✅)
- `GET /api/users/profile` - Get current user
- `GET /api/users/:id` - Get user by ID
- `PATCH /api/users/:id` - Update user
- `GET /api/users/:id/posts` - Get user's posts
- `GET /api/users/:id/followers` - Get followers list
- `GET /api/users/:id/following` - Get following list
- `POST /api/users/:id/follow` - Follow/unfollow user
- `GET /api/users/:id/shares` - Get user's shares
- `GET /api/users/:id/streaks` - Get user's streaks
- `GET /api/users/search` - Search users
- `POST /api/users/check-streak` - Check login streak
- `POST /api/users/update-login-streak` - Update login streak
- `GET /api/users/featured-community` - Get featured community

**Upload Routes** → `services/api/src/routes/upload.ts`
- `POST /api/upload` - Server upload (for small files < 10MB)
- `POST /api/upload/sign` - Generate signed Cloudinary URL (NEW)
- `POST /api/upload/register` - Register direct upload (NEW)
- `DELETE /api/upload` - Delete upload

**Admin Routes** → `services/api/src/routes/admin/*.ts`
- `/api/admin/stats` - Platform statistics
- `/api/admin/users` - User management
- `/api/admin/users/:id` - Ban/unban/delete user
- `/api/admin/audit-log` - View admin actions
- `/api/admin/moderation/queue` - Moderation queue
- `/api/admin/moderation/approve` - Approve content
- `/api/admin/moderation/reject` - Reject content
- `/api/admin/tokens/*` - Token management
- `/api/admin/achievements/*` - Achievement management
- `/api/admin/xp-levels/*` - XP system management
- `/api/admin/projects/*` - Project verification

**Communities Routes** → `services/api/src/routes/communities.ts`
- `GET /api/communities` - List communities
- `POST /api/communities` - Create community
- `GET /api/communities/:id` - Get community details
- `PATCH /api/communities/:id` - Update community
- `POST /api/communities/:id/join` - Join/leave community
- `GET /api/communities/:id/members` - Get members
- `POST /api/communities/:id/members/:userId/moderate` - Moderate member
- `POST /api/communities/:id/members/:userId/title` - Set custom title
- `GET /api/communities/:id/moderators` - Get moderators
- `GET /api/communities/:id/verify-access` - Check token gate access

**Messages Routes** → Move to Socket.IO events (NOT HTTP)
- Delete `/api/messages/*` HTTP routes
- Implement as Socket.IO events:
  - `send_message` - Send message
  - `delete_message` - Delete message
  - `edit_message` - Edit message
  - `mark_read` - Mark as read
  - `typing_start` - Start typing
  - `typing_stop` - Stop typing

**Notifications Routes** → `services/api/src/routes/notifications.ts`
- `GET /api/notifications` - Get user notifications
- `POST /api/notifications/:id/read` - Mark as read
- `POST /api/notifications/read-all` - Mark all as read

**Other Routes**:
- `/api/feed` - Algorithmic feed (move to posts)
- `/api/hashtags/search` - Search hashtags
- `/api/hashtags/trending` - Trending hashtags
- `/api/social/discover` - Discover users
- `/api/social/friends` - Friends list
- `/api/social/follow` - Follow suggestion
- `/api/profile/pin-post` - Pin post
- `/api/profile/completion` - Profile completion
- `/api/achievements` - User achievements
- `/api/achievements/init` - Initialize achievements
- `/api/tokens/report` - Report token
- `/api/tokens/hidden` - Hidden tokens
- `/api/projects/verified` - Verified projects
- `/api/projects/apply` - Apply for verification
- `/api/contact` - Contact form
- `/api/giphy/search` - GIPHY integration
- `/api/health` - Health check
- `/api/health/oauth` - OAuth health
- `/api/incidents` - Security incidents
- `/api/system/stats` - System stats

**Cron Jobs** → Move to Worker service
- `/api/cron/cleanup-nonces` → Worker scheduled job
- `/api/cron/cleanup-csrf` → Worker scheduled job
- `/api/cron/cleanup-messages` → Worker scheduled job

---

### Phase 3: Update Frontend API Calls

**Current Pattern**:
```typescript
const response = await fetch('/api/posts', {
  method: 'POST',
  body: JSON.stringify({ content })
})
```

**New Pattern**:
```typescript
const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/posts`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ content })
})
```

**Files to Update**:
- All components in `src/components/**/*.tsx`
- All pages in `src/app/**/page.tsx`
- API client utilities

**JWT Token Handling**:
- Store JWT in localStorage/sessionStorage
- Add token to all authenticated requests
- Handle token refresh
- Clear token on logout

---

### Phase 4: Implement Socket.IO Migration

**Current**: Socket.IO runs in `server.js` alongside Next.js

**New**: Dedicated Socket.IO service

**Events to Implement**:

```typescript
// Client → Server
socket.emit('authenticate', { token: jwtToken })
socket.emit('send_message', { conversationId, content, mediaUrls })
socket.emit('typing_start', { conversationId })
socket.emit('typing_stop', { conversationId })
socket.emit('join_conversation', { conversationId })

// Server → Client
socket.on('authenticated', ({ userId }) => {})
socket.on('new_message', ({ conversationId, message }) => {})
socket.on('user_typing', ({ conversationId, userId, isTyping }) => {})
socket.on('notification', ({ type, data }) => {})
```

**Frontend Updates**:
```typescript
// OLD
const socket = io()

// NEW
const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
  auth: { token: jwtToken }
})
```

---

### Phase 5: Implement Worker Service

**Queue Jobs**:

```typescript
// Cleanup Jobs (scheduled)
cleanupQueue.add('cleanup-nonces', {}, { repeat: { pattern: '0 * * * *' } }) // Hourly
cleanupQueue.add('cleanup-csrf', {}, { repeat: { pattern: '0 * * * *' } }) // Hourly
cleanupQueue.add('cleanup-messages', {}, { repeat: { pattern: '0 0 * * *' } }) // Daily

// Achievement Jobs (triggered)
achievementQueue.add('check-achievements', { userId, triggerType: 'post' })

// Moderation Jobs (triggered)
moderationQueue.add('moderate-upload', { uploadId, secure_url })
```

**Implementation**:
- Use BullMQ for queue management
- Connect to Redis (Railway Redis or Upstash)
- Process jobs asynchronously
- Handle failures with retries
- Log job completion/failures

---

### Phase 6: Cloudinary Direct Upload

**Current**: Files uploaded through Vercel (limited to 3.5MB)

**New**: Direct browser → Cloudinary upload

**Implementation**:

1. **Get Signature** (API endpoint):
```typescript
// POST /api/upload/sign
{
  signature: "abc123",
  timestamp: 1234567890,
  cloudName: "du4d6q6jx",
  apiKey: "971181688678224",
  folder: "pebloq/posts/images"
}
```

2. **Upload to Cloudinary** (Client-side):
```typescript
const formData = new FormData()
formData.append('file', file)
formData.append('signature', signature)
formData.append('timestamp', timestamp)
formData.append('api_key', apiKey)
formData.append('folder', folder)

const result = await fetch(
  `https://api.cloudinary.com/v1_1/${cloudName}/upload`,
  { method: 'POST', body: formData }
)
```

3. **Register Upload** (API endpoint):
```typescript
// POST /api/upload/register
await fetch(`${API_URL}/upload/register`, {
  method: 'POST',
  body: JSON.stringify({
    secure_url: result.secure_url,
    public_id: result.public_id,
    bytes: result.bytes,
    resource_type: result.resource_type
  })
})
```

**Benefits**:
- ✅ No file size limit (100MB+)
- ✅ Faster uploads (direct to CDN)
- ✅ Progress tracking
- ✅ No Vercel bandwidth costs

---

### Phase 7: Railway Deployment

**Services to Deploy**:

1. **PostgreSQL Database** (Railway managed)
   - Migration: Use existing Neon database or migrate
   - Set `DATABASE_URL` environment variable

2. **Redis** (Railway Redis or Upstash)
   - For BullMQ worker queues
   - For rate limiting cache

3. **Web Service** (Next.js)
   - Build: `npm run build`
   - Start: `npm start`
   - Port: 3000
   - Env vars: All `NEXT_PUBLIC_*` variables

4. **API Service** (Fastify)
   - Build: `npm run build`
   - Start: `npm start`
   - Port: 4000
   - Env vars: `DATABASE_URL`, `JWT_SECRET`, AWS, Cloudinary

5. **Socket Service** (Socket.IO)
   - Build: `npm run build`
   - Start: `npm start`
   - Port: 4001
   - Env vars: `DATABASE_URL`, `JWT_SECRET`

6. **Worker Service** (BullMQ)
   - Build: `npm run build`
   - Start: `npm start`
   - No port (background service)
   - Env vars: `DATABASE_URL`, `REDIS_URL`

**Railway Configuration**:

Each service needs a `railway.toml` file:

```toml
# services/web/railway.toml
[build]
builder = "NIXPACKS"
buildCommand = "npm install && npm run build"

[deploy]
startCommand = "npm start"
restartPolicyType = "ON_FAILURE"

[[services]]
name = "web"
port = 3000

[healthcheck]
path = "/"
interval = 30
```

**Internal Networking**:
- Services communicate via `http://service-name.railway.internal:port`
- Example: API calls Socket at `http://socket.railway.internal:4001`

**Environment Variables** (Set in Railway dashboard):
```bash
# Shared
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
NODE_ENV="production"

# Web service
NEXT_PUBLIC_API_URL="https://api.your-domain.com"
NEXT_PUBLIC_SOCKET_URL="https://socket.your-domain.com"
NEXT_PUBLIC_WEB_URL="https://your-domain.com"

# API service
API_URL="http://api.railway.internal:4000"

# Socket service
SOCKET_URL="http://socket.railway.internal:4001"

# Worker service
REDIS_URL="redis://..."
WORKER_CONCURRENCY="5"
```

---

## 📁 File Structure Reference

```
pebloq-mono/
├── .env                           # Local development env
├── .gitignore
├── turbo.json                     # Turborepo config
├── README.md
│
├── services/
│   ├── web/                       # Next.js Frontend
│   │   ├── package.json
│   │   ├── next.config.js
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── app/              # App Router pages
│   │   │   ├── components/       # React components
│   │   │   ├── lib/              # Client utilities
│   │   │   └── providers/        # Context providers
│   │   └── public/               # Static assets
│   │
│   ├── api/                       # Fastify REST API
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts          # Entry point
│   │   │   ├── lib/
│   │   │   │   └── prisma.ts     # Prisma client
│   │   │   ├── middleware/
│   │   │   │   └── auth.ts       # JWT auth middleware
│   │   │   └── routes/
│   │   │       ├── auth.ts       # Auth routes
│   │   │       ├── posts.ts      # Posts routes
│   │   │       ├── users.ts      # Users routes
│   │   │       ├── upload.ts     # Upload routes
│   │   │       ├── admin/        # Admin routes folder
│   │   │       ├── communities.ts
│   │   │       ├── notifications.ts
│   │   │       └── ...
│   │   └── railway.toml
│   │
│   ├── socket/                    # Socket.IO Server
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── src/
│   │   │   ├── index.ts          # Socket.IO setup
│   │   │   ├── lib/
│   │   │   │   └── prisma.ts
│   │   │   └── handlers/
│   │   │       ├── messages.ts   # Message events
│   │   │       ├── typing.ts     # Typing indicators
│   │   │       └── presence.ts   # Online status
│   │   └── railway.toml
│   │
│   └── worker/                    # BullMQ Worker
│       ├── package.json
│       ├── tsconfig.json
│       ├── src/
│       │   ├── index.ts          # Worker entry
│       │   ├── lib/
│       │   │   └── prisma.ts
│       │   └── jobs/
│       │       ├── cleanup.ts    # Cleanup jobs
│       │       ├── achievements.ts
│       │       └── moderation.ts
│       └── railway.toml
│
└── packages/
    ├── prisma/
    │   ├── package.json
    │   ├── schema.prisma          # Database schema
    │   └── src/
    │       └── index.ts           # Prisma client export
    │
    └── shared/
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── types.ts           # Shared TypeScript types
            ├── constants.ts       # Shared constants
            └── index.ts
```

---

## 🔐 Authentication Flow

### Wallet Authentication (AGW)

1. **User connects wallet** (client-side)
2. **Get nonce**: `GET /api/auth/nonce?walletAddress=0x...`
3. **Sign message** with AGW
4. **Verify signature**: `POST /api/auth/wallet-login { walletAddress, signature, message }`
5. **Receive JWT token**
6. **Store token** in localStorage
7. **Include token** in all authenticated requests

### OAuth Authentication (Discord/Twitter)

1. **NextAuth handles OAuth flow** (stays in Next.js)
2. **On success**, call `POST /api/auth/oauth-register`
3. **Receive JWT token**
4. **Store token** and use for API calls

### Social Linking

1. **User authenticated with wallet** (has JWT)
2. **Initiate OAuth flow** with NextAuth
3. **On callback**, call `POST /api/auth/link-social { provider, accountId, ... }`
4. **Link social account** to existing wallet user

---

## 🧪 Testing Requirements

### Unit Tests
- API route handlers
- Middleware (auth, rate limiting)
- Utility functions

### Integration Tests
- API endpoints (Fastify)
- Database operations (Prisma)
- Socket.IO events

### E2E Tests
- User authentication flow
- Post creation/deletion
- Messaging
- File uploads

### Load Testing
- API endpoints under high traffic
- WebSocket connections (1000+ concurrent)
- Database query performance

---

## 📊 Success Metrics

After migration:

✅ **Upload Size**: 100MB+ (was 3.5MB)
✅ **Timeouts**: None (was 10s max)
✅ **WebSockets**: Persistent (was unreliable)
✅ **Cost**: Lower than Vercel for API traffic
✅ **Performance**: Faster API responses
✅ **Scalability**: Each service scales independently

---

## 💰 Cost Estimate (Railway)

**Hobby Plan** ($5/month):
- 512MB RAM per service
- $0.000231/GB-hour
- Good for development/testing

**Production** (~$50-100/month):
- Web: 1GB RAM ($10-20)
- API: 2GB RAM ($20-30)
- Socket: 1GB RAM ($10-15)
- Worker: 512MB RAM ($5-10)
- PostgreSQL: $10-20
- Redis: $5-10

---

## 📝 Deliverables

### Code
- ✅ Complete monorepo structure
- ✅ All 116 API routes migrated to Fastify
- ✅ Socket.IO service with all events
- ✅ Worker service with scheduled jobs
- ✅ Updated Next.js frontend
- ✅ Railway deployment configs

### Documentation
- ✅ API documentation (endpoints, schemas)
- ✅ Socket.IO events documentation
- ✅ Deployment guide
- ✅ Development setup guide
- ✅ Environment variables reference

### Infrastructure
- ✅ Railway project configured
- ✅ All services deployed
- ✅ Database migrated
- ✅ DNS configured
- ✅ SSL certificates

---

## ⏱️ Timeline Estimate

- **Phase 1**: Setup (2-3 hours) ✅ DONE
- **Phase 2**: API Migration (20-30 hours)
- **Phase 3**: Frontend Updates (10-15 hours)
- **Phase 4**: Socket.IO Migration (5-8 hours)
- **Phase 5**: Worker Service (5-8 hours)
- **Phase 6**: Cloudinary Updates (3-5 hours)
- **Phase 7**: Railway Deployment (5-8 hours)
- **Testing**: (10-15 hours)

**Total**: 60-92 hours (~2-3 weeks full-time)

---

## 🚀 Quick Start Commands

Once fully implemented:

```bash
# Development (local)
cd pebloq-mono
npm run dev  # Runs all services in parallel

# Individual services
npm run dev:web     # http://localhost:3000
npm run dev:api     # http://localhost:4000
npm run dev:socket  # http://localhost:4001
npm run dev:worker  # Background

# Production (Railway)
git push origin main  # Auto-deploys via Railway
```

---

## 📞 Support & Maintenance

After deployment, ongoing needs:

1. **Monitoring**: Set up Railway metrics, alerts
2. **Logging**: Centralized logging (Datadog, LogDNA)
3. **Backups**: Database backup strategy
4. **Updates**: Keep dependencies updated
5. **Security**: Regular security audits

---

## 📎 Current Status

**Completed** ✅:
- Monorepo structure created
- API service basic setup
- Socket service basic setup
- Environment configuration
- Prisma schema copied
- Example routes (posts, users)

**Remaining** ⏳:
- Migrate all 116 routes
- Update frontend API calls
- Complete Socket.IO implementation
- Create Worker service
- Deploy to Railway
- DNS & SSL setup
- Testing

---

## 🎯 Hiring Brief

**Looking for**: Full-stack developer experienced with:
- Next.js 14 (App Router)
- Fastify (or Express)
- Socket.IO
- Prisma ORM
- Railway deployment
- TypeScript

**Duration**: 2-3 weeks full-time

**Budget**: $3,000-$6,000 (depending on experience)

**Deliverables**: Working Railway deployment with all features migrated

---

## 📧 Contact

This document was created for the PeBloq Railway migration project.

For questions or to start work, reference this document and the existing codebase at:
- Current: `~/PenguBook/` (Next.js on Vercel)
- Monorepo: `~/PenguBook/pebloq-mono/` (Railway structure)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-09
**Created by**: Claude (Anthropic AI)
