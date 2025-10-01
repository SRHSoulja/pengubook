# PenguBook Web - Complete Codebase Analysis

## Project Overview

**PenguBook** (v2.7.4-arctic-mainnet) is a Web3 social media platform built specifically for the Pudgy Penguins community. It combines traditional social networking features with blockchain technology, enabling cryptocurrency tipping, token-gated communities, and wallet-based authentication.

### Core Value Proposition
- **Web3-Native Social Platform**: Users connect via Abstract Global Wallet (AGW) instead of traditional username/password
- **Crypto Tipping System**: Send tips in various tokens (ETH, USDC, custom tokens) directly to other users
- **Token-Gated Communities**: Create exclusive communities requiring specific token holdings
- **Real-time Messaging**: WebSocket-powered encrypted messaging system
- **Achievement System**: Gamified engagement tracking with unlockable badges

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with custom cyber/penguin theme
- **State Management**: React Context (AuthProvider, ThemeProvider)
- **Real-time**: Socket.IO client
- **Web3**:
  - `@abstract-foundation/agw-client` & `@abstract-foundation/agw-react` (v1.9.1)
  - Ethers.js (v6.15.0)
  - Viem (v2.37.5)
  - Wagmi (v2.16.9)

### Backend
- **Runtime**: Next.js API Routes
- **Database**: PostgreSQL via Prisma ORM
- **Authentication**: Dual system:
  - Wallet-based (AGW)
  - OAuth (NextAuth.js for Discord/Twitter)
- **Real-time**: Socket.IO server
- **Blockchain**: Abstract L2 mainnet integration

### Infrastructure
- **Port**: 3001 (development)
- **ORM**: Prisma (v5.0.0)
- **Testing**: Jest with ts-jest
- **API Docs**: Documented via code comments

---

## Architecture Overview

### Authentication Flow

**Wallet-Based Authentication:**
1. User clicks "Connect Wallet" → AGW modal appears
2. User approves connection → `walletAddress` obtained
3. Frontend calls `/api/auth/wallet-login` with address
4. Backend creates/finds user record, returns user data
5. AuthProvider stores user in context + sessionStorage

**OAuth Authentication:**
1. User clicks "Login with Discord/Twitter"
2. NextAuth.js handles OAuth flow
3. On success, `/api/auth/oauth-register` creates user
4. User record linked to NextAuth Account table
5. Both auth methods coexist - wallet OR social

**Key File**: `/src/providers/AuthProvider.tsx`
- Manages authentication state globally
- Handles both wallet and OAuth sessions
- Auto-redirects authenticated users to dashboard
- Shows PenguinLoadingScreen during auth check

---

## Database Schema (Prisma)

### Core Models

#### User Model
```prisma
model User {
  id                String  @id @default(cuid())
  walletAddress     String? @unique
  email             String? @unique
  username          String? @unique
  displayName       String?
  bio               String?
  avatar            String?
  avatarSource      String  @default("default") // "default", "discord", "twitter"

  // Social OAuth fields
  discordId         String? @unique
  discordName       String?
  discordAvatar     String?
  twitterId         String? @unique
  twitterHandle     String?
  twitterAvatar     String?

  // Admin & moderation
  isAdmin           Boolean @default(false)
  isBanned          Boolean @default(false)

  // Gamification
  level             Int     @default(1)
  xp                Int     @default(0)

  // Status
  isOnline          Boolean @default(false)
  lastSeen          DateTime @default(now())

  // Relations
  posts             Post[]
  comments          Comment[]
  likes             Like[]
  tips              Tip[]
  messages          Message[]
  // ... 20+ more relations
}
```

#### Post Model
```prisma
model Post {
  id          String   @id @default(cuid())
  authorId    String
  content     String
  contentType String   @default("TEXT")
  mediaUrls   String   @default("[]") // JSON array
  visibility  String   @default("PUBLIC")
  isPromoted  Boolean  @default(false)

  comments    Comment[]
  likes       Like[]
  reactions   Reaction[]
  shares      Share[]
  bookmarks   Bookmark[]
  hashtags    PostHashtag[]
}
```

#### Tip Model
```prisma
model Tip {
  id              String   @id @default(cuid())
  fromUserId      String
  toUserId        String
  tokenId         String
  amount          String
  transactionHash String   @unique
  status          String   @default("PENDING")
  message         String?
  isPublic        Boolean  @default(true)
}
```

