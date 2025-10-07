import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger, logAPI } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    logAPI.request('users/search', { query, limit })

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    

    try {
      // Search users by username, display name, discord name (if visible), twitter handle (if visible), or wallet address
      const users = await prisma.user.findMany({
        where: {
          OR: [
            {
              username: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              displayName: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              AND: [
                {
                  discordName: {
                    contains: query,
                    mode: 'insensitive'
                  }
                },
                {
                  profile: {
                    showDiscord: true
                  }
                }
              ]
            },
            {
              AND: [
                {
                  twitterHandle: {
                    contains: query,
                    mode: 'insensitive'
                  }
                },
                {
                  profile: {
                    showTwitter: true
                  }
                }
              ]
            },
            {
              walletAddress: {
                contains: query,
                mode: 'insensitive'
              }
            }
          ],
          // Only return non-banned users
          isBanned: false
        },
        select: {
          id: true,
          username: true,
          displayName: true,
          walletAddress: true,
          avatar: true,
          bio: true,
          level: true,
          isAdmin: true,
          discordName: true,
          twitterHandle: true,
          createdAt: true,
          profile: {
            select: {
              followersCount: true,
              followingCount: true,
              postsCount: true,
              profileVerified: true,
              showDiscord: true,
              showTwitter: true
            }
          }
        },
        orderBy: [
          { level: 'desc' },  // Higher level users first
          { createdAt: 'asc' } // Then by join date
        ],
        take: Math.min(limit, 50) // Max 50 results
      })

      logger.debug('Search completed', { query, resultsCount: users.length }, { component: 'UserSearch' })


      // Format results for frontend
      const searchResults = users.map(user => ({
        id: user.id,
        username: user.username || 'unknown',
        displayName: user.displayName || 'Unknown User',
        walletAddress: user.walletAddress,
        avatar: user.avatar,
        bio: user.bio,
        level: user.level,
        isAdmin: user.isAdmin,
        // Only show social accounts if user has them visible
        discordName: user.profile?.showDiscord ? user.discordName : null,
        twitterHandle: user.profile?.showTwitter ? user.twitterHandle : null,
        joinedAt: user.createdAt,
        profile: user.profile || {
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          profileVerified: false,
          showDiscord: false,
          showTwitter: false
        }
      }))

      return NextResponse.json({
        success: true,
        query,
        results: searchResults,
        totalResults: searchResults.length,
        timestamp: new Date().toISOString()
      })
    } catch (dbError: any) {
      logAPI.error('users/search', dbError)
      return NextResponse.json(
        { error: 'Search failed', details: dbError.message },
        { status: 500 }
      )
    }
  } catch (error: any) {
    logAPI.error('users/search', error)

    return NextResponse.json(
      { error: 'Failed to process search request', details: error.message },
      { status: 500 }
    )
  }
}