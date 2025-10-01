import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const prisma = new PrismaClient()

    // Get other users (excluding current user)
    const suggestedUsers = await prisma.user.findMany({
      where: {
        id: {
          not: userId
        },
        displayName: {
          not: null
        },
        username: {
          not: null
        }
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        level: true,
        xp: true,
        isAdmin: true,
        profile: {
          select: {
            profileVerified: true,
            followersCount: true,
            postsCount: true
          }
        }
      },
      orderBy: {
        level: 'desc'
      },
      take: limit
    })

    await prisma.$disconnect()

    // Format the response to match the expected structure
    const formattedUsers = suggestedUsers.map(user => ({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        level: user.level,
        profile: {
          profileVerified: user.profile?.profileVerified || user.isAdmin,
          followersCount: user.profile?.followersCount || 0,
          postsCount: user.profile?.postsCount || 0
        }
      },
      reason: user.level >= 3 ? 'Active community member' : 'New penguin to discover',
      mutualConnections: 0,
      commonInterests: [],
      score: user.level * 10 + (user.xp || 0)
    }))

    return NextResponse.json({
      success: true,
      data: {
        suggestedUsers: formattedUsers,
        suggestedCommunities: [] // Empty for now
      }
    })

  } catch (error: any) {
    console.error('[Social Discover] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch discover data', details: error.message },
      { status: 500 }
    )
  }
}