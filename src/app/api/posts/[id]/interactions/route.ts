import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateUserSecure, AuthenticationError, AuthorizationError } from '@/lib/auth/secure'

const prisma = new PrismaClient()

// POST /api/posts/[id]/interactions - Handle post interactions (like, unlike, share)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { action } = await request.json()
    const postId = params.id

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

    let result: any = {}

    switch (action) {
      case 'like':
        // Check if already liked
        const existingLike = await prisma.like.findUnique({
          where: {
            userId_postId: {
              userId: user.id,
              postId: postId
            }
          }
        })

        if (existingLike) {
          return NextResponse.json({ error: 'Post already liked' }, { status: 400 })
        }

        // Create like
        const like = await prisma.like.create({
          data: {
            userId: user.id,
            postId: postId
          },
          include: {
            user: true
          }
        })

        // Create activity
        await prisma.activity.create({
          data: {
            userId: user.id,
            activityType: 'POST_LIKED',
            targetId: postId,
            targetType: 'post',
            content: JSON.stringify({
              postId: postId,
              authorId: post.authorId
            })
          }
        })

        // Create notification for post author (if not liking own post)
        if (post.authorId !== user.id) {
          await prisma.notification.create({
            data: {
              fromUserId: user.id,
              toUserId: post.authorId,
              type: 'LIKE',
              title: 'New Like',
              content: `${user.displayName} liked your post`
            }
          })
        }

        // Record engagement
        await prisma.engagement.create({
          data: {
            userId: user.id,
            postId: postId,
            actionType: 'LIKE'
          }
        })

        result = { like }
        break

      case 'unlike':
        // Find and delete like
        const likeToDelete = await prisma.like.findUnique({
          where: {
            userId_postId: {
              userId: user.id,
              postId: postId
            }
          }
        })

        if (!likeToDelete) {
          return NextResponse.json({ error: 'Like not found' }, { status: 404 })
        }

        await prisma.like.delete({
          where: {
            id: likeToDelete.id
          }
        })

        result = { message: 'Like removed' }
        break

      case 'share':
        // Check if already shared
        const existingShare = await prisma.share.findUnique({
          where: {
            userId_postId: {
              userId: user.id,
              postId: postId
            }
          }
        })

        if (existingShare) {
          return NextResponse.json({ error: 'Post already shared' }, { status: 400 })
        }

        // Create share
        const share = await prisma.share.create({
          data: {
            userId: user.id,
            postId: postId
          },
          include: {
            user: true
          }
        })

        // Create activity
        await prisma.activity.create({
          data: {
            userId: user.id,
            activityType: 'POST_SHARED',
            targetId: postId,
            targetType: 'post',
            content: JSON.stringify({
              postId: postId,
              authorId: post.authorId
            })
          }
        })

        // Create notification for post author (if not sharing own post)
        if (post.authorId !== user.id) {
          await prisma.notification.create({
            data: {
              fromUserId: user.id,
              toUserId: post.authorId,
              type: 'SHARE',
              title: 'Post Shared',
              content: `${user.displayName} shared your post`
            }
          })
        }

        // Record engagement
        await prisma.engagement.create({
          data: {
            userId: user.id,
            postId: postId,
            actionType: 'SHARE'
          }
        })

        result = { share }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get updated post counts
    const updatedCounts = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        counts: updatedCounts?._count
      }
    })

  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    console.error('Error handling post interaction:', error)
    return NextResponse.json({
      error: 'Failed to handle interaction'
    }, { status: 500 })
  }
}