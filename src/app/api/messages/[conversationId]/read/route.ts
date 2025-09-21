import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Mark messages as read
export const POST = withRateLimit(60, 60 * 1000)(withAuth(async (request: NextRequest, user: any, { params }: { params: { conversationId: string } }) => {
  try {
    const { conversationId } = params
    const body = await request.json()
    const { messageIds } = body

    if (!messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json(
        { error: 'Message IDs array is required' },
        { status: 400 }
      )
    }

    if (messageIds.length > 100) {
      return NextResponse.json(
        { error: 'Cannot mark more than 100 messages as read at once' },
        { status: 400 }
      )
    }

    logAPI.request('messages/read', {
      conversationId,
      userId: user.id.slice(0, 8) + '...',
      messageCount: messageIds.length
    })

    const prisma = new PrismaClient()

    // Verify user is participant in conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        participants: true
      }
    })

    if (!conversation) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const participantIds = JSON.parse(conversation.participants || '[]')
    if (!participantIds.includes(user.id)) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'You are not a participant in this conversation' },
        { status: 403 }
      )
    }

    // Verify all messages exist in this conversation
    const messages = await prisma.message.findMany({
      where: {
        id: {
          in: messageIds
        },
        conversationId
      },
      select: {
        id: true,
        senderId: true
      }
    })

    if (messages.length !== messageIds.length) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'One or more messages not found in this conversation' },
        { status: 400 }
      )
    }

    // Don't create read receipts for messages sent by the user
    const messagesFromOthers = messages.filter(msg => msg.senderId !== user.id)

    if (messagesFromOthers.length === 0) {
      await prisma.$disconnect()
      return NextResponse.json({
        success: true,
        message: 'No messages to mark as read (all messages are from you)',
        readReceiptsCreated: 0
      })
    }

    // Create read receipts (use createMany with skipDuplicates)
    const readReceiptsData = messagesFromOthers.map(msg => ({
      messageId: msg.id,
      userId: user.id
    }))

    const result = await prisma.messageReadReceipt.createMany({
      data: readReceiptsData,
      skipDuplicates: true
    })

    await prisma.$disconnect()

    logger.info('Messages marked as read', {
      conversationId,
      userId: user.id.slice(0, 8) + '...',
      messageCount: messagesFromOthers.length,
      readReceiptsCreated: result.count
    }, 'Messaging')

    // TODO: Emit WebSocket event to notify other participants about read receipts

    return NextResponse.json({
      success: true,
      message: `Marked ${messagesFromOthers.length} messages as read`,
      readReceiptsCreated: result.count
    })

  } catch (error: any) {
    logAPI.error('messages/read', error)
    return NextResponse.json(
      { error: 'Failed to mark messages as read', details: error.message },
      { status: 500 }
    )
  }
}))

// Mark all messages in conversation as read
export const PUT = withRateLimit(30, 60 * 1000)(withAuth(async (request: NextRequest, user: any, { params }: { params: { conversationId: string } }) => {
  try {
    const { conversationId } = params

    logAPI.request('messages/read-all', {
      conversationId,
      userId: user.id.slice(0, 8) + '...'
    })

    const prisma = new PrismaClient()

    // Verify user is participant in conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        participants: true
      }
    })

    if (!conversation) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const participantIds = JSON.parse(conversation.participants || '[]')
    if (!participantIds.includes(user.id)) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'You are not a participant in this conversation' },
        { status: 403 }
      )
    }

    // Get all unread messages from others in this conversation
    const unreadMessages = await prisma.message.findMany({
      where: {
        conversationId,
        senderId: {
          not: user.id
        },
        readReceipts: {
          none: {
            userId: user.id
          }
        }
      },
      select: {
        id: true
      }
    })

    if (unreadMessages.length === 0) {
      await prisma.$disconnect()
      return NextResponse.json({
        success: true,
        message: 'No unread messages to mark as read',
        readReceiptsCreated: 0
      })
    }

    // Create read receipts for all unread messages
    const readReceiptsData = unreadMessages.map(msg => ({
      messageId: msg.id,
      userId: user.id
    }))

    const result = await prisma.messageReadReceipt.createMany({
      data: readReceiptsData,
      skipDuplicates: true
    })

    await prisma.$disconnect()

    logger.info('All messages marked as read', {
      conversationId,
      userId: user.id.slice(0, 8) + '...',
      messageCount: unreadMessages.length,
      readReceiptsCreated: result.count
    }, 'Messaging')

    return NextResponse.json({
      success: true,
      message: `Marked ${unreadMessages.length} messages as read`,
      readReceiptsCreated: result.count
    })

  } catch (error: any) {
    logAPI.error('messages/read-all', error)
    return NextResponse.json(
      { error: 'Failed to mark all messages as read', details: error.message },
      { status: 500 }
    )
  }
}))