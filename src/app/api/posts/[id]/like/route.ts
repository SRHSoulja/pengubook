import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: postId } = params
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
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
            id: true,
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

    // Check if user exists and is not banned
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
        { error: 'Banned users cannot like posts' },
        { status: 403 }
      )
    }

    // Check if user already liked this post
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    })

    if (existingLike) {
      return NextResponse.json(
        { error: 'Post already liked' },
        { status: 409 }
      )
    }

    // Create the like
    const like = await prisma.like.create({
      data: {
        userId,
        postId
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      }
    })

    // Update post author's likes received count
    if (post.authorId !== userId) { // Don't count self-likes
      await prisma.profile.upsert({
        where: { userId: post.authorId },
        update: {
          likesReceived: {
            increment: 1
          }
        },
        create: {
          userId: post.authorId,
          likesReceived: 1
        }
      })

      // Create notification for post author (if not liking own post)
      await prisma.notification.create({
        data: {
          fromUserId: userId,
          toUserId: post.authorId,
          type: 'LIKE',
          title: 'New Like',
          content: `${user.displayName} liked your post`,
        }
      })
    }

    // Get updated like count
    const likeCount = await prisma.like.count({
      where: { postId }
    })


    return NextResponse.json({
      success: true,
      like: {
        id: like.id,
        userId: like.userId,
        postId: like.postId,
        createdAt: like.createdAt,
        user: like.user
      },
      likeCount
    }, { status: 201 })

  } catch (error: any) {
    console.error('[Posts] Like error:', error)
    return NextResponse.json(
      { error: 'Failed to like post', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: postId } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Check if like exists
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    })

    if (!existingLike) {
      return NextResponse.json(
        { error: 'Like not found' },
        { status: 404 }
      )
    }

    // Delete the like
    await prisma.like.delete({
      where: {
        userId_postId: {
          userId,
          postId
        }
      }
    })

    // Update post author's likes received count
    if (post.authorId !== userId) { // Don't count self-likes
      await prisma.profile.updateMany({
        where: { userId: post.authorId },
        data: {
          likesReceived: {
            decrement: 1
          }
        }
      })

      // Remove notification for post author
      await prisma.notification.deleteMany({
        where: {
          fromUserId: userId,
          toUserId: post.authorId,
          type: 'LIKE'
        }
      })
    }

    // Get updated like count
    const likeCount = await prisma.like.count({
      where: { postId }
    })


    return NextResponse.json({
      success: true,
      content: 'Like removed successfully',
      likeCount
    })

  } catch (error: any) {
    console.error('[Posts] Unlike error:', error)
    return NextResponse.json(
      { error: 'Failed to unlike post', details: error.message },
      { status: 500 }
    )
  }
}