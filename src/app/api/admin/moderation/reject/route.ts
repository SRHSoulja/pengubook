import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// POST: Reject a flagged post (hide from feed)
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const { id, reason } = await request.json()

    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { error: 'Valid post ID is required' },
        { status: 400 }
      )
    }

    // Idempotency: Check current status first
    const currentPost = await prisma.post.findUnique({
      where: { id },
      select: { moderationStatus: true, moderationData: true }
    })

    if (!currentPost) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Already rejected - idempotent response
    if (currentPost.moderationStatus === 'rejected') {
      return NextResponse.json({
        success: true,
        post: { id, moderationStatus: 'rejected' },
        message: 'Already rejected'
      })
    }

    const previousStatus = currentPost.moderationStatus

    // Parse existing moderation data
    const existingData = currentPost.moderationData ? JSON.parse(currentPost.moderationData) : {}

    // Update post to rejected - changes visibility to PRIVATE (hides from feed)
    const post = await prisma.post.update({
      where: { id },
      data: {
        moderationStatus: 'rejected',
        visibility: 'PRIVATE', // Hide from public feed
        // Store rejection reason in moderation data
        moderationData: JSON.stringify({
          ...existingData,
          rejectedBy: user.id,
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason || 'Violates content policy'
        })
      },
      select: {
        id: true,
        moderationStatus: true,
        visibility: true,
        moderationData: true
      }
    })

    // Audit log
    await prisma.moderationAuditLog.create({
      data: {
        postId: id,
        action: 'reject',
        adminId: user.id,
        previousStatus,
        newStatus: 'rejected',
        reason: reason || null
      }
    })

    console.log('[Admin] Post rejected:', {
      postId: id,
      adminId: user.id,
      previousStatus,
      reason: reason || 'manual rejection'
    })

    // Optional: Notify author (implement later)
    // await notifyAuthor(post.authorId, 'Your post was removed...')

    return NextResponse.json({
      success: true,
      post
    })
  } catch (error: any) {
    console.error('[Admin] Reject post error:', error)
    return NextResponse.json(
      { error: 'Failed to reject post', details: error.message },
      { status: 500 }
    )
  }
})
