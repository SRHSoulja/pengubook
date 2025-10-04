import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// Leave a group conversation
export const POST = withAuth(async (request: NextRequest, user: any, { params }: { params: { conversationId: string } }) => {
  try {
    const conversationId = params.conversationId

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    // Fetch the conversation to verify it's a group
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: true
          }
        }
      }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    // Only group conversations can be left
    if (!conversation.isGroup) {
      return NextResponse.json(
        { error: 'Cannot leave a direct message conversation' },
        { status: 400 }
      )
    }

    // Check if user is a participant
    const participant = conversation.participants.find(p => p.userId === user.id)
    if (!participant) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 403 }
      )
    }

    // Remove the participant
    await prisma.conversationParticipant.delete({
      where: {
        id: participant.id
      }
    })

    // If this was the last participant, delete the conversation
    const remainingParticipants = await prisma.conversationParticipant.count({
      where: { conversationId }
    })

    if (remainingParticipants === 0) {
      await prisma.conversation.delete({
        where: { id: conversationId }
      })

      return NextResponse.json({
        success: true,
        message: 'Left group and conversation deleted (no members remaining)',
        conversationDeleted: true
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully left the group',
      conversationDeleted: false
    })
  } catch (error) {
    console.error('Error leaving group:', error)
    return NextResponse.json(
      { error: 'Failed to leave group' },
      { status: 500 }
    )
  }
})
