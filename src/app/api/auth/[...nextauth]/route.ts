import NextAuth from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import TwitterProvider from 'next-auth/providers/twitter'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
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

      // Allow OAuth sign-in - we'll handle account linking in the frontend after callback
      return true
    },
    async session({ session, user, token }) {
      // Add user data to session
      if (session.user && user) {
        session.user.id = user.id
        console.log('📝 Session created:', `User ID: ${user.id?.slice(0, 8)}...`)

        // For OAuth users, we need to get the account info
        try {
          const { PrismaClient } = await import('@prisma/client')
          const prisma = new PrismaClient()

          const accounts = await prisma.account.findMany({
            where: { userId: user.id }
          })

          console.log('💳 Accounts found:', accounts.map(acc => `${acc.provider}:${acc.providerAccountId?.slice(0, 8)}...`).join(', '))

          // Add provider IDs to session
          const discordAccount = accounts.find(acc => acc.provider === 'discord')
          const twitterAccount = accounts.find(acc => acc.provider === 'twitter')

          if (discordAccount) {
            session.user.discordId = discordAccount.providerAccountId
          }
          if (twitterAccount) {
            session.user.twitterId = twitterAccount.providerAccountId
          }

          await prisma.$disconnect()
        } catch (error) {
          console.error('Error fetching user accounts:', error)
        }
      }
      return session
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.discordId = user.discordId
        token.twitterId = user.twitterId
      }
      return token
    },
  },
  pages: {
    error: '/?error=auth', // Redirect to home page on error
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'database',
  },
  debug: process.env.NODE_ENV === 'development', // Only enable debug in development
  // Allow linking OAuth accounts even if they have the same email
  allowDangerousEmailAccountLinking: true,
})

export { handler as GET, handler as POST }