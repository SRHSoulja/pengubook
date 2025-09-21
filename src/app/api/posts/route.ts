import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const authorId = searchParams.get('authorId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    const visibility = searchParams.get('visibility') || 'PUBLIC'

    const prisma = new PrismaClient()

    const where: any = {
      visibility: visibility
    }

    if (authorId) {
      where.authorId = authorId
    }

    const posts = await prisma.post.findMany({
      where,
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
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

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
      author: post.author,
      stats: {
        likes: post._count.likes,
        comments: post._count.comments,
        shares: post._count.shares
      }
    }))

    return NextResponse.json({
      success: true,
      posts: formattedPosts,
      pagination: {
        limit,
        offset,
        hasMore: posts.length === limit
      }
    })

  } catch (error: any) {
    console.error('[Posts] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts', details: error.message },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(20, 15 * 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { content, contentType = 'TEXT', mediaUrls = [], visibility = 'PUBLIC' } = body

    // Use authenticated user's ID instead of requiring it in body
    const authorId = user.id

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'Content cannot exceed 2000 characters' },
        { status: 400 }
      )
    }

    const prisma = new PrismaClient()

    // User is already authenticated and verified by middleware

    // Create the post
    const newPost = await prisma.post.create({
      data: {
        authorId,
        content,
        contentType,
        mediaUrls: JSON.stringify(mediaUrls),
        visibility
      },
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
            twitterHandle: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true
          }
        }
      }
    })

    // Update user's post count
    await prisma.profile.upsert({
      where: { userId: authorId },
      update: {
        postsCount: {
          increment: 1
        }
      },
      create: {
        userId: authorId,
        postsCount: 1
      }
    })

    await prisma.$disconnect()

    const formattedPost = {
      id: newPost.id,
      content: newPost.content,
      contentType: newPost.contentType,
      mediaUrls: JSON.parse(newPost.mediaUrls || '[]'),
      visibility: newPost.visibility,
      isPromoted: newPost.isPromoted,
      createdAt: newPost.createdAt,
      updatedAt: newPost.updatedAt,
      author: newPost.author,
      stats: {
        likes: newPost._count.likes,
        comments: newPost._count.comments,
        shares: newPost._count.shares
      }
    }

    return NextResponse.json({
      success: true,
      post: formattedPost
    }, { status: 201 })

  } catch (error: any) {
    console.error('[Posts] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create post', details: error.message },
      { status: 500 }
    )
  }
}))