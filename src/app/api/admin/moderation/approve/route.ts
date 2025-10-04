import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// POST: Approve a flagged post
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const { id } = await request.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Valid post ID is required' },
        { status: 400 }
      )
    }

    // Idempotency: Check current status first
    const currentPost = await prisma.post.findUnique({
      where: { id },
      select: { moderationStatus: true }
    })

    if (!currentPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Already approved - idempotent response
    if (currentPost.moderationStatus === 'approved') {
      return NextResponse.json({
        success: true,
        post: { id, moderationStatus: 'approved' },
        message: 'Already approved'
      })
    }

    const previousStatus = currentPost.moderationStatus

    // Update post to approved
    const post = await prisma.post.update({
      where: { id },
      data: {
        moderationStatus: 'approved',
        // Keep isNSFW flag so it still shows with blur overlay
        // Don't change isNSFW - admin is just saying "this is OK to show"
      },
      select: { id: true, moderationStatus: true }
    })

    // Audit log
    await prisma.moderationAuditLog.create({
      data: {
        postId: id,
        action: 'approve',
        adminId: user.id,
        previousStatus,
        newStatus: 'approved'
      }
    })

    console.log('[Admin] Post approved:', {
      postId: id,
      adminId: user.id,
      previousStatus,
      newStatus: post.moderationStatus
    })

    return NextResponse.json({
      success: true,
      post
    })
  } catch (error: any) {
    console.error('[Admin] Approve post error:', error)
    return NextResponse.json(
      { error: 'Failed to approve post', details: error.message },
      { status: 500 }
    )
  }
})
