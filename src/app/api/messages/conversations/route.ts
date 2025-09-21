import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Get user's conversations
export const GET = withRateLimit(60, 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    logAPI.request('conversations', { userId: user.id.slice(0, 8) + '...', limit })

    const prisma = new PrismaClient()

    // Find conversations where user is a participant
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          contains: user.id
        }
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
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
        }
      },
      orderBy: {
        lastMessageAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    await prisma.$disconnect()

    // Format conversations with participant info and unread counts
    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        // Parse participants
        const participantIds = JSON.parse(conv.participants || '[]')
        const otherParticipants = participantIds.filter((id: string) => id !== user.id)

        // Get participant details
        const tempPrisma = new PrismaClient()
        const participants = await tempPrisma.user.findMany({
          where: {
            id: {
              in: participantIds
            }
          },
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            level: true,
            isAdmin: true
          }
        })

        // Calculate unread count for this user
        const unreadCount = await tempPrisma.message.count({
          where: {
            conversationId: conv.id,
            senderId: {
              not: user.id
            },
            readReceipts: {
              none: {
                userId: user.id
              }
            }
          }
        })

        await tempPrisma.$disconnect()

        return {
          id: conv.id,
          participants,
          otherParticipants: participants.filter(p => p.id !== user.id),
          isGroup: conv.isGroup,
          groupName: conv.groupName,
          groupAvatar: conv.groupAvatar,
          groupDescription: conv.groupDescription,
          createdBy: conv.createdBy,
          adminIds: JSON.parse(conv.adminIds || '[]'),
          lastMessage: conv.messages[0] || null,
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: formattedConversations,
      pagination: {
        limit,
        offset,
        hasMore: conversations.length === limit
      }
    })

  } catch (error: any) {
    logAPI.error('conversations', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations', details: error.message },
      { status: 500 }
    )
  }
}))

// Create new conversation
export const POST = withRateLimit(20, 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { participantIds, isGroup = false, groupName, groupDescription } = body

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json(
        { error: 'Participant IDs array is required' },
        { status: 400 }
      )
    }

    // Validate group requirements
    if (isGroup && (!groupName || groupName.trim().length === 0)) {
      return NextResponse.json(
        { error: 'Group name is required for group conversations' },
        { status: 400 }
      )
    }

    // For direct messages, only allow 2 participants
    if (!isGroup && participantIds.length !== 1) {
      return NextResponse.json(
        { error: 'Direct messages can only have 2 participants' },
        { status: 400 }
      )
    }

    // For groups, limit to 100 participants
    if (isGroup && participantIds.length > 99) { // 99 + creator = 100
      return NextResponse.json(
        { error: 'Groups cannot have more than 100 participants' },
        { status: 400 }
      )
    }

    const prisma = new PrismaClient()

    // Verify all participants exist and are not banned
    const participants = await prisma.user.findMany({
      where: {
        id: {
          in: participantIds
        },
        isBanned: false
      },
      select: {
        id: true,
        username: true,
        displayName: true
      }
    })

    if (participants.length !== participantIds.length) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'One or more participants not found or banned' },
        { status: 400 }
      )
    }

    // Add creator to participants list
    const allParticipantIds = [user.id, ...participantIds]

    // For direct messages, check if conversation already exists
    if (!isGroup) {
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          participants: {
            in: [
              JSON.stringify(allParticipantIds.sort()),
              JSON.stringify([participantIds[0], user.id].sort())
            ]
          }
        }
      })

      if (existingConversation) {
        await prisma.$disconnect()
        return NextResponse.json(
          { error: 'Conversation with this user already exists', conversationId: existingConversation.id },
          { status: 409 }
        )
      }
    }

    // Create conversation
    const conversation = await prisma.conversation.create({
      data: {
        participants: JSON.stringify(allParticipantIds),
        isGroup,
        groupName: isGroup ? groupName?.trim() : null,
        groupDescription: isGroup ? groupDescription?.trim() : null,
        createdBy: user.id,
        adminIds: isGroup ? JSON.stringify([user.id]) : JSON.stringify([])
      }
    })

    // Get full participant details for response
    const allParticipants = await prisma.user.findMany({
      where: {
        id: {
          in: allParticipantIds
        }
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        level: true,
        isAdmin: true
      }
    })

    await prisma.$disconnect()

    logger.info('Conversation created', {
      conversationId: conversation.id,
      createdBy: user.id.slice(0, 8) + '...',
      participantCount: allParticipantIds.length,
      isGroup
    }, 'Messaging')

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        participants: allParticipants,
        otherParticipants: allParticipants.filter(p => p.id !== user.id),
        isGroup: conversation.isGroup,
        groupName: conversation.groupName,
        groupDescription: conversation.groupDescription,
        createdBy: conversation.createdBy,
        adminIds: JSON.parse(conversation.adminIds || '[]'),
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt
      }
    }, { status: 201 })

  } catch (error: any) {
    logAPI.error('conversations/create', error)
    return NextResponse.json(
      { error: 'Failed to create conversation', details: error.message },
      { status: 500 }
    )
  }
}))