# PenguBook User Settings API - Complete Architecture

## Overview
This document provides a comprehensive overview of the entire user settings and profile management API system in PenguBook.

---

## API Endpoints

### 1. `/api/users/profile` - User Profile Management
**File:** `src/app/api/users/profile/route.ts`

#### GET - Fetch User Profile
**Query Parameters:**
- `walletAddress` - Ethereum wallet address
- `oauthId` - Discord or Twitter OAuth ID
- `nextAuthId` - NextAuth session ID

**Returns:**
```typescript
{
  success: true,
  user: {
    id: string
    username: string
    displayName: string
    walletAddress: string
    bio: string
    avatar: string
    avatarSource: 'default' | 'discord' | 'twitter'
    level: number
    isAdmin: boolean
    isBanned: boolean
    discordName: string
    discordAvatar: string
    twitterHandle: string
    twitterAvatar: string
    discordId: string
    twitterId: string
    profile: Profile
  }
}
```

#### PUT - Update User Profile
**Request Body:**
```typescript
{
  walletAddress: string (required)
  displayName?: string
  username?: string
  bio?: string
  interests?: string[]
  avatarSource?: 'default' | 'discord' | 'twitter'
  bannerImage?: string (Cloudinary URL)
  showNSFW?: boolean
  allowedNSFWCategories?: string[]
}
```

**Features:**
- Updates user profile information
- Handles avatar source switching (default/discord/twitter)
- Manages banner images with Cloudinary cleanup
- Stores interests as JSON
- NSFW content preferences

---

### 2. `/api/users/privacy` - Privacy Settings
**File:** `src/app/api/users/privacy/route.ts`
**Auth:** Required (withAuth middleware)
**Rate Limit:** GET: 30/min, PUT: 10/min

#### GET - Fetch Privacy Settings
**Headers:**
- `x-wallet-address` - User's wallet address

**Returns:**
```typescript
{
  success: true,
  data: {
    allowDirectMessages: boolean
    dmPrivacyLevel: 'ALL' | 'FRIENDS_ONLY' | 'NONE'
    showReadReceipts: boolean
    showTypingIndicator: boolean
    showOnlineStatus: boolean
    isPrivate: boolean
    showActivity: boolean
    showTips: boolean
    showDiscord: boolean
    showTwitter: boolean
    featuredCommunityId: string | null
  }
}
```

#### PUT - Update Privacy Settings
**Request Body:** (all fields optional)
```typescript
{
  allowDirectMessages?: boolean
  dmPrivacyLevel?: 'ALL' | 'FRIENDS_ONLY' | 'NONE'
  showReadReceipts?: boolean
  showTypingIndicator?: boolean
  showOnlineStatus?: boolean
  isPrivate?: boolean
  showActivity?: boolean
  showTips?: boolean
  showDiscord?: boolean
  showTwitter?: boolean
}
```

**Validation:**
- `dmPrivacyLevel` must be one of: 'ALL', 'FRIENDS_ONLY', 'NONE'
- All boolean fields are validated as boolean types

---

### 3. `/api/users/featured-community` - Featured Community
**File:** `src/app/api/users/featured-community/route.ts`

#### PUT - Set Featured Community
**Headers:**
- `x-user-id` - User's ID

**Request Body:**
```typescript
{
  communityId: string | null
}
```

**Returns:**
```typescript
{
  success: true,
  featuredCommunityId: string | null
}
```

**Validation:**
- Verifies user is an ACTIVE member of the community before allowing it to be featured
- Allows null to remove featured community

---

### 4. `/api/users/block` - User Blocking
**File:** `src/app/api/users/block/route.ts`

#### GET - List Blocked Users
**Headers:**
- `x-wallet-address` - User's wallet address

**Returns:**
```typescript
{
  success: true,
  data: BlockedUser[]
}

interface BlockedUser {
  id: string
  user: {
    id: string
    username: string
    displayName: string
    avatar?: string
  }
  blockedAt: string
}
```

#### POST - Block a User
**Request Body:**
```typescript
{
  userId: string // ID of user to block
}
```

**Side Effects:**
- Removes existing friendships
- Removes follow relationships
- Prevents messaging

#### DELETE - Unblock a User
**Query Parameters:**
- `userId` - ID of user to unblock

---

