import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

export const POST = withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: { id: string } }
) => {
  try {
    const { id: postId } = params
    const body = await request.json()
    const { action } = body

    

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

    if (action === 'share') {
      // Check if user already shared this post
      const existingShare = await prisma.share.findUnique({
        where: {
          userId_postId: {
            userId: user.id,
            postId: postId
          }
        }
      })

      if (existingShare) {
        return NextResponse.json(
          { error: 'Post already shared' },
          { status: 400 }
        )
      }

      // Create share record
      const share = await prisma.share.create({
        data: {
          userId: user.id,
          postId: postId
        }
      })

      // Award XP to the post author (not the sharer)
      if (post.authorId !== user.id) {
        await prisma.user.update({
          where: { id: post.authorId },
          data: {
            xp: {
              increment: 3 // 3 XP for getting a share
            }
          }
        })
      }


      return NextResponse.json({
        success: true,
        content: 'Post shared successfully',
        share
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('[Post Interactions] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process interaction', details: error.message },
      { status: 500 }
    )
  }
})