import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// Toggle reaction on a message
export const POST = withRateLimit(50, 60 * 1000)(withAuth(async (request: NextRequest, user: any, context: any) => {
  try {
    const { messageId } = context.params
    const body = await request.json()
    const { emoji } = body

    if (!emoji || typeof emoji !== 'string') {
      return NextResponse.json(
        { error: 'Emoji is required' },
        { status: 400 }
      )
    }

    // Check if message exists
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

    // Check if user already reacted to this message
    const existingReaction = await prisma.messageReaction.findUnique({
      where: {
        messageId_userId: {
          messageId,
          userId: user.id
        }
      }
    })

    let action: 'added' | 'removed' | 'updated'

    if (existingReaction) {
      if (existingReaction.emoji === emoji) {
        // Remove reaction if same emoji
        await prisma.messageReaction.delete({
          where: { id: existingReaction.id }
        })
        action = 'removed'
      } else {
        // Update to new emoji
        await prisma.messageReaction.update({
          where: { id: existingReaction.id },
          data: { emoji }
        })
        action = 'updated'
      }
    } else {
      // Add new reaction
      await prisma.messageReaction.create({
        data: {
          messageId,
          userId: user.id,
          emoji
        }
      })
      action = 'added'
    }

    // Get all reactions for this message
    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({
      success: true,
      action,
      reactions
    })

  } catch (error: any) {
    console.error('Failed to toggle reaction:', error)
    return NextResponse.json(
      { error: 'Failed to toggle reaction', details: error.message },
      { status: 500 }
    )
  }
}))

// Get reactions for a message
export const GET = withAuth(async (request: NextRequest, user: any, context: any) => {
  try {
    const { messageId } = context.params

    const reactions = await prisma.messageReaction.findMany({
      where: { messageId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json({
      success: true,
      reactions
    })

  } catch (error: any) {
    console.error('Failed to fetch reactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reactions', details: error.message },
      { status: 500 }
    )
  }
})
