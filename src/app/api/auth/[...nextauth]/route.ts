import NextAuth from 'next-auth'
import DiscordProvider from 'next-auth/providers/discord'
import TwitterProvider from 'next-auth/providers/twitter'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const handler = NextAuth({
  adapter: PrismaAdapter(prisma),
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
      console.log('Sign in attempt:', { user, account, profile })
      // Let NextAuth handle user creation automatically
      return true
    },
    async session({ session, user, token }) {
      // Add user data to session
      if (session.user && user) {
        session.user.id = user.id
        console.log('Session user data:', user)

        // For OAuth users, we need to get the account info
        try {
          const { PrismaClient } = await import('@prisma/client')
          const prisma = new PrismaClient()

          const accounts = await prisma.account.findMany({
            where: { userId: user.id }
          })

          console.log('User accounts:', accounts)

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
    signIn: '/', // Redirect to home page for sign in
    error: '/?error=auth', // Redirect to home page on error
  },
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'database',
  },
  debug: process.env.NODE_ENV === 'development',
})

export { handler as GET, handler as POST }