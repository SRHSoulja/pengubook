import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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

    

    // Check if user already exists by provider account ID OR if a wallet user exists (prevent duplicates)
    const whereConditions: any[] = [{ id: token.sub }]
    if (token.provider === 'discord' && token.providerAccountId) {
      whereConditions.push({ discordId: String(token.providerAccountId) })
    }
    if (token.provider === 'twitter' && token.providerAccountId) {
      whereConditions.push({ twitterId: String(token.providerAccountId) })
    }

    let user = await prisma.user.findFirst({
      where: { OR: whereConditions },
      include: { profile: true }
    })

    // IMPORTANT: If a wallet user exists, return it instead of creating a duplicate OAuth-only user
    if (!user) {
      const walletUser = await prisma.user.findFirst({
        where: {
          AND: [
            { walletAddress: { not: null } },
            { walletAddress: { not: '' } }
          ]
        },
        include: { profile: true }
      })

      if (walletUser) {
        console.log('[OAuth Register] Wallet user exists, preventing duplicate creation. Returning existing wallet user.')
        return NextResponse.json({
          success: true,
          user: {
            id: walletUser.id,
            username: walletUser.username,
            displayName: walletUser.displayName,
            walletAddress: walletUser.walletAddress || '',
            bio: walletUser.bio || '',
            avatar: walletUser.avatar || '',
            level: walletUser.level,
            isAdmin: walletUser.isAdmin,
            isBanned: walletUser.isBanned,
            discordName: walletUser.discordName,
            twitterHandle: walletUser.twitterHandle,
            profile: walletUser.profile
          }
        })
      }
    }

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
        const retryConditions: any[] = []
        if (token.provider === 'discord' && token.providerAccountId) {
          retryConditions.push({ discordId: String(token.providerAccountId) })
        }
        if (token.provider === 'twitter' && token.providerAccountId) {
          retryConditions.push({ twitterId: String(token.providerAccountId) })
        }
        if (token.email) {
          retryConditions.push({ email: token.email })
        }

        user = await prisma.user.findFirst({
          where: { OR: retryConditions },
          include: { profile: true }
        })

        if (!user) {
          throw createError
        }
      }
    }


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