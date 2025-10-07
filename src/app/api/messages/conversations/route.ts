import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'
import { rateLimiters, RateLimitError } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// Get user's conversations
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    logAPI.request('conversations', { userId: user.id.slice(0, 8) + '...', limit })

    

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
        lastMessageAt: 'desc'
      },
      take: limit,
      skip: offset
    })


    // Format conversations with participant info and unread counts
    const formattedConversations = await Promise.all(
      conversations.map(async (conv) => {
        // Parse participants
        const participantIds = JSON.parse(conv.participants || '[]')
        const otherParticipants = participantIds.filter((id: string) => id !== user.id)

        // Get participant details
        const participants = await prisma.user.findMany({
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
            avatarSource: true,
            discordAvatar: true,
            twitterAvatar: true,
            level: true,
            isAdmin: true
          }
        })

        // Calculate unread count for this user
        const unreadCount = await prisma.message.count({
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
})

// Create new conversation
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { participantIds, isGroup = false, groupName, groupDescription, groupAvatar } = body

    // Apply rate limiting for group creation (5 per hour)
    if (isGroup) {
      try {
        rateLimiters.groupCreation(request)
      } catch (error) {
        if (error instanceof RateLimitError) {
          return NextResponse.json(
            { error: `Too many groups created. Please wait ${error.retryAfter} seconds before creating another group.` },
            { status: 429, headers: { 'Retry-After': error.retryAfter.toString() } }
          )
        }
        throw error
      }
    }

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
      return NextResponse.json(
        { error: 'One or more participants not found or banned' },
        { status: 400 }
      )
    }

    // For direct messages, check privacy settings and blocking
    if (!isGroup) {
      const targetUserId = participantIds[0]

      // Check if users have blocked each other
      const blocks = await prisma.block.findFirst({
        where: {
          OR: [
            { blockerId: user.id, blockedId: targetUserId },
            { blockerId: targetUserId, blockedId: user.id }
          ]
        }
      })

      if (blocks) {
        return NextResponse.json(
          { error: 'Cannot create conversation - user relationship blocked' },
          { status: 403 }
        )
      }

      // Check target user's DM privacy settings
      const targetProfile = await prisma.profile.findUnique({
        where: { userId: targetUserId },
        select: {
          dmPrivacyLevel: true,
          allowDirectMessages: true
        }
      })

      if (!targetProfile?.allowDirectMessages || targetProfile?.dmPrivacyLevel === 'NONE') {
        return NextResponse.json(
          { error: 'User is not accepting direct messages' },
          { status: 403 }
        )
      }

      // If privacy level is FRIENDS_ONLY, check friendship status
      if (targetProfile.dmPrivacyLevel === 'FRIENDS_ONLY') {
        const friendship = await prisma.friendship.findFirst({
          where: {
            OR: [
              { initiatorId: user.id, receiverId: targetUserId, status: 'ACCEPTED' },
              { initiatorId: targetUserId, receiverId: user.id, status: 'ACCEPTED' }
            ]
          }
        })

        if (!friendship) {
          return NextResponse.json(
            { error: 'User only accepts messages from friends' },
            { status: 403 }
          )
        }
      }
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
        return NextResponse.json(
          { error: 'Conversation with this user already exists', conversationId: existingConversation.id },
          { status: 409 }
        )
      }
    }

    // For groups, check if a group with same participants already exists
    if (isGroup) {
      const sortedParticipants = JSON.stringify(allParticipantIds.sort())
      const existingGroup = await prisma.conversation.findFirst({
        where: {
          isGroup: true,
          participants: sortedParticipants
        }
      })

      if (existingGroup) {
        return NextResponse.json(
          { error: 'A group with these participants already exists', conversationId: existingGroup.id },
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
        groupAvatar: isGroup && groupAvatar?.trim() ? groupAvatar.trim() : null,
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


    logger.info('Conversation created', {
      conversationId: conversation.id,
      createdBy: user.id.slice(0, 8) + '...',
      participantCount: allParticipantIds.length,
      isGroup
    }, { component: 'Messaging' })

    return NextResponse.json({
      success: true,
      conversation: {
        id: conversation.id,
        participants: allParticipants,
        otherParticipants: allParticipants.filter(p => p.id !== user.id),
        isGroup: conversation.isGroup,
        groupName: conversation.groupName,
        groupAvatar: conversation.groupAvatar,
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
})