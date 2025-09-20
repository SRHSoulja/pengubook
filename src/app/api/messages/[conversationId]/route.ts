import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateUserSecure, AuthenticationError, AuthorizationError } from '@/lib/auth/secure'

const prisma = new PrismaClient()

// Get messages for a conversation
export async function GET(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    const user = await authenticateUserSecure(request)

    // Check if user is participant in conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.conversationId }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const participantIds = JSON.parse(conversation.participants)
    if (!participantIds.includes(user.id)) {
      return NextResponse.json(
        { error: 'Not authorized to view this conversation' },
        { status: 403 }
      )
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: {
        conversationId: params.conversationId
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
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: offset,
      take: limit
    })

    // Mark messages as read for the current user
    await prisma.message.updateMany({
      where: {
        conversationId: params.conversationId,
        senderId: { not: user.id },
        isRead: false
      },
      data: {
        isRead: true
      }
    })

    return NextResponse.json({
      success: true,
      data: messages.reverse() // Reverse to get chronological order
    })
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// Send a message
export async function POST(
  request: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const { content, messageType = 'TEXT', mediaUrls = [] } = await request.json()

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    const user = await authenticateUserSecure(request)

    // Check if user is participant in conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.conversationId }
    })

    if (!conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const participantIds = JSON.parse(conversation.participants)
    if (!participantIds.includes(user.id)) {
      return NextResponse.json(
        { error: 'Not authorized to send messages in this conversation' },
        { status: 403 }
      )
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        conversationId: params.conversationId,
        senderId: user.id,
        content,
        messageType,
        mediaUrls: JSON.stringify(mediaUrls)
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

    // Update conversation last message
    await prisma.conversation.update({
      where: { id: params.conversationId },
      data: {
        lastMessage: content,
        lastMessageAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      data: message
    })
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}