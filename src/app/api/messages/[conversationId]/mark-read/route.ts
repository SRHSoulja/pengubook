import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// Mark messages as read
export const POST = withRateLimit(120, 60 * 1000)(withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: { conversationId: string } }
) => {
  try {
    const { conversationId } = params

    // Verify user is participant in conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { participants: true }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const participantIds = JSON.parse(conversation.participants || '[]')
    if (!participantIds.includes(user.id)) {
      return NextResponse.json(
        { error: 'You are not a participant in this conversation' },
        { status: 403 }
      )
    }

    // Get all messages in this conversation that aren't sent by the current user
    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: { not: user.id }
      },
      select: { id: true }
    })

    if (messages.length === 0) {
      return NextResponse.json({
        success: true,
        markedCount: 0
      })
    }

    const messageIds = messages.map(m => m.id)

    // Create read receipts for messages that don't already have one from this user
    // Use createMany with skipDuplicates to avoid errors on re-marking
    await prisma.messageReadReceipt.createMany({
      data: messageIds.map(messageId => ({
        messageId,
        userId: user.id,
        readAt: new Date()
      })),
      skipDuplicates: true
    })

    return NextResponse.json({
      success: true,
      markedCount: messageIds.length
    })

  } catch (error: any) {
    console.error('Error marking messages as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark messages as read', details: error.message },
      { status: 500 }
    )
  }
}))
