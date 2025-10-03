import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Submit a report
export const POST = withRateLimit(10, 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { targetId, postId, commentId, messageId, reason, description } = body

    // Validate input
    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      )
    }

    if (!targetId && !postId && !commentId && !messageId) {
      return NextResponse.json(
        { error: 'Either targetId (user), postId (post), commentId (comment), or messageId (message) is required' },
        { status: 400 }
      )
    }

    const validReasons = [
      'SPAM',
      'HARASSMENT',
      'INAPPROPRIATE_CONTENT',
      'COPYRIGHT',
      'IMPERSONATION',
      'VIOLENCE',
      'HATE_SPEECH',
      'SELF_HARM',
      'FALSE_INFORMATION',
      'OTHER'
    ]

    if (!validReasons.includes(reason)) {
      return NextResponse.json(
        { error: 'Invalid reason. Must be one of: ' + validReasons.join(', ') },
        { status: 400 }
      )
    }

    logAPI.request('reports/submit', {
      reporterId: user.id.slice(0, 8) + '...',
      targetId: targetId?.slice(0, 8) + '...' || 'none',
      postId: postId?.slice(0, 8) + '...' || 'none',
      commentId: commentId?.slice(0, 8) + '...' || 'none',
      messageId: messageId?.slice(0, 8) + '...' || 'none',
      reason
    })



    // Check if target user exists (for user reports)
    if (targetId) {
      const targetUser = await prisma.user.findUnique({
        where: { id: targetId },
        select: { id: true }
      })

      if (!targetUser) {
        return NextResponse.json(
          { error: 'Target user not found' },
          { status: 404 }
        )
      }

      // Prevent self-reporting
      if (targetId === user.id) {
        return NextResponse.json(
          { error: 'You cannot report yourself' },
          { status: 400 }
        )
      }
    }

    // Check if post exists (for content reports)
    if (postId) {
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
    }

    // Check if comment exists (for comment reports)
    if (commentId) {
      const comment = await prisma.comment.findUnique({
        where: { id: commentId },
        select: { id: true, userId: true }
      })

      if (!comment) {
        return NextResponse.json(
          { error: 'Comment not found' },
          { status: 404 }
        )
      }

      // Prevent self-reporting
      if (comment.userId === user.id) {
        return NextResponse.json(
          { error: 'You cannot report your own comment' },
          { status: 400 }
        )
      }
    }

    // Check if message exists (for message reports)
    if (messageId) {
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: { id: true, senderId: true }
      })

      if (!message) {
        return NextResponse.json(
          { error: 'Message not found' },
          { status: 404 }
        )
      }

      // Prevent self-reporting
      if (message.senderId === user.id) {
        return NextResponse.json(
          { error: 'You cannot report your own message' },
          { status: 400 }
        )
      }
    }

    // Check for duplicate reports (same user reporting same target/post/comment/message)
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId: user.id,
        ...(targetId && { targetId }),
        ...(postId && { postId }),
        ...(commentId && { commentId }),
        ...(messageId && { messageId }),
        status: { in: ['PENDING', 'INVESTIGATING'] }
      }
    })

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already submitted a report for this item that is being reviewed' },
        { status: 409 }
      )
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        reporterId: user.id,
        targetId,
        postId,
        commentId,
        messageId,
        reason,
        description: description?.trim() || null
      },
      include: {
        reporter: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        },
        target: targetId ? {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        } : undefined,
        post: postId ? {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                id: true,
                username: true,
                displayName: true
              }
            }
          }
        } : undefined,
        comment: commentId ? {
          select: {
            id: true,
            content: true,
            user: {
              select: {
                id: true,
                username: true,
                displayName: true
              }
            }
          }
        } : undefined,
        message: messageId ? {
          select: {
            id: true,
            content: true,
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true
              }
            }
          }
        } : undefined
      }
    })


    logger.info('Report submitted', {
      reportId: report.id,
      reporterId: user.id,
      targetId: targetId || 'none',
      postId: postId || 'none',
      commentId: commentId || 'none',
      messageId: messageId || 'none',
      reason
    }, 'Reports')

    return NextResponse.json({
      success: true,
      report: {
        id: report.id,
        reason: report.reason,
        description: report.description,
        status: report.status,
        createdAt: report.createdAt,
        reporter: report.reporter,
        target: report.target,
        post: report.post,
        comment: report.comment,
        message: report.message
      },
      content: 'Report submitted successfully. Our moderation team will review it.'
    })

  } catch (error: any) {
    logAPI.error('reports/submit', error)
    return NextResponse.json(
      { error: 'Failed to submit report', details: error.message },
      { status: 500 }
    )
  }
}))