### 5. `/api/users/[id]` - User Operations
**File:** `src/app/api/users/[id]/route.ts`

#### GET - Get User by ID
**Returns:** Full user profile with stats

#### PUT - Update User (Admin)
**Admin-only operations**

#### DELETE - Delete User (Admin)
**Admin-only operations**

---

### 6. `/api/users/friends` - Friend Management
**File:** `src/app/api/users/friends/route.ts`

#### GET - List Friends
**Returns:** List of accepted friendships

#### POST - Send Friend Request
**Request Body:**
```typescript
{
  targetUserId: string
}
```

#### `/api/users/friends/[friendshipId]`
- **PATCH** - Accept/Reject friend request
- **DELETE** - Remove friendship

---

### 7. `/api/users/[id]/follow` - Follow System
**File:** `src/app/api/users/[id]/follow/route.ts`

#### POST - Follow a User
#### DELETE - Unfollow a User

---

### 8. `/api/users/search` - User Search
**File:** `src/app/api/users/search/route.ts`

#### GET - Search Users
**Query Parameters:**
- `q` - Search query (username, displayName, discord, twitter)

---

## Frontend Components

### 1. Settings Page - `/settings`
**File:** `src/app/settings/page.tsx`

**Sections:**
1. **Account Information** (read-only)
   - Wallet address
   - Username
   - Display name
   - Level & admin status
   - Link to profile edit page

2. **Social Account Linking**
   - Component: `SocialAccountLinking`
   - Link/unlink Discord
   - Link/unlink X/Twitter

3. **Privacy Settings**
   - Component: `PrivacySettings`
   - Message privacy controls
   - Profile privacy controls
   - Featured community selection
   - Blocked users management

4. **Muted Phrases**
   - Component: `MutedPhrasesManager`
   - Content filtering

---

### 2. PrivacySettings Component
**File:** `src/components/PrivacySettings.tsx`

**Features:**
- Real-time toggle switches for all privacy settings
- Automatic saving on change
- Loading states
- Three main sections:
  1. **Message Privacy**
     - Allow Direct Messages toggle
     - DM privacy level (Everyone/Friends Only/No One)
     - Show Read Receipts
     - Show Typing Indicator
     - Show Online Status

  2. **Profile Privacy**
     - Private Profile
     - Show Activity
     - Show Tips
     - Show Discord (with recommendation to keep visible)
     - Show X/Twitter (with recommendation to keep visible)

  3. **Featured Community**
     - Select from joined communities
     - None option

  4. **Blocked Users**
     - List of blocked users
     - Unblock functionality

**State Management:**
- Fetches settings from `/api/users/privacy` on mount
- Updates individual settings via PUT requests
- Featured community via `/api/users/featured-community`
- Blocked users via `/api/users/block`

---

### 3. Profile Edit Page - `/profile/edit`
**File:** `src/app/profile/edit/page.tsx`

**Features:**
- Username & display name editing
- Bio editing
- Avatar source selection (default/discord/twitter)
- Banner image upload (Cloudinary)
- Interests management
- NSFW content preferences

**Updates via:** `/api/users/profile` PUT

---

## Database Schema (Relevant Fields)

### User Model
```prisma
model User {
  id              String
  walletAddress   String?
  username        String?
  displayName     String?
  name            String?
  bio             String?
  avatar          String?
  avatarSource    String? // 'default', 'discord', 'twitter'
  level           Int @default(1)
  isAdmin         Boolean @default(false)
  isBanned        Boolean @default(false)

  // Social OAuth
  discordId       String?
  discordName     String?
  discordAvatar   String?
  twitterId       String?
  twitterHandle   String?
  twitterAvatar   String?

  profile         Profile?
  blockedUsers    Block[]
  friends         Friendship[]
  following       Follow[]
}
```

### Profile Model
```prisma
model Profile {
  userId                  String @unique

  // Privacy - Messaging
  allowDirectMessages     Boolean @default(true)
  dmPrivacyLevel          DmPrivacyLevel @default(ALL)
  showReadReceipts        Boolean @default(true)
  showTypingIndicator     Boolean @default(true)
  showOnlineStatus        Boolean @default(true)

  // Privacy - Profile
  isPrivate               Boolean @default(false)
  showActivity            Boolean @default(true)
  showTips                Boolean @default(true)
  showDiscord             Boolean @default(true)
  showTwitter             Boolean @default(true)

  // Content
  interests               String? // JSON array
  bannerImage             String?
  showNSFW                Boolean @default(false)
  allowedNSFWCategories   String? // JSON array

  // Featured
  featuredCommunityId     String?

  user                    User @relation(fields: [userId], references: [id])
}

enum DmPrivacyLevel {
  ALL
  FRIENDS_ONLY
  NONE
}
```