#### Token Model
```prisma
model Token {
  id              String  @id @default(cuid())
  name            String
  symbol          String  @unique
  contractAddress String  @unique
  decimals        Int
  isEnabled       Boolean @default(true)
  logoUrl         String?
}
```

#### Community Model (Token-Gated)
```prisma
model Community {
  id                   String  @id @default(cuid())
  name                 String  @unique
  displayName          String
  description          String
  category             String
  visibility           String  @default("PUBLIC")

  // Token gating
  isTokenGated         Boolean @default(false)
  tokenGateType        String? // "ERC20", "ERC721", "ERC1155"
  tokenContractAddress String?
  tokenMinAmount       String?
  tokenIds             String? @default("[]")

  members              CommunityMember[]
  moderators           CommunityModerator[]
}
```

### Specialized Models

**Token Management:**
- `HiddenToken` - User-specific token hiding
- `BlacklistedToken` - Admin-managed scam token blacklist
- `TokenReport` - User reports of scam tokens
- `VerifiedToken` - Admin-verified legitimate tokens

**Social Features:**
- `Follow` - User following system
- `Friendship` - Mutual friend requests
- `Block` - User blocking
- `Bookmark` - Save posts

**Gamification:**
- `Achievement` - Achievement definitions
- `UserAchievement` - User unlocks
- `Streak` - Daily/weekly streaks
- `Activity` - User activity log

**Messaging:**
- `Conversation` - Chat containers (DM or group)
- `Message` - Individual messages
- `MessageReadReceipt` - Read status tracking

**Content Moderation:**
- `Report` - User/post reports
- `MutedPhrase` - User-defined content filters
- `Hashtag` - Hashtag tracking and trending

---

## Key Features & User Flows

### 1. Wallet Connection & Onboarding

**Files:**
- `/src/components/WalletConnect.tsx`
- `/src/app/page.tsx` (landing page)
- `/src/app/connecting/page.tsx` (loading state)

**Flow:**
1. User lands on homepage (`/`)
2. Sees "Enter the Colony" card with WalletConnect button
3. Clicks "Connect Wallet" → AGW modal
4. After connection, redirected to `/dashboard`

**Backend:**
- `POST /api/auth/wallet-login` - Creates user if new, returns existing user

### 2. Token Tipping System

**Files:**
- `/src/components/TipButton.tsx`
- `/src/components/TipModal.tsx`
- `/src/app/api/tips/route.ts`
- `/src/app/api/tips/[id]/verify/route.ts`

**Flow:**
1. User clicks tip icon on another user's profile/post
2. TipModal opens with token selection (ETH, USDC, etc.)
3. User enters amount and optional message
4. Frontend calls blockchain to execute transfer
5. `POST /api/tips` records transaction with hash
6. Tip appears in recipient's profile
7. `/verify` endpoint polls blockchain to confirm transaction

**Transaction Verification:**
- Tips start as `status: "PENDING"`
- Background job or manual call to `/tips/[id]/verify` checks blockchain
- Status updated to `"COMPLETED"` or `"FAILED"`

### 3. Wallet Balance Display

**Files:**
- `/src/components/WalletBalance.tsx`
- `/src/app/api/wallet/balance/route.ts`

**Flow:**
1. Profile page loads wallet component
2. `GET /api/wallet/balance?address=0x...&userId=xxx` called
3. Backend:
   - Fetches ETH balance via RPC
   - Scans for ERC-20 token transfers via `eth_getLogs`
   - Gets token prices from DexScreener API
   - Filters out blacklisted/hidden tokens
   - Adds verification badges for verified tokens
4. Returns balance data with logos, prices, USD values
5. Frontend displays:
   - Native ETH balance
   - Token list with logos
   - Price per token + total value
   - Favorite button (localStorage)
   - Hide/Report buttons

**Smart Features:**
- 5-minute in-memory cache
- Automatic logo fetching from DexScreener
- Fallback logos for common tokens (ETH, USDC)
- Smart pair selection (filters Abstract chain, sorts by liquidity)

### 4. Token Scam Protection System

**Files:**
- `/src/app/api/tokens/hidden/route.ts` - User hides tokens
- `/src/app/api/tokens/report/route.ts` - Report scams
- `/src/app/api/admin/tokens/blacklist/route.ts` - Admin blacklist
- `/src/app/api/admin/tokens/verified/route.ts` - Admin verification
- `/src/components/admin/TokenBlacklistManager.tsx`
- `/src/components/admin/TokenVerificationManager.tsx`

