import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// Delete a conversation
export const DELETE = withRateLimit(20, 60 * 1000)(withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: { conversationId: string } }
) => {
  try {
    const { conversationId } = params

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    // Verify conversation exists and user is a participant
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Check if user is a participant
    const participants = JSON.parse(conversation.participants || '[]')
    if (!participants.includes(user.id)) {
      return NextResponse.json(
        { error: 'You are not a participant in this conversation' },
        { status: 403 }
      )
    }

    // Delete all messages in the conversation
    await prisma.message.deleteMany({
      where: { conversationId }
    })

    // Delete the conversation
    await prisma.conversation.delete({
      where: { id: conversationId }
    })

    return NextResponse.json({
      success: true,
      message: 'Conversation deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting conversation:', error)
    return NextResponse.json(
      { error: 'Failed to delete conversation', details: error.message },
      { status: 500 }
    )
  }
}))
