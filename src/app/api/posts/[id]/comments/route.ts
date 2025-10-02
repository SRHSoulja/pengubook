import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { awardXP } from '@/lib/leveling'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: postId } = params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    const comments = await prisma.comment.findMany({
      where: { postId },
      include: {
        user: {
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
            userId: true,
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            likes: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      take: limit,
      skip: offset
    })


    const formattedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: comment.user,
      likes: comment.likes.map(like => ({
        userId: like.userId,
        user: like.user
      })),
      stats: {
        likes: comment._count.likes
      }
    }))

    return NextResponse.json({
      success: true,
      comments: formattedComments,
      pagination: {
        limit,
        offset,
        hasMore: comments.length === limit
      }
    })

  } catch (error: any) {
    console.error('[Comments] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: postId } = params
    const body = await request.json()
    const { authorId, content } = body

    if (!authorId || !content) {
      return NextResponse.json(
        { error: 'Author ID and content are required' },
        { status: 400 }
      )
    }

    if (content.length > 500) {
      return NextResponse.json(
        { error: 'Comment cannot exceed 500 characters' },
        { status: 400 }
      )
    }

    

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        id: true,
        authorId: true,
        author: {
          select: {
            displayName: true
          }
        }
      }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Verify user exists and is not banned
    const user = await prisma.user.findUnique({
      where: { id: authorId },
      select: { id: true, isBanned: true, displayName: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: 'Banned users cannot create comments' },
        { status: 403 }
      )
    }

    // Create the comment
    const newComment = await prisma.comment.create({
      data: {
        userId: authorId,
        postId,
        content
      },
      include: {
        user: {
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
        }
      }
    })

    // Create notification for post author (if not commenting on own post)
    if (post.authorId !== authorId) {
      await prisma.notification.create({
        data: {
          fromUserId: authorId,
          toUserId: post.authorId,
          type: 'COMMENT',
          title: 'New Comment',
          content: `${user.displayName} commented on your post`,
        }
      })
    }

    // Award XP for creating a comment
    try {
      const xpResult = await awardXP(authorId, 'COMMENT_POSTED', prisma)
      console.log(`[Comments] User ${authorId} earned ${xpResult.xpGained} XP for posting a comment`)
      if (xpResult.leveledUp) {
        console.log(`[Comments] User ${authorId} leveled up from ${xpResult.oldLevel} to ${xpResult.newLevel}!`)
      }
    } catch (xpError) {
      console.error('[Comments] Failed to award XP:', xpError)
      // Don't fail the comment creation if XP fails
    }


    const formattedComment = {
      id: newComment.id,
      content: newComment.content,
      createdAt: newComment.createdAt,
      updatedAt: newComment.updatedAt,
      author: newComment.user
    }

    return NextResponse.json({
      success: true,
      comment: formattedComment
    }, { status: 201 })

  } catch (error: any) {
    console.error('[Comments] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create comment', details: error.message },
      { status: 500 }
    )
  }
}