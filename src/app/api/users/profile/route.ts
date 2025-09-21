import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Skip database operations during build
    if (!process.env.DATABASE_URL || process.env.NODE_ENV === 'production' && !request.url) {
      return NextResponse.json({
        success: false,
        error: 'Database not available during build'
      }, { status: 503 })
    }

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')
    const oauthId = searchParams.get('oauthId')
    const nextAuthId = searchParams.get('nextAuthId')

    console.log('[UserProfile] Request received:', {
      walletAddress: walletAddress?.slice(0, 10) + '...' || 'none',
      oauthId: oauthId?.slice(0, 10) + '...' || 'none',
      nextAuthId: nextAuthId?.slice(0, 10) + '...' || 'none',
      timestamp: new Date().toISOString()
    })

    if (!walletAddress && !oauthId && !nextAuthId) {
      return NextResponse.json(
        { error: 'Wallet address, OAuth ID, or NextAuth ID is required' },
        { status: 400 }
      )
    }

    let user = null
    if (walletAddress) {
      user = await prisma.user.findUnique({
        where: { walletAddress },
        include: { profile: true }
      })
    } else if (nextAuthId) {
      // Look up user by NextAuth ID - could be the user ID directly or from Account table
      user = await prisma.user.findUnique({
        where: { id: nextAuthId },
        include: { profile: true }
      })

      // If not found, try looking in Account table
      if (!user) {
        const account = await prisma.account.findFirst({
          where: { providerAccountId: nextAuthId },
          include: {
            user: {
              include: { profile: true }
            }
          }
        })
        user = account?.user || null
      }
    } else if (oauthId) {
      // Try finding by Discord ID first, then Twitter ID
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { discordId: oauthId },
            { twitterId: oauthId }
          ]
        },
        include: { profile: true }
      })
    }

    if (!user) {
      console.log('[UserProfile] User not found:', {
        walletAddress: walletAddress?.slice(0, 10) + '...' || 'none',
        nextAuthId: nextAuthId?.slice(0, 10) + '...' || 'none',
        oauthId: oauthId?.slice(0, 10) + '...' || 'none',
        timestamp: new Date().toISOString()
      })

      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    console.log('[UserProfile] User found:', {
      userId: user.id.slice(0, 10) + '...',
      walletAddress: user.walletAddress?.slice(0, 10) + '...' || 'none',
      hasDiscord: !!user.discordId,
      hasTwitter: !!user.twitterId,
      discordName: user.discordName,
      twitterHandle: user.twitterHandle,
      timestamp: new Date().toISOString()
    })

    await prisma.$disconnect()

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username || user.displayName || 'Unknown',
        displayName: user.displayName || user.name || 'Unknown',
        walletAddress: user.walletAddress || '',
        bio: user.bio || '',
        avatar: user.avatar || user.image || '',
        level: user.level,
        isAdmin: user.isAdmin,
        isBanned: user.isBanned,
        discordName: user.discordName,
        twitterHandle: user.twitterHandle,
        discordId: user.discordId,
        twitterId: user.twitterId,
        profile: user.profile
      }
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Skip database operations during build
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'Database not available during build'
      }, { status: 503 })
    }

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const body = await request.json()
    const { walletAddress, displayName, bio, interests, discordName, twitterHandle } = body

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Find the user first
    const existingUser = await prisma.user.findUnique({
      where: { walletAddress }
    })

    if (!existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: { walletAddress },
      data: {
        displayName: displayName || existingUser.displayName,
        bio: bio || existingUser.bio,
        discordName: discordName !== undefined ? discordName : existingUser.discordName,
        twitterHandle: twitterHandle !== undefined ? twitterHandle : existingUser.twitterHandle,
        profile: interests ? {
          ...existingUser.profile,
          interests: JSON.stringify(interests)
        } : existingUser.profile
      }
    })

    await prisma.$disconnect()

    return NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        username: updatedUser.username,
        displayName: updatedUser.displayName,
        walletAddress: updatedUser.walletAddress,
        bio: updatedUser.bio,
        avatar: updatedUser.avatar,
        level: updatedUser.level,
        isAdmin: updatedUser.isAdmin,
        isBanned: updatedUser.isBanned,
        discordName: updatedUser.discordName,
        twitterHandle: updatedUser.twitterHandle,
        profile: updatedUser.profile
      }
    })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}