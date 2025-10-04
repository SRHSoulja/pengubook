import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { encryptMessage } from '@/lib/server-encryption'

export const dynamic = 'force-dynamic'

// Edit a message (within 15 minutes of sending)
export const PATCH = withRateLimit(30, 60 * 1000)(withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: { messageId: string } }
) => {
  try {
    const { messageId } = params
    const body = await request.json()
    const { content } = body

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      )
    }

    if (content.length > 5000) {
      return NextResponse.json(
        { error: 'Message cannot exceed 5000 characters' },
        { status: 400 }
      )
    }

    // Get the message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          select: { participants: true }
        }
      }
    })

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Check if user is the sender
    if (message.senderId !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own messages' },
        { status: 403 }
      )
    }

    // Check if message is already deleted
    if (message.isDeleted) {
      return NextResponse.json(
        { error: 'Cannot edit a deleted message' },
        { status: 400 }
      )
    }

    // Check if message is within 15 minutes (900000 ms)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
    if (message.createdAt < fifteenMinutesAgo) {
      return NextResponse.json(
        { error: 'Messages can only be edited within 15 minutes of sending' },
        { status: 400 }
      )
    }

    // Update the message
    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        content: encryptMessage(content.trim()),
        isEdited: true,
        editedAt: new Date()
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Message edited successfully',
      updatedMessage: {
        id: updatedMessage.id,
        isEdited: updatedMessage.isEdited,
        editedAt: updatedMessage.editedAt
      }
    })

  } catch (error: any) {
    console.error('Error editing message:', error)
    return NextResponse.json(
      { error: 'Failed to edit message', details: error.message },
      { status: 500 }
    )
  }
}))

// Delete a message (soft delete)
export const DELETE = withRateLimit(30, 60 * 1000)(withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: { messageId: string } }
) => {
  try {
    const { messageId } = params

    // Get the message
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          select: { participants: true }
        }
      }
    })

    if (!message) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      )
    }

    // Check if user is the sender or admin
    const isAdmin = user.isAdmin
    const isSender = message.senderId === user.id

    if (!isSender && !isAdmin) {
      return NextResponse.json(
        { error: 'You can only delete your own messages' },
        { status: 403 }
      )
    }

    // Check if already deleted
    if (message.isDeleted) {
      return NextResponse.json(
        { error: 'Message is already deleted' },
        { status: 400 }
      )
    }

    // Soft delete the message
    await prisma.message.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: user.id,
        content: encryptMessage('[Message deleted]') // Replace content with placeholder
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Message deleted successfully'
    })

  } catch (error: any) {
    console.error('Error deleting message:', error)
    return NextResponse.json(
      { error: 'Failed to delete message', details: error.message },
      { status: 500 }
    )
  }
}))
