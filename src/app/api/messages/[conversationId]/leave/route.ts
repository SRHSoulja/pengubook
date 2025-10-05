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
      where: { id: conversationId }
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

    // Parse participants from JSON string
    const participants = JSON.parse(conversation.participants) as string[]

    // Check if user is a participant
    if (!participants.includes(user.id)) {
      return NextResponse.json(
        { error: 'You are not a member of this group' },
        { status: 403 }
      )
    }

    // Remove the user from participants
    const updatedParticipants = participants.filter(id => id !== user.id)

    // If this was the last participant, delete the conversation
    if (updatedParticipants.length === 0) {
      await prisma.conversation.delete({
        where: { id: conversationId }
      })

      return NextResponse.json({
        success: true,
        message: 'Left group and conversation deleted (no members remaining)',
        conversationDeleted: true
      })
    }

    // Update the conversation with the new participants list
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        participants: JSON.stringify(updatedParticipants)
      }
    })

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
