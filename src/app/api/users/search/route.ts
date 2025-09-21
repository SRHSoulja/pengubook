import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { logger, logAPI } from '@/lib/logger'

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

    const prisma = new PrismaClient()

    try {
      // Search users by username, display name, discord name, twitter handle, or wallet address
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
              discordName: {
                contains: query,
                mode: 'insensitive'
              }
            },
            {
              twitterHandle: {
                contains: query,
                mode: 'insensitive'
              }
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
              profileVerified: true
            }
          }
        },
        orderBy: [
          { level: 'desc' },  // Higher level users first
          { createdAt: 'asc' } // Then by join date
        ],
        take: Math.min(limit, 50) // Max 50 results
      })

      logger.debug('Search completed', { query, resultsCount: users.length }, 'UserSearch')

      await prisma.$disconnect()

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
        discordName: user.discordName,
        twitterHandle: user.twitterHandle,
        joinedAt: user.createdAt,
        profile: user.profile || {
          followersCount: 0,
          followingCount: 0,
          postsCount: 0,
          profileVerified: false
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
      await prisma.$disconnect()
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