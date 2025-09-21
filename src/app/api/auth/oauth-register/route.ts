import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getToken } from 'next-auth/jwt'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    // Skip database operations during build
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'Database not available during build'
      }, { status: 503 })
    }

    // Get NextAuth token to verify the user is authenticated
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })

    if (!token?.sub) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const prisma = new PrismaClient()

    // Check if user already exists
    let user = await prisma.user.findUnique({
      where: { id: token.sub },
      include: { profile: true }
    })

    if (!user) {
      // Create new user from OAuth data
      const username = token.actualUsername || token.name || `user_${token.sub.slice(-6)}`
      const displayName = token.name || `User ${token.sub.slice(-4)}`

      user = await prisma.user.create({
        data: {
          id: token.sub, // Use NextAuth ID as our user ID
          username,
          displayName,
          avatar: token.picture || '',
          walletAddress: '', // OAuth users don't have wallet initially
          discordId: token.provider === 'discord' ? token.providerAccountId : undefined,
          twitterId: token.provider === 'twitter' ? token.providerAccountId : undefined,
          discordName: token.provider === 'discord' ? token.actualUsername : undefined,
          twitterHandle: token.provider === 'twitter' ? token.actualUsername : undefined,
        },
        include: { profile: true }
      })

      console.log('[OAuth Register] Created new user:', {
        id: user.id.slice(0, 10) + '...',
        username: user.username,
        provider: token.provider
      })
    }

    await prisma.$disconnect()

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        walletAddress: user.walletAddress || '',
        bio: user.bio || '',
        avatar: user.avatar || '',
        level: user.level,
        isAdmin: user.isAdmin,
        isBanned: user.isBanned,
        discordName: user.discordName,
        twitterHandle: user.twitterHandle,
        profile: user.profile
      }
    })

  } catch (error) {
    console.error('OAuth register error:', error)
    return NextResponse.json(
      { error: 'Registration failed' },
      { status: 500 }
    )
  }
}