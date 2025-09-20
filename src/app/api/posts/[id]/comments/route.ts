import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { CommentCreateRequest } from '@/types'
import { authenticateUserSecure, AuthenticationError, AuthorizationError } from '@/lib/auth/secure'

const prisma = new PrismaClient()

// GET /api/posts/[id]/comments - Get comments for a post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    })

    const hasMore = comments.length === limit

    return NextResponse.json({
      success: true,
      data: {
        comments,
        hasMore,
        nextOffset: hasMore ? offset + limit : null
      }
    })

  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({
      error: 'Failed to fetch comments'
    }, { status: 500 })
  }
}

// POST /api/posts/[id]/comments - Create a new comment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { content }: CommentCreateRequest = await request.json()
    const postId = params.id

    // Authenticate user securely
    const user = await authenticateUserSecure(request)

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: true
      }
    })

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Comment content required' }, { status: 400 })
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        userId: user.id,
        postId: postId,
        content: content.trim()
      },
      include: {
        user: {
          include: {
            profile: true
          }
        }
      }
    })

    // Create activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        activityType: 'POST_COMMENTED',
        targetId: postId,
        targetType: 'post',
        content: JSON.stringify({
          postId: postId,
          commentId: comment.id,
          commentPreview: content.substring(0, 100)
        })
      }
    })

    // Create notification for post author (if not commenting on own post)
    if (post.authorId !== user.id) {
      await prisma.notification.create({
        data: {
          fromUserId: user.id,
          toUserId: post.authorId,
          type: 'COMMENT',
          title: 'New Comment',
          content: `${user.displayName} commented on your post: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`
        }
      })
    }

    // Record engagement
    await prisma.engagement.create({
      data: {
        userId: user.id,
        postId: postId,
        actionType: 'COMMENT'
      }
    })

    return NextResponse.json({
      success: true,
      data: comment
    })

  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    console.error('Error creating comment:', error)
    return NextResponse.json({
      error: 'Failed to create comment'
    }, { status: 500 })
  }
}