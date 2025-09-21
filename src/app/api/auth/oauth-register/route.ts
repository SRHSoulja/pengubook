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

    // Check if user already exists by provider account ID
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { id: token.sub },
          token.provider === 'discord' ? { discordId: token.providerAccountId } : {},
          token.provider === 'twitter' ? { twitterId: token.providerAccountId } : {}
        ]
      },
      include: { profile: true }
    })

    if (!user) {
      // Create new user from OAuth data
      const username = token.actualUsername || token.name || `user_${token.sub.slice(-6)}`
      const displayName = token.name || `User ${token.sub.slice(-4)}`

      try {
        user = await prisma.user.create({
          data: {
            // Don't set ID manually - let Prisma auto-generate it
            name: token.name,
            username,
            displayName,
            email: token.email,
            avatar: token.picture || '',
            image: token.picture || '',
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
      } catch (createError) {
        console.error('[OAuth Register] User creation failed:', createError)

        // Try to find user again in case of race condition
        user = await prisma.user.findFirst({
          where: {
            OR: [
              token.provider === 'discord' ? { discordId: token.providerAccountId } : {},
              token.provider === 'twitter' ? { twitterId: token.providerAccountId } : {},
              { email: token.email }
            ].filter(condition => Object.keys(condition).length > 0)
          },
          include: { profile: true }
        })

        if (!user) {
          throw createError
        }
      }
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

  } catch (error: any) {
    console.error('[OAuth Register] Registration failed:', {
      error: error.message,
      code: error.code,
      stack: error.stack
    })
    return NextResponse.json(
      {
        error: 'Registration failed',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    )
  }
}