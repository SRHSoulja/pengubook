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

      // Link OAuth account to existing user by provider ID
      if (account && profile) {
        try {
          const { PrismaClient } = await import('@prisma/client')
          const prisma = new PrismaClient()

          // Check if user exists by provider ID
          let existingUser = null
          if (account.provider === 'discord') {
            existingUser = await prisma.user.findUnique({
              where: { discordId: account.providerAccountId }
            })
          } else if (account.provider === 'twitter') {
            existingUser = await prisma.user.findUnique({
              where: { twitterId: account.providerAccountId }
            })
          }

          // If no user found, create new user
          if (!existingUser) {
            await prisma.user.create({
              data: {
                name: user.name,
                image: user.image,
                discordId: account.provider === 'discord' ? account.providerAccountId : undefined,
                discordName: account.provider === 'discord' ? profile.username : undefined,
                twitterId: account.provider === 'twitter' ? account.providerAccountId : undefined,
                twitterHandle: account.provider === 'twitter' ? profile.username : undefined,
              }
            })
          } else {
            // Update existing user with OAuth info
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                name: user.name || existingUser.name,
                image: user.image || existingUser.image,
                discordName: account.provider === 'discord' ? profile.username : existingUser.discordName,
                twitterHandle: account.provider === 'twitter' ? profile.username : existingUser.twitterHandle,
              }
            })
          }

          await prisma.$disconnect()
        } catch (error) {
          console.error('Error linking OAuth account:', error)
        }
      }

      return true
    },
    async session({ session, user, token }) {
      // Add user data to session
      if (session.user && user) {
        session.user.id = user.id
        // Add provider account IDs to session for AuthProvider lookup
        session.user.discordId = user.discordId
        session.user.twitterId = user.twitterId
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