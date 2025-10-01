import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Get user's bookmarks
export const GET = withRateLimit(100, 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = (page - 1) * limit

    logAPI.request('bookmarks/get', { userId: user.id.slice(0, 8) + '...', page, limit })

    const prisma = new PrismaClient()

    const bookmarks = await prisma.bookmark.findMany({
      where: {
        userId: user.id
      },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
                isAdmin: true
              }
            },
            likes: {
              where: { userId: user.id },
              select: { id: true }
            },
            bookmarks: {
              where: { userId: user.id },
              select: { id: true }
            },
            reactions: true,
            _count: {
              select: {
                likes: true,
                comments: true,
                shares: true,
                reactions: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit
    })

    const totalBookmarks = await prisma.bookmark.count({
      where: { userId: user.id }
    })

    await prisma.$disconnect()

    const formattedBookmarks = bookmarks.map(bookmark => ({
      id: bookmark.id,
      createdAt: bookmark.createdAt,
      post: {
        id: bookmark.post.id,
        content: bookmark.post.content,
        contentType: bookmark.post.contentType,
        mediaUrls: JSON.parse(bookmark.post.mediaUrls),
        visibility: bookmark.post.visibility,
        createdAt: bookmark.post.createdAt,
        updatedAt: bookmark.post.updatedAt,
        author: bookmark.post.author,
        isLiked: bookmark.post.likes.length > 0,
        isBookmarked: bookmark.post.bookmarks.length > 0,
        stats: {
          likes: bookmark.post._count.likes,
          comments: bookmark.post._count.comments,
          shares: bookmark.post._count.shares,
          reactions: bookmark.post._count.reactions
        },
        reactions: bookmark.post.reactions
      }
    }))

    logger.info(`Retrieved ${formattedBookmarks.length} bookmarks`, {
      userId: user.id,
      page,
      totalBookmarks
    }, 'Bookmarks')

    return NextResponse.json({
      success: true,
      bookmarks: formattedBookmarks,
      pagination: {
        page,
        limit,
        total: totalBookmarks,
        totalPages: Math.ceil(totalBookmarks / limit),
        hasNext: offset + limit < totalBookmarks,
        hasPrev: page > 1
      }
    })

  } catch (error: any) {
    logAPI.error('bookmarks/get', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookmarks', details: error.message },
      { status: 500 }
    )
  }
}))

// Toggle bookmark on a post
export const POST = withRateLimit(50, 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { postId } = body

    if (!postId) {
      return NextResponse.json(
        { error: 'Post ID is required' },
        { status: 400 }
      )
    }

    logAPI.request('bookmarks/toggle', { userId: user.id.slice(0, 8) + '...', postId: postId.slice(0, 8) + '...' })

    const prisma = new PrismaClient()

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true }
    })

    if (!post) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Check if already bookmarked
    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId: user.id,
          postId: postId
        }
      }
    })

    let action: 'added' | 'removed'

    if (existingBookmark) {
      // Remove bookmark
      await prisma.bookmark.delete({
        where: { id: existingBookmark.id }
      })
      action = 'removed'
    } else {
      // Add bookmark
      await prisma.bookmark.create({
        data: {
          userId: user.id,
          postId: postId
        }
      })
      action = 'added'
    }

    await prisma.$disconnect()

    logger.info(`Bookmark ${action}`, {
      userId: user.id,
      postId,
      action
    }, 'Bookmarks')

    return NextResponse.json({
      success: true,
      action,
      isBookmarked: action === 'added'
    })

  } catch (error: any) {
    logAPI.error('bookmarks/toggle', error)
    return NextResponse.json(
      { error: 'Failed to toggle bookmark', details: error.message },
      { status: 500 }
    )
  }
}))