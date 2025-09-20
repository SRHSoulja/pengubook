import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Get posts with basic filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const authorId = searchParams.get('authorId') // Add support for filtering by author
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '15')
    const offset = (page - 1) * limit

    // Build where clause conditionally
    const whereClause: any = {}
    if (authorId) {
      whereClause.authorId = authorId
    }

    const posts = await prisma.post.findMany({
      where: whereClause,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            level: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true
          }
        },
        likes: userId ? {
          where: { userId },
          select: { id: true }
        } : false
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    const total = await prisma.post.count({ where: whereClause })

    const formattedPosts = posts.map(post => ({
      ...post,
      mediaUrls: JSON.parse(post.mediaUrls || '[]'),
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      sharesCount: post._count.shares,
      isLiked: userId ? post.likes.length > 0 : false,
      _count: undefined,
      likes: undefined
    }))

    return NextResponse.json({
      success: true,
      data: {
        posts: formattedPosts,
        pagination: {
          total,
          page,
          limit,
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      }
    })
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts' },
      { status: 500 }
    )
  }
}

// POST - Create a new post
export async function POST(request: NextRequest) {
  try {
    const {
      authorId,
      content,
      contentType = 'TEXT',
      mediaUrls = [],
      visibility = 'PUBLIC'
    } = await request.json()

    if (!authorId || !content) {
      return NextResponse.json(
        { error: 'Author ID and content are required' },
        { status: 400 }
      )
    }

    // Validate visibility
    if (!['PUBLIC', 'FOLLOWERS_ONLY', 'PRIVATE'].includes(visibility)) {
      return NextResponse.json(
        { error: 'Invalid visibility setting' },
        { status: 400 }
      )
    }

    // Create post
    const post = await prisma.post.create({
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
            level: true
          }
        }
      }
    })

    // Update user's post count
    try {
      await prisma.profile.update({
        where: { userId: authorId },
        data: { postsCount: { increment: 1 } }
      })
    } catch (error) {
      console.log('Profile update failed, continuing:', error)
    }

    return NextResponse.json({
      success: true,
      data: {
        ...post,
        mediaUrls: JSON.parse(post.mediaUrls || '[]'),
        likesCount: 0,
        commentsCount: 0,
        sharesCount: 0,
        isLiked: false
      },
      message: 'Post created successfully!'
    })
  } catch (error) {
    console.error('Error creating post:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}