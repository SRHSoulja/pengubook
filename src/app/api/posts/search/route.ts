import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: false,
        error: 'Search query must be at least 2 characters',
        posts: [],
        pagination: { limit, offset, hasMore: false }
      }, { status: 400 })
    }

    const searchTerm = query.trim()

    // Build search conditions
    const searchConditions: any[] = [
      { content: { contains: searchTerm, mode: 'insensitive' } }
    ]

    // If query starts with #, also search by hashtag tag (without the #)
    if (searchTerm.startsWith('#')) {
      searchConditions.push({
        hashtags: {
          some: {
            hashtag: {
              tag: {
                equals: searchTerm.slice(1).toLowerCase(),
                mode: 'insensitive'
              }
            }
          }
        }
      })
    }

    // Search posts by content (supports hashtags and keywords)
    const posts = await prisma.post.findMany({
      where: {
        AND: [
          { visibility: 'PUBLIC' },
          { OR: searchConditions }
        ]
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            avatarSource: true,
            discordAvatar: true,
            twitterAvatar: true,
            level: true,
            isAdmin: true,
            discordName: true,
            twitterHandle: true
          }
        },
        likes: {
          select: {
            userId: true
          }
        },
        comments: {
          select: {
            id: true
          }
        },
        shares: {
          select: {
            id: true
          }
        },
        hashtags: {
          include: {
            hashtag: true
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
      orderBy: [
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    const formattedPosts = posts.map(post => ({
      id: post.id,
      authorId: post.authorId,
      content: post.content,
      contentType: post.contentType,
      mediaUrls: JSON.parse(post.mediaUrls || '[]'),
      visibility: post.visibility,
      isPromoted: post.isPromoted,
      isPinned: false,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      sharesCount: post._count.shares,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author,
      hashtags: post.hashtags.map(ph => ph.hashtag.tag),
      likes: post.likes,
      comments: post.comments,
      shares: post.shares,
      _count: {
        likes: post._count.likes,
        comments: post._count.comments,
        shares: post._count.shares
      }
    }))

    return NextResponse.json({
      success: true,
      posts: formattedPosts,
      query: searchTerm,
      pagination: {
        limit,
        offset,
        hasMore: posts.length === limit
      }
    })

  } catch (error: any) {
    console.error('[Posts Search] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to search posts', details: error.message },
      { status: 500 }
    )
  }
}