---

## Security Features

### Authentication
- All privacy/settings endpoints use `withAuth` middleware
- Validates wallet address or session token
- User context injected into request handlers

### Rate Limiting
- Privacy GET: 30 requests/minute
- Privacy PUT: 10 requests/minute
- Prevents abuse and DoS attacks

### Validation
- DM privacy level enum validation
- Boolean type validation for all toggles
- Community membership verification for featured communities
- User existence checks before blocking

### Data Protection
- Messages encrypted at rest (AES-256-GCM)
- CRON_SECRET for automated cleanup jobs
- ENCRYPTION_SECRET for message encryption
- JWT_SECRET for session tokens

---

## API Response Patterns

### Success Response
```typescript
{
  success: true,
  data?: any,
  content?: string, // Success message
  user?: User
}
```

### Error Response
```typescript
{
  success?: false,
  error: string, // User-friendly error message
  details?: string // Technical details (optional)
}
```

### HTTP Status Codes
- `200` - Success
- `400` - Bad request (validation error)
- `401` - Unauthorized (missing auth)
- `403` - Forbidden (insufficient permissions)
- `404` - Not found
- `500` - Internal server error
- `503` - Service unavailable (during build)

---

## Environment Variables

### Required for User Settings
```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_SECRET="..."
JWT_SECRET="..."

# Message Security
ENCRYPTION_SECRET="..." # 64-char hex (32 bytes)
CRON_SECRET="..." # 64-char hex (32 bytes)

# OAuth (for social linking)
DISCORD_CLIENT_ID="..."
DISCORD_CLIENT_SECRET="..."
TWITTER_CLIENT_ID="..."
TWITTER_CLIENT_SECRET="..."

# Cloudinary (for banner uploads)
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."
```

---

## User Flow Examples

### 1. User Updates Privacy Settings
```
1. User navigates to /settings
2. PrivacySettings component loads
3. Component fetches current settings: GET /api/users/privacy
4. User toggles "Show Read Receipts"
5. handleToggle() called → updatePrivacySettings()
6. PUT /api/users/privacy { showReadReceipts: false }
7. Server validates, updates database
8. Component updates local state with response
9. User sees toggle state change
```

### 2. User Blocks Another User
```
1. User clicks "Block" on another user's profile
2. POST /api/users/block { userId: "target-id" }
3. Server creates Block record
4. Server removes any Friendship records
5. Server removes any Follow records
6. User redirected or modal closed
7. Target user can no longer message or see content
```

### 3. User Features a Community
```
1. User navigates to /settings
2. Scrolls to Featured Community section
3. Selects a community from radio buttons
4. updateFeaturedCommunity() called
5. PUT /api/users/featured-community { communityId: "xyz" }
6. Server verifies user is ACTIVE member
7. Profile updated with featuredCommunityId
8. Community badge appears on user's profile
```

---

## Best Practices

### For API Development
1. Always use `withAuth` middleware for protected routes
2. Apply rate limiting with `withRateLimit`
3. Validate all user inputs
4. Use Prisma transactions for multi-step operations
5. Log important operations with userId prefix
6. Return consistent response formats
7. Handle errors gracefully with user-friendly messages

### For Frontend Development
1. Show loading states during API calls
2. Disable controls while saving
3. Update local state optimistically when appropriate
4. Provide clear feedback on success/error
5. Use TypeScript interfaces for type safety
6. Batch related settings together visually
7. Add helpful descriptions for each setting

### For Security
1. Never expose sensitive data in client-side code
2. Always validate on server-side (never trust client)
3. Use environment variables for secrets
4. Implement proper rate limiting
5. Sanitize user inputs
6. Use HTTPS in production
7. Keep dependencies updated

---

## Recent Enhancements

### Messaging Privacy Controls (Latest)
Added three new privacy settings:
- `showReadReceipts` - Control read receipt visibility
- `showTypingIndicator` - Toggle typing indicator
- `showOnlineStatus` - Control online status visibility

