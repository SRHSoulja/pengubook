import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'
import { sanitizeMediaUrls } from '@/lib/utils/url-validator'

export const dynamic = 'force-dynamic'

// Get messages from a conversation
export const GET = withRateLimit(120, 60 * 1000)(withAuth(async (request: NextRequest, user: any, { params }: { params: { conversationId: string } }) => {
  try {
    const { conversationId } = params
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const before = searchParams.get('before') // For pagination by message ID

    logAPI.request('messages', { conversationId, userId: user.id.slice(0, 8) + '...', limit })

    

    // Verify user is participant in conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        participants: true,
        isGroup: true,
        groupName: true
      }
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

    // Build query for messages
    let whereClause: any = {
      conversationId
    }

    if (before) {
      whereClause.id = {
        lt: before
      }
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            avatarSource: true,
            discordAvatar: true,
            twitterAvatar: true,
            level: true,
            isAdmin: true
          }
        },
        readReceipts: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                avatarSource: true,
                discordAvatar: true,
                twitterAvatar: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })


    const formattedMessages = messages.map(message => ({
      id: message.id,
      content: message.content,
      messageType: message.messageType,
      mediaUrls: JSON.parse(message.mediaUrls || '[]'),
      sender: message.sender,
      readReceipts: message.readReceipts.map(receipt => ({
        user: receipt.user,
        readAt: receipt.readAt
      })),
      isRead: message.readReceipts.some(receipt => receipt.userId === user.id),
      createdAt: message.createdAt
    }))

    return NextResponse.json({
      success: true,
      messages: formattedMessages.reverse(), // Return in chronological order
      conversation: {
        id: conversationId,
        isGroup: conversation.isGroup,
        groupName: conversation.groupName
      },
      pagination: {
        limit,
        offset,
        hasMore: messages.length === limit,
        before: messages.length > 0 ? messages[messages.length - 1].id : null
      }
    })

  } catch (error: any) {
    logAPI.error('messages/get', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error.message },
      { status: 500 }
    )
  }
}))

// Send a message
export const POST = withRateLimit(60, 60 * 1000)(withAuth(async (request: NextRequest, user: any, { params }: { params: { conversationId: string } }) => {
  try {
    const { conversationId } = params
    const body = await request.json()
    const { content, messageType = 'TEXT', mediaUrls = [] } = body

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

    if (mediaUrls.length > 10) {
      return NextResponse.json(
        { error: 'Cannot attach more than 10 media files' },
        { status: 400 }
      )
    }

    // Validate and sanitize media URLs (security: prevent XSS, SSRF)
    const sanitizedMediaUrls = sanitizeMediaUrls(mediaUrls)

    // Warn if URLs were filtered out
    if (sanitizedMediaUrls.length !== mediaUrls.length) {
      console.warn('[Messages] Filtered invalid media URLs:', {
        original: mediaUrls.length,
        sanitized: sanitizedMediaUrls.length,
        userId: user.id,
        conversationId
      })
    }

    // Verify user is participant in conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        participants: true,
        isGroup: true,
        groupName: true
      }
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

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: user.id,
        content: content.trim(),
        messageType,
        mediaUrls: JSON.stringify(sanitizedMediaUrls)
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            level: true,
            isAdmin: true
          }
        }
      }
    })

    // Update conversation with last message info
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessage: content.length > 100 ? content.substring(0, 100) + '...' : content,
        lastMessageAt: new Date(),
        updatedAt: new Date()
      }
    })

    // Create notifications for other participants
    const otherParticipants = participantIds.filter((id: string) => id !== user.id)

    if (otherParticipants.length > 0) {
      const notifications = otherParticipants.map((participantId: string) => ({
        fromUserId: user.id,
        toUserId: participantId,
        type: 'MESSAGE',
        title: conversation.isGroup ? `New message in ${conversation.groupName}` : 'New message',
        content: `${user.displayName}: ${content.length > 50 ? content.substring(0, 50) + '...' : content}`
      }))

      await prisma.notification.createMany({
        data: notifications
      })
    }


    logger.info('Message sent', {
      messageId: message.id,
      conversationId,
      senderId: user.id.slice(0, 8) + '...',
      contentLength: content.length,
      hasMedia: mediaUrls.length > 0
    }, 'Messaging')

    // TODO: Emit WebSocket event for real-time delivery
    // This would notify all connected participants about the new message

    const formattedMessage = {
      id: message.id,
      content: message.content,
      messageType: message.messageType,
      mediaUrls: JSON.parse(message.mediaUrls || '[]'),
      sender: message.sender,
      readReceipts: [],
      isRead: false,
      createdAt: message.createdAt
    }

    return NextResponse.json({
      success: true,
      message: formattedMessage
    }, { status: 201 })

  } catch (error: any) {
    logAPI.error('messages/send', error)
    return NextResponse.json(
      { error: 'Failed to send message', details: error.message },
      { status: 500 }
    )
  }
}))