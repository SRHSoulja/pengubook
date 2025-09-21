import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'following' // 'following', 'discover', 'trending'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const prisma = new PrismaClient()

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isBanned: true }
    })

    if (!user) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.isBanned) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Banned users cannot access feed' },
        { status: 403 }
      )
    }

    let whereClause: any = {
      visibility: 'PUBLIC'
    }

    if (type === 'following') {
      // Get posts from users the current user follows + their own posts
      const followingUsers = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true }
      })

      const followingIds = followingUsers.map(f => f.followingId)
      followingIds.push(userId) // Include user's own posts

      whereClause.authorId = {
        in: followingIds
      }
    } else if (type === 'discover') {
      // Exclude posts from users already followed and own posts
      const followingUsers = await prisma.follow.findMany({
        where: { followerId: userId },
        select: { followingId: true }
      })

      const excludeIds = followingUsers.map(f => f.followingId)
      excludeIds.push(userId)

      whereClause.authorId = {
        notIn: excludeIds
      }
    }
    // For 'trending', use default whereClause (all public posts)

    const posts = await prisma.post.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            level: true,
            isAdmin: true,
            discordName: true,
            twitterHandle: true,
            profile: {
              select: {
                profileVerified: true
              }
            }
          }
        },
        likes: {
          select: {
            userId: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 3 // Show latest 3 likes
        },
        comments: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 2 // Show latest 2 comments
        },
        shares: {
          select: {
            id: true,
            userId: true,
            createdAt: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true
          }
        }
      },
      orderBy: type === 'trending'
        ? [
            { isPromoted: 'desc' },
            { createdAt: 'desc' }
          ]
        : { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    // For trending feed, add engagement scoring
    if (type === 'trending') {
      const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // 24 hours ago

      posts.sort((a, b) => {
        // Calculate engagement score (likes + comments * 2 + shares * 3)
        const scoreA = (a._count.likes || 0) + (a._count.comments || 0) * 2 + (a._count.shares || 0) * 3
        const scoreB = (b._count.likes || 0) + (b._count.comments || 0) * 2 + (b._count.shares || 0) * 3

        // Boost recent posts
        const timeBoostA = a.createdAt > cutoffTime ? 1.5 : 1
        const timeBoostB = b.createdAt > cutoffTime ? 1.5 : 1

        // Boost promoted posts
        const promoBoostA = a.isPromoted ? 2 : 1
        const promoBoostB = b.isPromoted ? 2 : 1

        const finalScoreA = scoreA * timeBoostA * promoBoostA
        const finalScoreB = scoreB * timeBoostB * promoBoostB

        return finalScoreB - finalScoreA
      })
    }

    // Check which posts the current user has liked
    const userLikes = await prisma.like.findMany({
      where: {
        userId,
        postId: {
          in: posts.map(p => p.id)
        }
      },
      select: { postId: true }
    })

    const likedPostIds = new Set(userLikes.map(like => like.postId))

    await prisma.$disconnect()

    const formattedPosts = posts.map(post => ({
      id: post.id,
      content: post.content,
      contentType: post.contentType,
      mediaUrls: JSON.parse(post.mediaUrls || '[]'),
      visibility: post.visibility,
      isPromoted: post.isPromoted,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: {
        ...post.author,
        profileVerified: post.author.profile?.profileVerified || false
      },
      likes: post.likes.map(like => ({
        userId: like.userId,
        createdAt: like.createdAt,
        user: like.user
      })),
      comments: post.comments,
      shares: post.shares,
      stats: {
        likes: post._count.likes,
        comments: post._count.comments,
        shares: post._count.shares
      },
      userInteractions: {
        hasLiked: likedPostIds.has(post.id),
        hasShared: post.shares.some(share => share.userId === userId)
      }
    }))

    return NextResponse.json({
      success: true,
      feed: formattedPosts,
      feedType: type,
      pagination: {
        limit,
        offset,
        hasMore: posts.length === limit
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Feed] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feed', details: error.message },
      { status: 500 }
    )
  }
}