**User Flow:**
1. User sees scam token in wallet
2. Clicks "Report Scam Token" button
3. Selects reason (SCAM, SPAM, PHISHING)
4. Token auto-hidden for that user
5. Report sent to admin panel

**Admin Flow:**
1. Admin views "Token Reports" tab
2. Sees aggregated reports by token (grouped by address)
3. Can:
   - Blacklist token (hides for ALL users)
   - Dismiss report
   - Verify legitimate tokens

**Verification Tab:**
- Shows all unique tokens from user wallets
- One-click verification for legitimate tokens
- Verified tokens get blue checkmark badge

### 5. Social Feed

**Files:**
- `/src/components/SocialFeed.tsx`
- `/src/components/feed/PostCard.tsx`
- `/src/components/feed/PostCreator.tsx`
- `/src/app/feed/page.tsx`
- `/src/app/api/feed/route.ts`

**Features:**
- Infinite scroll feed
- Post types: TEXT, IMAGE, VIDEO, LINK, POLL
- Like, comment, share, bookmark
- Hashtag support (#crypto)
- GIF picker (Giphy integration)
- Media upload
- Edit history tracking

**Feed Algorithm:**
(`/src/lib/feedAlgorithms.ts`)
- Engagement scoring (likes, comments, shares)
- Recency boost
- Following boost
- Viral content detection
- Personalized ranking

### 6. Real-Time Messaging

**Files:**
- `/src/app/messages/page.tsx` - Conversations list
- `/src/app/messages/[conversationId]/page.tsx` - Chat view
- `/src/app/api/messages/conversations/route.ts`
- `/src/app/api/messages/[conversationId]/route.ts`
- `/src/lib/websocket/server.ts`
- `/src/hooks/useWebSocket.ts`

**Features:**
- Direct messages (1-on-1)
- Group chats
- End-to-end encryption (optional)
- Read receipts
- Typing indicators
- Real-time delivery via WebSockets

**WebSocket Events:**
```typescript
// Client → Server
socket.emit('authenticate', { walletAddress })
socket.emit('send_message', { conversationId, content })
socket.emit('typing_start', { conversationId })

// Server → Client
socket.on('new_message', (message) => {...})
socket.on('user_typing', (data) => {...})
socket.on('message_read', (data) => {...})
```

**Encryption:**
- Uses Web Crypto API
- Optional per-conversation
- Keys stored locally
- `isEncrypted` flag on messages

### 7. Token-Gated Communities

**Files:**
- `/src/app/communities/page.tsx` - Browse communities
- `/src/app/communities/[id]/page.tsx` - Community view
- `/src/app/api/communities/[id]/verify-access/route.ts`
- `/src/components/TokenGateConfig.tsx`

**Access Verification:**
1. User tries to join community
2. If `isTokenGated: true`, backend checks:
   - ERC-20: `balanceOf(user) >= tokenMinAmount`
   - ERC-721: `balanceOf(user) > 0` or specific tokenIds
   - ERC-1155: `balanceOf(user, tokenId) >= amount`
3. If passes, user added to `CommunityMember`
4. If fails, shown "Insufficient tokens" error

**Community Types:**
- Public (anyone can join)
- Private (invite-only)
- Token-gated (requires holdings)

### 8. Achievement System

**Files:**
- `/src/lib/achievements.ts` - Achievement definitions
- `/src/lib/achievement-checker.ts` - Unlock logic
- `/src/app/api/achievements/route.ts`
- `/src/app/achievements/page.tsx`
- `/src/components/AchievementBadge.tsx`

**Achievement Categories:**
- ENGAGEMENT (first post, 100 likes, etc.)
- SOCIAL (10 followers, mutual friends)
- CONTENT (viral post, trending hashtag)
- MILESTONE (1 year anniversary)
- SPECIAL (rare events)

**Trigger Points:**
- Post creation
- Like received
- Follower gained
- Tip sent/received
- Streak milestones

### 9. Admin Panel

**Files:**
- `/src/app/admin/page.tsx`
- `/src/components/admin/UserManager.tsx`
- `/src/components/admin/TokenBlacklistManager.tsx`
- `/src/components/admin/TokenVerificationManager.tsx`
- `/src/app/api/admin/stats/route.ts`

**Tabs:**
1. **Overview** - Platform statistics
   - Total users, verified tokens, blacklisted tokens
   - Recent activity (new users, pending reports)
   - Quick action buttons

2. **Token Reports** - Review scam reports
   - Grouped by token address
   - Report count per token
   - Blacklist or dismiss

3. **Blacklist** - View/manage blacklisted tokens
   - Remove from blacklist
   - View reason and report history

4. **Verification** - Verify legitimate tokens
   - Auto-populated from user wallets
   - One-click verification
   - Manual entry option

5. **User Management** - Ban/unban users (placeholder)

**Access Control:**
- Only users with `isAdmin: true` can access
- Wallet address must match `NEXT_PUBLIC_ADMIN_WALLET_ADDRESS`
- Enforced at both frontend and API level

### 10. Profile System

**Files:**
- `/src/app/profile/page.tsx` - Own profile
- `/src/app/profile/[id]/page.tsx` - View others
- `/src/app/profile/edit/page.tsx` - Edit profile
- `/src/app/api/users/profile/route.ts`
- `/src/components/SocialAccountLinking.tsx`

**Profile Features:**
- Avatar (from wallet, Discord, or Twitter)
- Display name, username, bio
- Social links (Discord, Twitter)
- Privacy settings
- Wallet balance display
- Achievements
- Post history
- Followers/following lists
- Tips received (public/private)

**Social Account Linking:**
- Link Discord via OAuth
- Link Twitter/X via OAuth
- Avatar source selection
- Unlink functionality

---

## Blockchain Integration

### Abstract Global Wallet (AGW)

**Provider Setup:**
(`/src/app/layout.tsx`)
```typescript
import { GlobalWalletProvider } from '@abstract-foundation/agw-react'

<GlobalWalletProvider>
  <AuthProvider>
    {children}
  </AuthProvider>
</GlobalWalletProvider>
```

**Hook Usage:**
```typescript
import { useAbstractClient } from '@abstract-foundation/agw-react'

const { data: client } = useAbstractClient()
const address = client?.account?.address
```

**Key Features:**
- No private key management
- Email-based recovery
- Social logins (Google, Apple)
- Built-in fiat on-ramp
- Gasless transactions (optional)

### Smart Contract Interaction

**ERC-20 Token Transfers:**
(`/src/lib/blockchain.ts`)
```typescript
// Get token balance
const balanceOf = '0x70a08231' // balanceOf(address)
const data = balanceOf + address.slice(2).padStart(64, '0')

const result = await fetch(ABSTRACT_RPC_URL, {
  method: 'POST',
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'eth_call',
    params: [{ to: tokenAddress, data }, 'latest']
  })
})

// Transfer tokens
const transfer = '0xa9059cbb' // transfer(address,uint256)
const transferData = transfer +
  recipientAddress.slice(2).padStart(64, '0') +
  amount.toString(16).padStart(64, '0')
```

**Event Scanning:**
Used to find all token transfers for a wallet:
```typescript
const logs = await fetch(ABSTRACT_RPC_URL, {
  method: 'POST',
  body: JSON.stringify({
    method: 'eth_getLogs',
    params: [{
      fromBlock: '0x0',
      toBlock: 'latest',
      address: tokenAddress,
      topics: [
        '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', // Transfer event
        null,
        '0x' + walletAddress.slice(2).padStart(64, '0') // to address
      ]
    }]
  })
})
```

### Supported Networks
- **Primary**: Abstract L2 Mainnet
- **RPC**: https://api.mainnet.abs.xyz
- **Explorer**: https://abscan.org

---

## API Endpoints

### Authentication
- `POST /api/auth/wallet-login` - Wallet-based auth
- `POST /api/auth/oauth-register` - OAuth user creation
- `POST /api/auth/link-social` - Link Discord/Twitter
- `POST /api/auth/unlink-social` - Unlink social accounts

### Users
- `GET /api/users/profile` - Get user by wallet/ID
- `PUT /api/users/profile` - Update own profile
- `GET /api/users/[id]` - Get user by ID or wallet
- `GET /api/users/search` - Search users
- `POST /api/users/[id]/follow` - Follow/unfollow
- `GET /api/users/friends` - Get friends list
- `POST /api/users/block` - Block user
- `GET /api/users/privacy` - Get privacy settings

### Posts
- `GET /api/posts` - List posts
- `POST /api/posts` - Create post
- `GET /api/posts/[id]` - Get single post
- `PUT /api/posts/[id]` - Edit post
- `DELETE /api/posts/[id]` - Delete post
- `POST /api/posts/[id]/like` - Like post
- `POST /api/posts/[id]/comments` - Comment on post
- `GET /api/posts/[id]/interactions` - Get reactions

### Tips
- `POST /api/tips` - Create tip (record transaction)
- `GET /api/tips/[id]/verify` - Verify transaction on-chain

### Wallet
- `GET /api/wallet/balance` - Get token balances with prices

### Tokens (Admin)
- `GET /api/tokens/hidden` - Get user's hidden tokens
- `POST /api/tokens/hidden` - Hide token
- `DELETE /api/tokens/hidden` - Unhide token
- `POST /api/tokens/report` - Report scam token
- `GET /api/admin/tokens/reports` - Get reports (admin)
- `POST /api/admin/tokens/blacklist` - Blacklist token (admin)
- `GET /api/admin/tokens/verified` - Get verified tokens
- `POST /api/admin/tokens/verified` - Verify token (admin)
- `GET /api/admin/tokens/available` - Tokens available to verify

### Communities
- `GET /api/communities` - List communities
- `POST /api/communities` - Create community
- `GET /api/communities/[id]` - Get community
- `POST /api/communities/[id]/join` - Join community
- `POST /api/communities/[id]/verify-access` - Check token gate

### Messages
- `GET /api/messages/conversations` - List conversations
- `POST /api/messages/conversations` - Create conversation
- `GET /api/messages/[conversationId]` - Get messages
- `POST /api/messages/[conversationId]` - Send message
- `POST /api/messages/[conversationId]/read` - Mark as read

### Feed
- `GET /api/feed` - Get personalized feed

### Admin
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/users` - List users (admin)
- `PUT /api/admin/users/[id]` - Update user (admin)

### Achievements
- `GET /api/achievements` - List achievements
- `POST /api/achievements/init` - Initialize default achievements

### Hashtags
- `GET /api/hashtags/trending` - Trending hashtags
- `GET /api/hashtags/search` - Search hashtags

### Bookmarks
- `GET /api/bookmarks` - Get bookmarks
- `POST /api/bookmarks` - Bookmark post
- `DELETE /api/bookmarks` - Remove bookmark

### Reports
- `POST /api/reports` - Report user/post

### Muted Phrases
- `GET /api/muted-phrases` - Get user's muted phrases
- `POST /api/muted-phrases` - Add muted phrase
- `DELETE /api/muted-phrases/[id]` - Remove muted phrase

---

## Directory Structure

```
PenguBook/
├── prisma/
│   └── schema.prisma           # Database schema
│
├── public/                     # Static assets
│
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (pages)
│   │   │   ├── page.tsx        # Landing page
│   │   │   ├── dashboard/      # Main dashboard
│   │   │   ├── feed/           # Social feed
│   │   │   ├── profile/        # User profiles
│   │   │   ├── messages/       # Chat system
│   │   │   ├── communities/    # Community pages
│   │   │   ├── admin/          # Admin panel
│   │   │   ├── achievements/   # Achievement gallery
│   │   │   ├── bookmarks/      # Saved posts
│   │   │   ├── settings/       # User settings
│   │   │   ├── discover/       # User discovery
│   │   │   ├── friends/        # Friends management
│   │   │   └── search/         # Search page
│   │   │
│   │   ├── api/                # API Routes
│   │   │   ├── auth/           # Authentication endpoints
│   │   │   ├── users/          # User management
│   │   │   ├── posts/          # Post CRUD
│   │   │   ├── tips/           # Tipping system
│   │   │   ├── wallet/         # Wallet operations
│   │   │   ├── tokens/         # Token management
│   │   │   ├── messages/       # Messaging
│   │   │   ├── communities/    # Communities
│   │   │   ├── feed/           # Feed generation
│   │   │   ├── admin/          # Admin operations
│   │   │   ├── achievements/   # Achievement system
│   │   │   ├── bookmarks/      # Bookmark management
│   │   │   ├── hashtags/       # Hashtag system
│   │   │   └── socket/         # WebSocket endpoint
│   │   │
│   │   └── layout.tsx          # Root layout with providers
│   │
│   ├── components/             # React components
│   │   ├── admin/              # Admin-specific components
│   │   │   ├── TokenBlacklistManager.tsx
│   │   │   ├── TokenVerificationManager.tsx
│   │   │   └── UserManager.tsx
│   │   ├── community/          # Community components
│   │   ├── editor/             # Rich text editor
│   │   ├── feed/               # Feed components
│   │   │   ├── PostCard.tsx
│   │   │   ├── PostCreator.tsx
│   │   │   └── SocialFeed.tsx
│   │   ├── Navbar.tsx          # Navigation
│   │   ├── WalletConnect.tsx   # AGW connection
│   │   ├── WalletBalance.tsx   # Token balance display
│   │   ├── TipButton.tsx       # Tipping interface
│   │   ├── TipModal.tsx        # Tip creation modal
│   │   └── [50+ other components]
│   │
│   ├── lib/                    # Utility libraries
│   │   ├── agw.ts              # AGW helpers
│   │   ├── blockchain.ts       # Blockchain interactions
│   │   ├── achievements.ts     # Achievement definitions
│   │   ├── achievement-checker.ts
│   │   ├── feedAlgorithms.ts   # Feed ranking
│   │   ├── engagement.ts       # Engagement tracking
│   │   ├── encryption.ts       # Message encryption
│   │   ├── content-filter.ts   # Content moderation
│   │   ├── websocket/
│   │   │   ├── server.ts       # WebSocket server
│   │   │   └── init.ts         # WS initialization
│   │   └── [other utilities]
│   │
│   ├── providers/              # React Context providers
│   │   ├── AuthProvider.tsx    # Authentication state
│   │   └── ThemeProvider.tsx   # Theme management
│   │
│   ├── hooks/                  # Custom React hooks
│   │   └── useWebSocket.ts     # WebSocket hook
│   │
│   ├── types/                  # TypeScript definitions
│   │   └── index.ts            # Global types
│   │
│   └── styles/
│       └── globals.css         # Global styles + Tailwind
│
├── scripts/                    # Utility scripts
│   ├── create-test-user.js
│   └── seed-test-data.js
│
├── tests/                      # Jest tests
│
├── .env.local                  # Environment variables
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
└── README.md
```

---

## Missing or Unfinished Features

### 1. **Gasless Transaction Service** (Removed)
- Code exists in `/src/lib/gasless/` but marked as "not deployed"
- Would allow users to send transactions without paying gas
- Requires backend service to sponsor transactions
- **Status**: Implemented but disabled

### 2. **On-Chain Post Storage** (Removed)
- Originally planned to store posts on-chain
- Code removed in commit "Remove all blockchain/onchain post functionality"
- **Current**: Posts stored only in database
- **Reason**: Likely cost/complexity

### 3. **NFT Integration**
- Token-gated communities support ERC-721/ERC-1155
- But no NFT gallery or minting features
- **Status**: Partial implementation

### 4. **Advertisement System** (Incomplete)
- Database tables exist (`Advertisement`, `AdInteraction`)
- No frontend implementation visible
- **Status**: Backend ready, frontend missing

### 5. **Post Edits**
- `PostEdit` model exists for tracking edit history
- API endpoint exists: `GET /api/posts/[id]/edits`
- But edit functionality may not be fully wired in UI
- **Status**: Backend complete, frontend unclear

### 6. **Analytics Dashboard** (Placeholder)
- Admin panel has "Analytics" tab
- Shows "Coming soon!" message
- **Status**: Planned but not built

### 7. **Community Features** (Incomplete)
- Community creation works
- Token-gating works
- But missing:
  - Community posts/feed
  - Moderation tools
  - Member management UI
- **Status**: Basic structure only

### 8. **Notification System**
- `Notification` table exists
- No visible notification UI in navbar/dashboard
- **Status**: Backend ready, frontend missing

### 9. **Content Moderation**
- Report system exists (`Report` model)
- `MutedPhrase` filtering exists
- But no admin moderation dashboard for reviewing reports
- **Status**: User-facing works, admin tools incomplete

### 10. **Email Notifications**
- No email service integration
- No notification emails for tips, follows, messages
- **Status**: Not implemented

### 11. **Mobile App**
- Web-only (responsive design exists)
- No React Native or PWA manifest
- **Status**: Web-first

### 12. **Search Functionality**
- `/app/search/page.tsx` exists
- Limited to user search
- No post/hashtag/community search
- **Status**: Basic implementation

---

## Known Issues & Technical Debt

### 1. **Prisma Connection Management**
- Many API routes use `new PrismaClient()` inline
- Should use singleton pattern to avoid connection leaks
- **Impact**: Potential database connection exhaustion

### 2. **Error Handling**
- Inconsistent error responses across APIs
- Some routes return `{ error }`, others `{ message }`
- **Impact**: Frontend error handling complexity

### 3. **Type Safety**
- Some `any` types in codebase
- Missing TypeScript strict mode in some areas
- **Impact**: Runtime errors possible

### 4. **Cache Strategy**
- In-memory cache in wallet balance route
- No Redis or persistent cache
- **Impact**: Cache lost on server restart

### 5. **WebSocket Reconnection**
- Basic reconnection logic exists
- May need exponential backoff
- **Impact**: User experience during network issues

### 6. **Token Price Accuracy**
- Relies on DexScreener API
- No fallback if API down
- **Impact**: Balances may show without prices

### 7. **Rate Limiting**
- No rate limiting on API routes
- Vulnerable to abuse
- **Impact**: DDoS risk

### 8. **CSRF Protection**
- CSRF library exists (`/src/lib/csrf.ts`)
- Not enforced on all state-changing endpoints
- **Impact**: Security risk

### 9. **Input Validation**
- Some endpoints lack input validation
- Relying on database constraints
- **Impact**: Invalid data may cause errors

### 10. **Testing Coverage**
- Jest configured but minimal test files
- No E2E tests
- **Impact**: Regressions possible

---

## Security Considerations

### Authentication
- ✅ Wallet signature verification
- ✅ Session management via sessionStorage
- ❌ No CSRF tokens on mutations
- ❌ No rate limiting

### Authorization
- ✅ Admin role checking
- ✅ User-specific data filtering
- ⚠️ Some endpoints check auth client-side only

### Data Privacy
- ✅ Privacy settings (DM controls, activity visibility)
- ✅ Optional message encryption
- ⚠️ Wallet addresses publicly visible

### Content Moderation
- ✅ User blocking
- ✅ Content reporting
- ✅ Muted phrases
- ✅ Token scam protection
- ⚠️ No automatic spam detection

### Smart Contract Security
- ✅ Read-only RPC calls for balances
- ✅ User signs transactions via AGW (not server)
- ✅ Transaction verification before marking complete
- ❌ No formal audit of tip recording logic

---

## Performance Optimizations

### Implemented
- ✅ 5-minute cache for wallet balances
- ✅ Database indexes on high-query fields
- ✅ Lazy loading for feeds (infinite scroll)
- ✅ React.memo for expensive components
- ✅ WebSocket for real-time instead of polling

### Needed
- ❌ Image optimization/CDN
- ❌ Database query optimization (N+1 issues possible)
- ❌ API response caching (Redis)
- ❌ Code splitting for large pages
- ❌ Service worker for offline support

---

## Environment Variables

Required in `.env.local`:

```env
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=<random-secret>

# Admin
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=0x...

# OAuth (Optional)
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# Giphy (Optional)
NEXT_PUBLIC_GIPHY_API_KEY=

# Abstract RPC (hardcoded in code)
ABSTRACT_RPC_URL=https://api.mainnet.abs.xyz
```

---

## Deployment Checklist

### Pre-Deploy
- [ ] Set all environment variables in production
- [ ] Run database migrations: `npx prisma migrate deploy`
- [ ] Seed initial data (achievements, tokens)
- [ ] Configure admin wallet address
- [ ] Set up PostgreSQL database
- [ ] Configure CORS for production domain

### Security
- [ ] Enable HTTPS
- [ ] Add rate limiting
- [ ] Enable CSRF protection
- [ ] Audit API endpoints for authorization
- [ ] Review exposed environment variables

### Performance
- [ ] Set up CDN for static assets
- [ ] Enable Next.js image optimization
- [ ] Configure database connection pooling
- [ ] Add Redis for caching
- [ ] Monitor API response times

### Monitoring
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Add analytics
- [ ] Monitor WebSocket connections
- [ ] Track database performance
- [ ] Set up uptime monitoring

---

## Getting Started (For New Developers)

### 1. **Clone and Install**
```bash
git clone <repo>
cd PenguBook
npm install
```

### 2. **Database Setup**
```bash
# Create PostgreSQL database
createdb pengubook

# Copy environment template
cp .env.example .env.local

# Edit .env.local with your values
nano .env.local

# Run migrations
npx prisma generate
npx prisma db push

# (Optional) Seed test data
node scripts/seed-test-data.js
```

### 3. **Run Development Server**
```bash
npm run dev
# Open http://localhost:3001
```

### 4. **Connect Wallet**
- Install Abstract Global Wallet browser extension
- Create/import wallet
- Connect on PenguBook homepage
- You're now a user!

### 5. **Become Admin** (For Testing)
```bash
# Set your wallet address in .env.local
NEXT_PUBLIC_ADMIN_WALLET_ADDRESS=0xYourAddressHere

# Restart dev server
# Visit /admin to access admin panel
```

### 6. **Key Files to Understand**
1. `/src/providers/AuthProvider.tsx` - How auth works
2. `/src/app/layout.tsx` - App structure
3. `/prisma/schema.prisma` - Data models
4. `/src/components/WalletConnect.tsx` - Wallet integration
5. `/src/app/api/wallet/balance/route.ts` - Blockchain interaction example

---

## Common Development Tasks

### Add a New API Endpoint
1. Create file: `/src/app/api/your-endpoint/route.ts`
2. Export `GET`, `POST`, etc. functions
3. Use Prisma for database queries
4. Return `NextResponse.json()`

### Add a New Page
1. Create file: `/src/app/your-page/page.tsx`
2. Use `'use client'` if you need React hooks
3. Wrap in layout (happens automatically)
4. Access at `/your-page`

### Add a New Database Model
1. Edit `/prisma/schema.prisma`
2. Run `npx prisma generate`
3. Run `npx prisma db push` (dev) or `npx prisma migrate dev` (prod)
4. Access via `prisma.yourModel.create(...)`

### Add a New Component
1. Create file in `/src/components/YourComponent.tsx`
2. Export default function
3. Import in your page
4. Use TypeScript interfaces for props

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server (port 3001)
npm run build            # Build for production
npm start                # Start production server

# Database
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:studio        # Open Prisma Studio
npm run db:migrate       # Create migration
npm run db:reset         # Reset database (destructive!)

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Fix linting issues
npm run typecheck        # Check TypeScript errors

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

---

## Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, React 18, TypeScript |
| **Styling** | Tailwind CSS |
| **Blockchain** | Abstract L2, AGW, Ethers.js |
| **Database** | PostgreSQL + Prisma ORM |
| **Real-time** | Socket.IO |
| **Auth** | Custom wallet auth + NextAuth.js |
| **APIs** | Next.js API Routes |
| **Deployment** | Vercel (recommended) |

---

## Project Maturity Assessment

| Feature | Status | Completeness |
|---------|--------|--------------|
| **Authentication** | ✅ Stable | 95% |
| **User Profiles** | ✅ Stable | 90% |
| **Social Feed** | ✅ Stable | 85% |
| **Tipping System** | ✅ Stable | 90% |
| **Wallet Integration** | ✅ Stable | 95% |
| **Token Management** | ✅ Stable | 100% |
| **Messaging** | ⚠️ Beta | 70% |
| **Communities** | ⚠️ Beta | 60% |
| **Achievements** | ⚠️ Beta | 75% |
| **Admin Panel** | ✅ Stable | 90% |
| **Search** | ⚠️ Basic | 40% |
| **Notifications** | ❌ Missing | 20% |
| **Analytics** | ❌ Missing | 10% |
| **Mobile App** | ❌ Missing | 0% |

**Overall Project Maturity**: **Beta** (70% complete)
- Core features work well
- Some features incomplete
- Production-ready with caveats
- Active development ongoing

---

## Conclusion

PenguBook is a sophisticated Web3 social platform with strong fundamentals:

**Strengths:**
- ✅ Robust wallet authentication via AGW
- ✅ Comprehensive token tipping system
- ✅ Advanced scam token protection
- ✅ Well-designed database schema
- ✅ Real-time messaging infrastructure
- ✅ Gamification features (achievements, levels)
- ✅ Admin tools for moderation

**Areas for Improvement:**
- ⚠️ Complete unfinished features (communities, notifications, analytics)
- ⚠️ Add comprehensive testing
- ⚠️ Improve error handling consistency
- ⚠️ Implement rate limiting and CSRF protection
- ⚠️ Optimize database queries
- ⚠️ Add caching layer (Redis)

**Recommended Next Steps:**
1. Complete community features (posts, moderation)
2. Build notification system (in-app + email)
3. Implement comprehensive testing
4. Add rate limiting and security hardening
5. Optimize performance (caching, code splitting)
6. Build analytics dashboard
7. Consider mobile app (PWA or React Native)

This is a solid foundation for a production Web3 social platform, with unique features like AGW integration and on-chain tipping that differentiate it from traditional social networks.
