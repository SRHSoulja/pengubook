import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Accept or decline friend request
export const PUT = withRateLimit(10, 60 * 1000)(withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: { friendshipId: string } }
) => {
  try {
    const body = await request.json()
    const { action } = body // 'accept' or 'decline'
    const friendshipId = params.friendshipId

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "accept" or "decline"' },
        { status: 400 }
      )
    }

    

    // Find the friendship request
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        },
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

    if (!friendship) {
      return NextResponse.json(
        { error: 'Friend request not found' },
        { status: 404 }
      )
    }

    // Check if user is the receiver of the request
    if (friendship.receiverId !== user.id) {
      return NextResponse.json(
        { error: 'You can only respond to friend requests sent to you' },
        { status: 403 }
      )
    }

    // Check if request is still pending
    if (friendship.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Friend request has already been responded to' },
        { status: 409 }
      )
    }

    if (action === 'accept') {
      // Accept the friend request
      const updatedFriendship = await prisma.friendship.update({
        where: { id: friendshipId },
        data: { status: 'ACCEPTED' },
        include: {
          initiator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true
            }
          }
        }
      })

      // Create notification for the initiator
      await prisma.notification.create({
        data: {
          fromUserId: user.id,
          toUserId: friendship.initiatorId,
          type: 'FRIEND_ACCEPTED',
          title: 'Friend Request Accepted',
          content: `${user.username || user.displayName || 'Someone'} accepted your friend request`
        }
      })


      logger.info('Friend request accepted', {
        friendshipId,
        acceptedBy: user.id.slice(0, 8) + '...',
        initiatorId: friendship.initiatorId.slice(0, 8) + '...'
      }, { component: 'Friends' })

      return NextResponse.json({
        success: true,
        data: {
          id: updatedFriendship.id,
          friend: updatedFriendship.initiator,
          status: updatedFriendship.status,
          isInitiator: false,
          createdAt: updatedFriendship.createdAt,
          updatedAt: updatedFriendship.updatedAt
        },
        content: 'Friend request accepted'
      })

    } else {
      // Decline the friend request
      await prisma.friendship.delete({
        where: { id: friendshipId }
      })


      logger.info('Friend request declined', {
        friendshipId,
        declinedBy: user.id.slice(0, 8) + '...',
        initiatorId: friendship.initiatorId.slice(0, 8) + '...'
      }, { component: 'Friends' })

      return NextResponse.json({
        success: true,
        content: 'Friend request declined'
      })
    }

  } catch (error: any) {
    logger.error('Error responding to friend request', error, 'Friends')
    return NextResponse.json(
      { error: 'Failed to respond to friend request', details: error.message },
      { status: 500 }
    )
  }
}))

// Remove friend or cancel friend request
export const DELETE = withRateLimit(10, 60 * 1000)(withAuth(async (
  request: NextRequest,
  user: any,
  { params }: { params: { friendshipId: string } }
) => {
  try {
    const friendshipId = params.friendshipId

    

    // Find the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        initiator: {
          select: { id: true, username: true, displayName: true }
        },
        receiver: {
          select: { id: true, username: true, displayName: true }
        }
      }
    })

    if (!friendship) {
      return NextResponse.json(
        { error: 'Friendship not found' },
        { status: 404 }
      )
    }

    // Check if user is part of this friendship
    if (friendship.initiatorId !== user.id && friendship.receiverId !== user.id) {
      return NextResponse.json(
        { error: 'You are not part of this friendship' },
        { status: 403 }
      )
    }

    // Delete the friendship
    await prisma.friendship.delete({
      where: { id: friendshipId }
    })


    const action = friendship.status === 'PENDING' ? 'cancelled' : 'removed'

    logger.info(`Friendship ${action}`, {
      friendshipId,
      actionBy: user.id.slice(0, 8) + '...',
      otherUserId: (friendship.initiatorId === user.id ? friendship.receiverId : friendship.initiatorId).slice(0, 8) + '...'
    }, { component: 'Friends' })

    return NextResponse.json({
      success: true,
      content: `Friendship ${action} successfully`
    })

  } catch (error: any) {
    logger.error('Error removing friendship', error, 'Friends')
    return NextResponse.json(
      { error: 'Failed to remove friendship', details: error.message },
      { status: 500 }
    )
  }
}))