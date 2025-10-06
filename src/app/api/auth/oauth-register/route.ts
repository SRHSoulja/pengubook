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
      where: { OR: whereConditions }
    }) as any

    // IMPORTANT: If a wallet user exists, return it instead of creating a duplicate OAuth-only user
    if (!user) {
      const walletUser = await prisma.user.findFirst({
        where: {
          AND: [
            { walletAddress: { not: null } },
            { walletAddress: { not: '' } }
          ]
        }
      }) as any

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
      // SECURITY: Check if this social account is already linked to another user (prevent duplicates)
      if (token.provider === 'discord' && token.providerAccountId) {
        const existingDiscordUser = await prisma.user.findFirst({
          where: { discordId: String(token.providerAccountId) }
        })
        if (existingDiscordUser) {
          console.error('[OAuth Register] Discord account already linked to another user:', {
            discordId: String(token.providerAccountId).slice(0, 10) + '...',
            existingUserId: existingDiscordUser.id.slice(0, 10) + '...',
            existingWallet: existingDiscordUser.walletAddress?.slice(0, 10) + '...'
          })
          return NextResponse.json(
            {
              error: 'This Discord account is already linked to another wallet address. Please use a different Discord account or unlink it from the other wallet first.',
              code: 'DUPLICATE_SOCIAL_ACCOUNT'
            },
            { status: 409 }
          )
        }
      }

      if (token.provider === 'twitter' && token.providerAccountId) {
        const existingTwitterUser = await prisma.user.findFirst({
          where: { twitterId: String(token.providerAccountId) }
        })
        if (existingTwitterUser) {
          console.error('[OAuth Register] Twitter account already linked to another user:', {
            twitterId: String(token.providerAccountId).slice(0, 10) + '...',
            existingUserId: existingTwitterUser.id.slice(0, 10) + '...',
            existingWallet: existingTwitterUser.walletAddress?.slice(0, 10) + '...'
          })
          return NextResponse.json(
            {
              error: 'This Twitter/X account is already linked to another wallet address. Please use a different Twitter/X account or unlink it from the other wallet first.',
              code: 'DUPLICATE_SOCIAL_ACCOUNT'
            },
            { status: 409 }
          )
        }
      }

      // Create new user from OAuth data
      // Username for OAuth users should be their social handle
      const username = String(token.actualUsername || token.name || token.email || `oauth_user_${token.sub.slice(-8)}`)
      const displayName = String(token.actualUsername || token.name || `User ${token.sub.slice(-4)}`)

      try {
        user = await prisma.user.create({
          data: {
            // Don't set ID manually - let Prisma auto-generate it
            name: token.name ? String(token.name) : null,
            username,
            displayName,
            email: token.email ? String(token.email) : null,
            avatar: token.picture ? String(token.picture) : '',
            image: token.picture ? String(token.picture) : '',
            walletAddress: '', // OAuth users don't have wallet initially
            discordId: token.provider === 'discord' && token.providerAccountId ? String(token.providerAccountId) : null,
            twitterId: token.provider === 'twitter' && token.providerAccountId ? String(token.providerAccountId) : null,
            discordName: token.provider === 'discord' && token.actualUsername ? String(token.actualUsername) : null,
            twitterHandle: token.provider === 'twitter' && token.actualUsername ? String(token.actualUsername) : null,
          }
        }) as any

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
          where: { OR: retryConditions }
        }) as any

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