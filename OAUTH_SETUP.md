# OAuth Integration Setup Guide

PeBloq now supports OAuth integration with Discord and X (Twitter) for verified social connections and notifications.

## Features

✅ **OAuth Flows**: Secure authentication with Discord and X
✅ **Callback Routes**: Proper handling of OAuth responses
✅ **Token Storage**: Encrypted token storage for notifications
✅ **Auto-Verification**: Automatic username/ID population
✅ **Notification Support**: Send Discord/X notifications to users
✅ **Disconnect Support**: Users can disconnect accounts anytime

## Setup Instructions

### 1. Discord OAuth Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application or select existing one
3. Go to **OAuth2** → **General**
4. Add redirect URI: `https://yourdomain.com/api/auth/callback/discord`
5. Copy **Client ID** and **Client Secret** to your `.env` file:
   ```
   DISCORD_CLIENT_ID=your_discord_client_id
   DISCORD_CLIENT_SECRET=your_discord_client_secret
   ```

#### Optional: Discord Bot for Notifications
1. Go to **Bot** tab in your Discord app
2. Create a bot and copy the token:
   ```
   DISCORD_BOT_TOKEN=your_discord_bot_token
   ```
3. Bot permissions needed: `Send Messages`, `Read Message History`

### 2. X (Twitter) OAuth Setup

1. Go to [Twitter Developer Portal](https://developer.twitter.com/apps)
2. Create a new app or select existing one
3. Go to **App Settings** → **OAuth 2.0**
4. Add callback URI: `https://yourdomain.com/api/auth/callback/twitter`
5. Enable **OAuth 2.0** with PKCE
6. Copy **Client ID** and **Client Secret** to your `.env` file:
   ```
   TWITTER_CLIENT_ID=your_twitter_client_id
   TWITTER_CLIENT_SECRET=your_twitter_client_secret
   ```

### 3. Required Scopes

**Discord:**
- `identify` - Get user profile information
- `email` - Access user's email address

**X (Twitter):**
- `tweet.read` - Read user's tweets
- `users.read` - Read user profile information
- `offline.access` - Refresh tokens

## How It Works

### User Flow
1. User clicks "Connect Discord" or "Connect X" in settings
2. Redirected to OAuth provider for authentication
3. User authorizes PeBloq access
4. Callback route handles the response
5. User profile updated with verified social account
6. Tokens stored securely for notifications

### Developer Integration

#### Send Notifications
```typescript
import { notifyUserOfTip, notifyUserOfFollow, notifyUserOfFriendRequest } from '@/lib/notifications'

// Send tip notification
await notifyUserOfTip(fromUserId, toUserId, "10", "ETH")

// Send follow notification
await notifyUserOfFollow(followerId, followingId)

// Send friend request notification
await notifyUserOfFriendRequest(initiatorId, receiverId)
```

#### Check Connection Status
```typescript
const user = await prisma.user.findUnique({
  where: { id: userId },
  include: { profile: true }
})

const socialLinks = JSON.parse(user.profile?.socialLinks || '{}')
const hasDiscord = !!socialLinks.discord
const hasTwitter = !!socialLinks.twitter
```

## Security Notes

- OAuth tokens are stored in the database (consider encryption for production)
- State parameter includes wallet address for security
- PKCE used for Twitter OAuth 2.0
- Tokens have expiration dates and should be refreshed
- Users can disconnect accounts to revoke access

## API Endpoints

### OAuth Initialization
- `GET /api/auth/discord?wallet={address}` - Start Discord OAuth
- `GET /api/auth/twitter?wallet={address}` - Start Twitter OAuth

### OAuth Callbacks
- `GET /api/auth/discord/callback` - Handle Discord callback
- `GET /api/auth/twitter/callback` - Handle Twitter callback

### Account Management
- `POST /api/auth/discord/disconnect` - Disconnect Discord
- `POST /api/auth/twitter/disconnect` - Disconnect Twitter

## Testing

1. Set up your OAuth apps with localhost callback URLs:
   - Discord: `http://localhost:3000/api/auth/callback/discord`
   - Twitter: `http://localhost:3000/api/auth/callback/twitter`

2. Add environment variables to `.env.local`

3. Start your development server and test the OAuth flows

## Production Deployment

1. Update callback URLs to your production domain
2. Add production environment variables
3. Consider implementing token encryption
4. Set up proper error monitoring for OAuth flows

## Troubleshooting

**Discord Issues:**
- Ensure redirect URI matches exactly (trailing slash matters)
- Check that OAuth2 is enabled on your Discord app
- Verify bot token if using notifications

**Twitter Issues:**
- Make sure OAuth 2.0 is enabled (not OAuth 1.0a)
- PKCE must be enabled for the flow to work
- Check that callback URL is whitelisted

**General:**
- Check browser network tab for API errors
- Verify environment variables are loaded
- Check server logs for detailed error messages