**Implementation:**
- Database: Added fields to Profile model with `@default(true)`
- API: Extended `/api/users/privacy` GET/PUT to handle new fields
- UI: Added toggle controls in PrivacySettings component
- Security: Added CRON_SECRET for automated message cleanup

**Files Modified:**
- `prisma/schema.prisma` - Added new Profile fields
- `src/app/api/users/privacy/route.ts` - Extended API
- `src/components/PrivacySettings.tsx` - Added UI controls
- `.env` - Added CRON_SECRET

---

## Testing Checklist

### Privacy Settings
- [ ] All toggles load correct initial state
- [ ] Toggling each setting saves to database
- [ ] Changes persist after page reload
- [ ] DM privacy level updates correctly
- [ ] Featured community selector shows only ACTIVE memberships
- [ ] Blocked users list displays correctly
- [ ] Unblock functionality works
- [ ] Rate limiting prevents abuse
- [ ] Unauthorized access returns 401

### Profile Updates
- [ ] Username updates save correctly
- [ ] Display name updates save correctly
- [ ] Bio updates save correctly
- [ ] Avatar source switching works
- [ ] Banner image upload works
- [ ] Old banner gets deleted from Cloudinary
- [ ] Interests save as JSON array
- [ ] NSFW preferences save correctly

### User Blocking
- [ ] Blocking creates Block record
- [ ] Blocking removes Friendship records
- [ ] Blocking removes Follow records
- [ ] Blocked users can't send messages
- [ ] Blocked users can't see content
- [ ] Unblocking restores normal state
- [ ] Block list displays correctly

---

## Future Improvements

### Potential Enhancements
1. **Bulk Privacy Updates** - Update multiple settings in one API call
2. **Privacy Presets** - Quick presets (Public, Friends Only, Private)
3. **Export Settings** - Allow users to export their settings as JSON
4. **Import Settings** - Import settings from backup
5. **Activity Log** - Track privacy setting changes
6. **Two-Factor Auth** - Add 2FA for account security
7. **Session Management** - View and revoke active sessions
8. **Data Download** - GDPR-compliant data export
9. **Account Deletion** - Self-service account deletion
10. **Privacy Dashboard** - Visual analytics of privacy settings

### Performance Optimizations
1. Cache privacy settings in Redis
2. Batch database queries where possible
3. Add database indexes on frequently queried fields
4. Implement GraphQL for flexible data fetching
5. Use WebSockets for real-time privacy updates

---

## Troubleshooting

### Common Issues

**Issue:** Privacy settings not loading
- Check: User is authenticated
- Check: Database connection is active
- Check: Profile record exists for user
- Solution: Create profile via upsert if missing

**Issue:** Settings not saving
- Check: Rate limit not exceeded
- Check: Valid data types sent
- Check: User has permission
- Solution: Check browser console for errors

**Issue:** Blocked users still visible
- Check: Block record exists in database
- Check: Frontend filtering logic
- Check: API returns blocked user IDs
- Solution: Refresh page or clear cache

**Issue:** Featured community not showing
- Check: User is ACTIVE member
- Check: Community ID is valid
- Check: Profile has featuredCommunityId set
- Solution: Re-select community in settings

---

## API Changelog

### v1.2.0 (Current) - Enhanced Messaging Privacy
- Added `showReadReceipts` field
- Added `showTypingIndicator` field
- Added `showOnlineStatus` field
- Added CRON_SECRET environment variable
- Updated PrivacySettings UI with new controls

### v1.1.0 - Message Encryption
- Added message encryption at rest (AES-256-GCM)
- Added message deletion (soft delete)
- Added message editing (15-minute window)
- Added self-destructing messages
- Added automated cleanup cron job

### v1.0.0 - Initial Release
- User profile management
- Privacy settings (basic)
- User blocking
- Friend system
- Follow system
- Featured communities
- Social account linking

---

## Contact & Support

For issues or questions about the user settings API:
- File issues at: https://github.com/anthropics/claude-code/issues
- Review documentation at: https://docs.claude.com/en/docs/claude-code/

---

**Last Updated:** 2025-10-03
**Maintained By:** PenguBook Development Team
**Status:** ✅ Production Ready
