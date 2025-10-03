import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth-middleware'
import { sanitizeMediaUrls } from '@/lib/utils/url-validator'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    

    const post = await prisma.post.findUnique({
      where: { id },
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
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
                isAdmin: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
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
      }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }


    const formattedPost = {
      id: post.id,
      content: post.content,
      contentType: post.contentType,
      mediaUrls: JSON.parse(post.mediaUrls || '[]'),
      visibility: post.visibility,
      isPromoted: post.isPromoted,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author,
      likes: post.likes.map(like => ({
        userId: like.userId,
        user: like.user,
        createdAt: like.createdAt
      })),
      comments: post.comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        user: comment.user
      })),
      shares: post.shares,
      stats: {
        likes: post._count.likes,
        comments: post._count.comments,
        shares: post._count.shares
      }
    }

    return NextResponse.json({
      success: true,
      post: formattedPost
    })

  } catch (error: any) {
    console.error('[Posts] GET by ID error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch post', details: error.message },
      { status: 500 }
    )
  }
}

export const PUT = withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: { id: string } }
) => {
  try {
    const { id } = params
    const body = await request.json()
    const { content, contentType, mediaUrls, visibility } = body

    

    // Check if post exists and user owns it
    const existingPost = await prisma.post.findUnique({
      where: { id },
      select: {
        authorId: true,
        content: true,
        createdAt: true
      }
    })

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    if (existingPost.authorId !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own posts' },
        { status: 403 }
      )
    }

    // Check if post is too old to edit (24 hours)
    const hoursOld = (Date.now() - existingPost.createdAt.getTime()) / (1000 * 60 * 60)
    if (hoursOld > 24) {
      return NextResponse.json(
        { error: 'Posts can only be edited within 24 hours of creation' },
        { status: 403 }
      )
    }

    const updateData: any = {
      updatedAt: new Date()
    }

    if (content !== undefined) {
      if (content.length > 2000) {
        return NextResponse.json(
          { error: 'Content cannot exceed 2000 characters' },
          { status: 400 }
        )
      }
      updateData.content = content
    }

    if (contentType !== undefined) updateData.contentType = contentType
    if (mediaUrls !== undefined) {
      // Validate and sanitize media URLs (security: prevent XSS, SSRF)
      const sanitizedMediaUrls = sanitizeMediaUrls(mediaUrls)

      // Warn if URLs were filtered out
      if (sanitizedMediaUrls.length !== mediaUrls.length) {
        console.warn('[Posts] Filtered invalid media URLs on update:', {
          original: mediaUrls.length,
          sanitized: sanitizedMediaUrls.length,
          userId: user.id,
          postId: id
        })
      }

      updateData.mediaUrls = JSON.stringify(sanitizedMediaUrls)
    }
    if (visibility !== undefined) updateData.visibility = visibility

    // Create edit history record if content is being changed
    if (content !== undefined && content !== existingPost.content) {
      await prisma.postEdit.create({
        data: {
          postId: id,
          previousContent: existingPost.content,
          newContent: content,
          editedBy: user.id
        }
      })
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: updateData,
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


    const formattedPost = {
      id: updatedPost.id,
      content: updatedPost.content,
      contentType: updatedPost.contentType,
      mediaUrls: JSON.parse(updatedPost.mediaUrls || '[]'),
      visibility: updatedPost.visibility,
      isPromoted: updatedPost.isPromoted,
      createdAt: updatedPost.createdAt,
      updatedAt: updatedPost.updatedAt,
      author: updatedPost.author,
      stats: {
        likes: updatedPost._count.likes,
        comments: updatedPost._count.comments,
        shares: updatedPost._count.shares
      }
    }

    return NextResponse.json({
      success: true,
      post: formattedPost
    })

  } catch (error: any) {
    console.error('[Posts] PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update post', details: error.message },
      { status: 500 }
    )
  }
})

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    

    // Check if post exists and user owns it (or is admin)
    const existingPost = await prisma.post.findUnique({
      where: { id },
      select: {
        authorId: true
      }
    })

    if (!existingPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Check if user owns the post or is admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isAdmin: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (existingPost.authorId !== userId && !user.isAdmin) {
      return NextResponse.json(
        { error: 'You can only delete your own posts' },
        { status: 403 }
      )
    }

    // Delete the post (cascade will handle related records)
    await prisma.post.delete({
      where: { id }
    })

    // Update user's post count
    await prisma.profile.updateMany({
      where: { userId: existingPost.authorId },
      data: {
        postsCount: {
          decrement: 1
        }
      }
    })


    return NextResponse.json({
      success: true,
      content: 'Post deleted successfully'
    })

  } catch (error: any) {
    console.error('[Posts] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete post', details: error.message },
      { status: 500 }
    )
  }
}