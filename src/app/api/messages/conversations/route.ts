import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateUserSecure, AuthenticationError, AuthorizationError } from '@/lib/auth/secure'

const prisma = new PrismaClient()

// Get user's conversations
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateUserSecure(request)

    // Get conversations where user is a participant
    const conversations = await prisma.conversation.findMany({
      where: {
        OR: [
          { participants: { contains: `"${user.id}"` } }
        ]
      },
      orderBy: {
        lastMessageAt: 'desc'
      },
      take: 50
    })

    // Enrich conversations with participant info and last message
    const enrichedConversations = await Promise.all(
      conversations.map(async (conversation) => {
        const participantIds = JSON.parse(conversation.participants)
        const otherParticipantIds = participantIds.filter((id: string) => id !== user.id)

        // Get other participants
        const otherParticipants = await prisma.user.findMany({
          where: {
            id: { in: otherParticipantIds }
          },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        })

        // Get all participants for group conversations
        const allParticipants = conversation.isGroup ? await prisma.user.findMany({
          where: {
            id: { in: participantIds }
          },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }) : []

        // Get last message
        const lastMessage = conversation.lastMessage ? await prisma.message.findFirst({
          where: {
            conversationId: conversation.id
          },
          orderBy: {
            createdAt: 'desc'
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                displayName: true
              }
            }
          }
        }) : null

        // Count unread messages
        const unreadCount = await prisma.message.count({
          where: {
            conversationId: conversation.id,
            senderId: { not: user.id },
            isRead: false
          }
        })

        // For group conversations, include admin info
        const adminIds = conversation.isGroup ? JSON.parse(conversation.adminIds || '[]') : []

        return {
          ...conversation,
          otherParticipants: conversation.isGroup ? [] : otherParticipants,
          allParticipants: conversation.isGroup ? allParticipants : [],
          adminIds,
          lastMessage,
          unreadCount,
          // For display purposes
          displayName: conversation.isGroup
            ? conversation.groupName
            : otherParticipants[0]?.displayName || 'Unknown User',
          displayAvatar: conversation.isGroup
            ? conversation.groupAvatar
            : otherParticipants[0]?.avatar,
          memberCount: conversation.isGroup ? participantIds.length : 2
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: enrichedConversations
    })
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

// Create or get conversation between users (1-on-1 DM only)
export async function POST(request: NextRequest) {
  try {
    const { targetUserId } = await request.json()

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user ID is required' },
        { status: 400 }
      )
    }

    const currentUser = await authenticateUserSecure(request)

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // Check if 1-on-1 conversation already exists
    const participantIds = [currentUser.id, targetUserId].sort()

    const existingConversation = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        OR: [
          { participants: { equals: JSON.stringify(participantIds) } },
          {
            AND: [
              { participants: { contains: `"${currentUser.id}"` } },
              { participants: { contains: `"${targetUserId}"` } }
            ]
          }
        ]
      }
    })

    if (existingConversation) {
      return NextResponse.json({
        success: true,
        data: existingConversation
      })
    }

    // Create new 1-on-1 conversation
    const conversation = await prisma.conversation.create({
      data: {
        isGroup: false,
        participants: JSON.stringify(participantIds)
      }
    })

    return NextResponse.json({
      success: true,
      data: conversation
    })
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    console.error('Error creating conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}