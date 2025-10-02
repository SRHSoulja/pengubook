import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Get user's friends and friend requests
export const GET = withRateLimit(30, 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all' // all, friends, pending, sent

    

    let friendships = []

    switch (type) {
      case 'friends':
        // Get accepted friendships
        friendships = await prisma.friendship.findMany({
          where: {
            OR: [
              { initiatorId: user.id, status: 'ACCEPTED' },
              { receiverId: user.id, status: 'ACCEPTED' }
            ]
          },
          include: {
            initiator: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                isOnline: true,
                lastSeen: true
              }
            },
            receiver: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                isOnline: true,
                lastSeen: true
              }
            }
          }
        })
        break

      case 'pending':
        // Get friend requests received
        friendships = await prisma.friendship.findMany({
          where: {
            receiverId: user.id,
            status: 'PENDING'
          },
          include: {
            initiator: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                isOnline: true,
                lastSeen: true
              }
            }
          }
        })
        break

      case 'sent':
        // Get friend requests sent
        friendships = await prisma.friendship.findMany({
          where: {
            initiatorId: user.id,
            status: 'PENDING'
          },
          include: {
            receiver: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                isOnline: true,
                lastSeen: true
              }
            }
          }
        })
        break

      default:
        // Get all friendship records for the user
        friendships = await prisma.friendship.findMany({
          where: {
            OR: [
              { initiatorId: user.id },
              { receiverId: user.id }
            ]
          },
          include: {
            initiator: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                isOnline: true,
                lastSeen: true
              }
            },
            receiver: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                isOnline: true,
                lastSeen: true
              }
            }
          }
        })
    }


    // Format the response
    const formattedFriendships = friendships.map((friendship: any) => {
      const isInitiator = friendship.initiatorId === user.id
      const friend = isInitiator ? friendship.receiver : friendship.initiator

      return {
        id: friendship.id,
        friend,
        status: friendship.status,
        isInitiator,
        createdAt: friendship.createdAt,
        updatedAt: friendship.updatedAt
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedFriendships
    })

  } catch (error: any) {
    logger.error('Error fetching friends', error, 'Friends')
    return NextResponse.json(
      { error: 'Failed to fetch friends', details: error.message },
      { status: 500 }
    )
  }
}))

// Send friend request
export const POST = withRateLimit(10, 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { userId: targetUserId } = body

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'Cannot send friend request to yourself' },
        { status: 400 }
      )
    }

    

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, displayName: true }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

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
        { error: 'Cannot send friend request - user relationship blocked' },
        { status: 403 }
      )
    }

    // Check if friendship already exists
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { initiatorId: user.id, receiverId: targetUserId },
          { initiatorId: targetUserId, receiverId: user.id }
        ]
      }
    })

    if (existingFriendship) {
      return NextResponse.json(
        { error: 'Friendship request already exists or you are already friends' },
        { status: 409 }
      )
    }

    // Create friend request
    const friendship = await prisma.friendship.create({
      data: {
        initiatorId: user.id,
        receiverId: targetUserId,
        status: 'PENDING'
      },
      include: {
        receiver: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      }
    })

    // Create notification for the target user
    await prisma.notification.create({
      data: {
        fromUserId: user.id,
        toUserId: targetUserId,
        type: 'FRIEND_REQUEST',
        title: 'New Friend Request',
        content: `${user.username || user.displayName || 'Someone'} sent you a friend request`
      }
    })


    logger.info('Friend request sent', {
      fromUserId: user.id.slice(0, 8) + '...',
      toUserId: targetUserId.slice(0, 8) + '...'
    }, 'Friends')

    return NextResponse.json({
      success: true,
      data: {
        id: friendship.id,
        friend: friendship.receiver,
        status: friendship.status,
        isInitiator: true,
        createdAt: friendship.createdAt
      },
      content: 'Friend request sent successfully'
    })

  } catch (error: any) {
    logger.error('Error sending friend request', error, 'Friends')
    return NextResponse.json(
      { error: 'Failed to send friend request', details: error.message },
      { status: 500 }
    )
  }
}))