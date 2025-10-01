import NextAuth from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import TwitterProvider from 'next-auth/providers/twitter'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const handler = NextAuth({
  // Remove adapter - we don't want NextAuth to create users automatically
  // adapter: PrismaAdapter(prisma),
  events: {
    linkAccount: ({ user, account, profile }) => {
      // Always log account linking in production for debugging
      console.log('[NextAuth] Account linked event:', {
        provider: account.provider,
        providerAccountId: account.providerAccountId?.slice(0, 10) + '...',
        userId: user.id?.slice(0, 10) + '...',
        userName: user.name,
        timestamp: new Date().toISOString()
      })
    },
    signIn: ({ user, account, profile }) => {
      // Log sign in events for debugging
      console.log('[NextAuth] Sign in event:', {
        provider: account?.provider || 'unknown',
        userId: user.id?.slice(0, 10) + '...',
        userName: user.name,
        hasEmail: !!user.email,
        timestamp: new Date().toISOString()
      })
    },
    session: ({ session, token }) => {
      // Log session creation for debugging
      console.log('[NextAuth] Session event:', {
        hasSession: !!session,
        hasToken: !!token,
        provider: (token as any)?.account?.provider,
        timestamp: new Date().toISOString()
      })
    },
  },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify email',
        },
      },
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0', // Use OAuth 2.0
      authorization: {
        params: {
          scope: 'tweet.read users.read offline.access',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Always log OAuth sign in for production debugging
      console.log('[NextAuth] SignIn callback:', {
        provider: account?.provider,
        providerAccountId: account?.providerAccountId?.slice(0, 10) + '...',
        userName: user.name,
        userEmail: user.email?.slice(0, 10) + '...',
        profileData: profile ? Object.keys(profile).join(', ') : 'none',
        profileUsername: (profile as any)?.username || (profile as any)?.screen_name || 'none',
        fullProfile: process.env.NODE_ENV === 'development' ? profile : 'hidden in prod',
        timestamp: new Date().toISOString()
      })

      // Ensure email is null instead of empty string to avoid unique constraint issues
      if (user.email === '') {
        user.email = null
      }

      // Set a unique email to avoid conflicts - we'll handle the actual linking later
      if (!user.email) {
        user.email = `${account?.provider}-${account?.providerAccountId}@temp.oauth`
      }

      return true
    },
    async session({ session, token }) {
      // Check both direct properties and nested account object
      const provider = token.provider || (token.account as any)?.provider
      const providerAccountId = token.providerAccountId || (token.account as any)?.providerAccountId
      const accessToken = token.accessToken || (token.account as any)?.accessToken
      const avatarUrl = token.avatarUrl || (token.account as any)?.avatarUrl

      if (session.user && (provider || token.account)) {
        // Pass OAuth info to the session
        ;(session.user as any).id = token.sub // OAuth user ID
        ;(session.user as any).provider = provider
        ;(session.user as any).providerAccountId = providerAccountId
        ;(session.user as any).accessToken = accessToken
        ;(session.user as any).actualUsername = token.actualUsername || (token.account as any)?.actualUsername
        ;(session.user as any).avatarUrl = avatarUrl

        // Always log session creation for production debugging
        console.log('[NextAuth] Session callback with OAuth data:', {
          provider,
          providerAccountId: providerAccountId?.slice(0, 10) + '...',
          userName: session.user.name,
          tokenSub: token.sub?.slice(0, 10) + '...',
          hasAccessToken: !!accessToken,
          timestamp: new Date().toISOString()
        })
      } else {
        console.log('[NextAuth] Session callback - No OAuth data:', {
          hasToken: !!token,
          hasSession: !!session,
          hasProvider: !!provider,
          tokenKeys: token ? Object.keys(token).join(', ') : 'none',
          timestamp: new Date().toISOString()
        })
      }
      return session
    },
    async jwt({ token, user, account, profile, trigger }) {
      // Store account info in JWT for linking
      if (account) {
        // Extract the actual username/handle based on provider
        let actualUsername = user?.name || 'Unknown'
        let avatarUrl = user?.image || ''

        if (account.provider === 'twitter') {
          // Twitter gives us username in profile.data.username (X API v2)
          actualUsername = (profile as any)?.data?.username || (profile as any)?.username || (profile as any)?.screen_name || user?.name
          // Twitter profile image (X API v2)
          avatarUrl = (profile as any)?.data?.profile_image_url || user?.image || ''
        } else if (account.provider === 'discord') {
          // Discord username is in profile.username
          actualUsername = (profile as any)?.username || user?.name
          // Discord avatar URL
          avatarUrl = (profile as any)?.image_url || user?.image || ''
        }

        // Fresh login - store the OAuth account data
        token.provider = account.provider
        token.providerAccountId = account.providerAccountId
        token.accessToken = account.access_token
        token.actualUsername = actualUsername
        token.avatarUrl = avatarUrl

        // Also store in nested object for backwards compatibility
        token.account = {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          accessToken: account.access_token,
          actualUsername: actualUsername,
          avatarUrl: avatarUrl
        }

        // Always log JWT creation for production debugging
        console.log('[NextAuth] JWT callback with account:', {
          trigger,
          provider: account.provider,
          providerAccountId: account.providerAccountId?.slice(0, 10) + '...',
          actualUsername,
          displayName: user?.name,
          avatarUrl,
          userImage: user?.image,
          profileData: profile ? {
            discord: account.provider === 'discord' ? {
              avatar: (profile as any)?.avatar,
              image_url: (profile as any)?.image_url
            } : null,
            twitter: account.provider === 'twitter' ? {
              profile_image_url: (profile as any)?.data?.profile_image_url,
              profile_image: (profile as any)?.profile_image_url
            } : null
          } : null,
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          scope: account.scope,
          timestamp: new Date().toISOString()
        })
      } else if (trigger === 'signIn' && token.provider) {
        // Preserve OAuth data on subsequent requests
        console.log('[NextAuth] JWT callback preserving OAuth data:', {
          trigger,
          provider: token.provider,
          providerAccountId: (token.providerAccountId as string)?.slice(0, 10) + '...',
          hasAccessToken: !!token.accessToken,
          timestamp: new Date().toISOString()
        })
      } else {
        console.log('[NextAuth] JWT callback without account:', {
          trigger,
          hasUser: !!user,
          hasProfile: !!profile,
          hasStoredProvider: !!token.provider,
          tokenSub: token.sub?.slice(0, 10) + '...',
          timestamp: new Date().toISOString()
        })
      }
      return token
    },
  },
  pages: {
    error: '/?error=auth', // Redirect to home page on error
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt', // Use JWT since we're not using database adapter
  },
  debug: true, // Enable debug in production temporarily for troubleshooting
})

export { handler as GET, handler as POST }