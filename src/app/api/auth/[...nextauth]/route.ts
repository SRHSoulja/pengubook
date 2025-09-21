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
      // For OAuth linking, we just pass the account info in the session
      if (token.account && session.user) {
        ;(session.user as any).id = token.sub // OAuth user ID
        ;(session.user as any).provider = (token.account as any).provider
        ;(session.user as any).providerAccountId = (token.account as any).providerAccountId
        ;(session.user as any).accessToken = (token.account as any).accessToken
        // Always log session creation for production debugging
        console.log('[NextAuth] Session callback:', {
          provider: (token.account as any).provider,
          providerAccountId: (token.account as any).providerAccountId?.slice(0, 10) + '...',
          userName: session.user.name,
          tokenSub: token.sub?.slice(0, 10) + '...',
          hasAccessToken: !!(token.account as any).accessToken,
          timestamp: new Date().toISOString()
        })
      } else {
        console.log('[NextAuth] Session callback - No account in token:', {
          hasToken: !!token,
          hasSession: !!session,
          tokenKeys: token ? Object.keys(token).join(', ') : 'none',
          timestamp: new Date().toISOString()
        })
      }
      return session
    },
    async jwt({ token, user, account, profile }) {
      // Store account info in JWT for linking
      if (account) {
        token.account = {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          accessToken: account.access_token
        }
        // Always log JWT creation for production debugging
        console.log('[NextAuth] JWT callback with account:', {
          provider: account.provider,
          providerAccountId: account.providerAccountId?.slice(0, 10) + '...',
          hasAccessToken: !!account.access_token,
          hasRefreshToken: !!account.refresh_token,
          scope: account.scope,
          timestamp: new Date().toISOString()
        })
      } else {
        console.log('[NextAuth] JWT callback without account:', {
          hasUser: !!user,
          hasProfile: !!profile,
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