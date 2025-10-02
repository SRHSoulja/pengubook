# Claude Code Context - PenguBook

## Project Overview
PenguBook is a Next.js 14.2.32 social platform with Web3 wallet integration (Abstract Global Wallet), OAuth authentication (Discord/Twitter via NextAuth.js), and Prisma ORM with PostgreSQL database.

## Brand Colors
Official Pengu brand colors for custom icons and design:
- **Pengu Green**: `#00E177` - Primary brand color
- **Pengu Orange**: `#FFB92E` - Accent color (used for beak & feet in icons)

## Architecture

### Authentication System
- **Wallet Auth**: Abstract Global Wallet integration via `@abstract-foundation/agw-react`
- **OAuth**: NextAuth.js with Discord and Twitter providers
- **Dual Auth Support**: Users can authenticate via wallet OR social accounts, and link them together

### Key Components
- **AuthProvider** (`src/providers/AuthProvider.tsx`): Main authentication context that manages:
  - Wallet authentication state
  - OAuth session state
  - User profile data
  - Prevents duplicate user creation during social linking flow

- **NextAuth Config** (`src/app/api/auth/[...nextauth]/route.ts`):
  - Discord and Twitter OAuth providers
  - JWT callbacks that upgrade Twitter avatar quality from `_normal` (48x48) to `_400x400` (400x400)
  - Custom user data extraction from OAuth profiles

- **Social Linking** (`src/app/api/auth/link-social/route.ts`):
  - API endpoint for linking Discord/Twitter to existing wallet users
  - Also upgrades Twitter avatar quality during linking

- **OAuth Registration** (`src/app/api/auth/oauth-register/route.ts`):
  - Creates OAuth-only users for users without wallets
  - **CRITICAL**: Contains duplicate prevention logic - checks if wallet user exists before creating OAuth-only user
  - Returns existing wallet user instead of creating duplicate

## Recent Critical Fixes

### 1. Twitter Avatar Quality (SOLVED ✅)
**Problem**: Twitter profile pictures were blurry (48x48 `_normal` version)

**Solution**: Replace `_normal.` with `_400x400.` in avatar URLs
- Implemented in NextAuth JWT callback (lines 133-149)
- Implemented in link-social API (lines 141-151)
- Works across both OAuth flow and social linking flow

**Code Pattern**:
```typescript
if (twitterAvatar) {
  twitterAvatar = twitterAvatar.replace('_normal.', '_400x400.')
}
```

### 2. Duplicate User Prevention (SOLVED ✅)
**Problem**: Unlinking/relinking social accounts created duplicate users

**Root Cause**: AuthProvider's OAuth session handler was calling `createOrUpdateOAuthUser` even during social linking flow

**Multi-Layer Solution**:

**Layer 1 - Client Side** (`AuthProvider.tsx` lines 103-129):
```typescript
// Check if we're in the linking flow
const isLinkingFlow = typeof window !== 'undefined' && (
  sessionStorage.getItem('linkToUserId') ||
  sessionStorage.getItem('pengubook-auth')
)

if (isLinkingFlow) {
  console.log('In linking flow, skipping OAuth user creation')
  return
}
```

**Layer 2 - Server Side** (`oauth-register/route.ts` lines 44-77):
```typescript
// If a wallet user exists, return it instead of creating duplicate
if (!user) {
  const walletUser = await prisma.user.findFirst({
    where: {
      AND: [
        { walletAddress: { not: null } },
        { walletAddress: { not: '' } }
      ]
    },
    include: { profile: true }
  })

  if (walletUser) {
    console.log('[OAuth Register] Wallet user exists, preventing duplicate creation')
    return NextResponse.json({ success: true, user: walletUser })
  }
}
```

## Database Schema Notes

### User Model (Prisma)
Key fields:
- `walletAddress`: Wallet users have this, OAuth-only users have empty string
- `discordId`, `discordName`, `discordAvatar`: Discord account data
- `twitterId`, `twitterHandle`, `twitterAvatar`: Twitter account data
- `avatar`: Primary avatar URL (can be from wallet, Discord, or Twitter)
- `isAdmin`, `isBanned`, `level`: User permissions and progression

## Development Workflow

### Local Development
```bash
npm run dev  # Runs on http://localhost:3001
npx prisma studio --port 5555  # Database GUI
```

### Testing & Debugging
```bash
# Check for duplicate users and avatar quality
node scripts/check-and-fix.js

# Manual database queries
node -e "const { PrismaClient } = require('@prisma/client'); ..."
```

### Deployment
- **Platform**: Vercel
- **Important**: Changes must be pushed to GitHub to trigger Vercel deployment
- Test on production at vercel.app domain, not just localhost

## Common Issues & Solutions

### Issue: Changes Not Reflected on Vercel
**Solution**: Always `git add`, `git commit`, `git push` to deploy changes

### Issue: Multiple Dev Servers Running
**Solution**:
```bash
lsof -ti:3001 | xargs -r kill -9  # Kill all processes on port 3001
npm run dev  # Start fresh
```

### Issue: OAuth Flow Creating Duplicates
**Solution**: Check both:
1. SessionStorage has `pengubook-auth` (indicates wallet user logged in)
2. Server-side check in oauth-register for existing wallet users

### Issue: Blurry Twitter Avatars
**Solution**: All Twitter avatar URLs should use `_400x400.` not `_normal.`
- Check NextAuth JWT callback
- Check link-social API endpoint

## Git Commit Convention
Used in this project:
```
Brief imperative title

Detailed explanation of what changed and why.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

## Environment Variables
Key variables:
- `DATABASE_URL`: PostgreSQL connection
- `NEXTAUTH_SECRET`: NextAuth JWT secret
- `NEXTAUTH_URL`: App URL for OAuth callbacks
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`: Discord OAuth
- `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`: Twitter OAuth v2
- `NEXT_PUBLIC_ADMIN_WALLET_ADDRESS`: Admin wallet for permissions

## Testing Checklist (Social Linking)
After making auth changes, test:
1. ✅ Link Twitter → Check avatar is SHARP (400x400)
2. ✅ Link Discord → Check avatar exists
3. ✅ Unlink both accounts
4. ✅ Re-link both accounts → **NO duplicate users created**
5. ✅ Check database: Only 1 user with wallet address
6. ✅ Check social fields populated correctly

## Key Files Reference

### Authentication Flow
- `src/app/api/auth/[...nextauth]/route.ts` - NextAuth config, OAuth providers
- `src/app/api/auth/oauth-register/route.ts` - OAuth user creation
- `src/app/api/auth/link-social/route.ts` - Link social to wallet user
- `src/providers/AuthProvider.tsx` - Client-side auth context

### User APIs
- `src/app/api/users/profile/route.ts` - Get user profile
- `src/app/api/users/[id]/route.ts` - User operations

### Utilities
- `scripts/check-and-fix.js` - Check duplicates and fix avatars
- `prisma/schema.prisma` - Database schema

## Recent Commits (Reference)
- `f126bfd` - Prevent duplicate user creation in OAuth registration
- `e2b2af7` - Previous fixes
- `a05b1af` - Remove blockchain/onchain post functionality

## Admin Access
Admin wallet: `0xae2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02`
- Has `isAdmin: true` in database
- Can access `/admin` dashboard
- Token verification and management capabilities

## Current State: STABLE ✅
- Twitter avatars: SHARP (400x400)
- Discord avatars: Working
- Duplicate prevention: Working
- Social linking: Working
- OAuth flow: Working
- No known critical issues
