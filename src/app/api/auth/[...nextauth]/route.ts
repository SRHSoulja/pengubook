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
      console.log('🔗 Account linked:', `${account.provider} account linked to user ${user.id?.slice(0, 8)}...`)
    },
  },
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'identify',
        },
      },
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: '2.0', // Use OAuth 2.0
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('🔑 OAuth Sign in:', `${account?.provider} - ${user.name || user.email || 'unnamed'}`)

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
        console.log('📝 OAuth session:', `${(token.account as any).provider} - ${session.user.name}`)
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
        console.log('🔑 JWT created:', `${account.provider} account for linking`)
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
  debug: process.env.NODE_ENV === 'development', // Only enable debug in development
})

export { handler as GET, handler as POST }