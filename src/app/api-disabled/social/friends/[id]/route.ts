import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// PUT - Accept/decline/block friend request
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { action, userId } = await request.json()

    if (!action || !userId) {
      return NextResponse.json(
        { error: 'Action and user ID are required' },
        { status: 400 }
      )
    }

    if (!['accept', 'decline', 'block'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be accept, decline, or block' },
        { status: 400 }
      )
    }

    // Get the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id },
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            displayName: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            displayName: true
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

    // Verify user is the receiver
    if (friendship.receiverId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to modify this friend request' },
        { status: 403 }
      )
    }

    // Update friendship status
    const status = action === 'accept' ? 'ACCEPTED' :
                  action === 'decline' ? 'DECLINED' : 'BLOCKED'

    const updatedFriendship = await prisma.friendship.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date()
      }
    })

    let message = ''
    let notificationType: 'FRIEND_ACCEPTED' | 'SYSTEM' = 'SYSTEM'
    let notificationMessage = ''

    if (action === 'accept') {
      message = `You are now friends with ${friendship.initiator.displayName}`
      notificationType = 'FRIEND_ACCEPTED'
      notificationMessage = `${friendship.receiver.displayName} accepted your friend request`

      // Create activity for both users
      await Promise.all([
        prisma.activity.create({
          data: {
            userId: friendship.receiverId,
            activityType: 'FRIEND_REQUEST_ACCEPTED',
            targetType: 'user',
            targetId: friendship.initiatorId,
            content: JSON.stringify({
              friendUsername: friendship.initiator.username,
              friendDisplayName: friendship.initiator.displayName
            })
          }
        }),
        prisma.activity.create({
          data: {
            userId: friendship.initiatorId,
            activityType: 'FRIEND_REQUEST_ACCEPTED',
            targetType: 'user',
            targetId: friendship.receiverId,
            content: JSON.stringify({
              friendUsername: friendship.receiver.username,
              friendDisplayName: friendship.receiver.displayName
            })
          }
        })
      ])

    } else if (action === 'decline') {
      message = 'Friend request declined'
      notificationMessage = `${friendship.receiver.displayName} declined your friend request`
    } else {
      message = 'User blocked'
      // Don't send notification for blocks
    }

    // Create notification for initiator (except for blocks)
    if (action !== 'block') {
      await prisma.notification.create({
        data: {
          fromUserId: friendship.receiverId,
          toUserId: friendship.initiatorId,
          type: notificationType,
          title: action === 'accept' ? 'Friend Request Accepted' : 'Friend Request Declined',
          content: notificationMessage
        }
      })
    }

    return NextResponse.json({
      success: true,
      data: updatedFriendship,
      message
    })
  } catch (error) {
    console.error('Error updating friend request:', error)
    return NextResponse.json(
      { error: 'Failed to update friend request' },
      { status: 500 }
    )
  }
}

// DELETE - Remove friendship
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id },
      include: {
        initiator: {
          select: {
            displayName: true
          }
        },
        receiver: {
          select: {
            displayName: true
          }
        }
      }
    })

    if (!friendship) {
      return NextResponse.json(
        { error: 'Friendship not found' },
        { status: 404 }
      )
    }

    // Verify user is part of the friendship
    if (friendship.initiatorId !== userId && friendship.receiverId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this friendship' },
        { status: 403 }
      )
    }

    // Delete friendship
    await prisma.friendship.delete({
      where: { id }
    })

    const otherUser = friendship.initiatorId === userId
      ? friendship.receiver
      : friendship.initiator

    return NextResponse.json({
      success: true,
      message: `You are no longer friends with ${otherUser.displayName}`
    })
  } catch (error) {
    console.error('Error removing friendship:', error)
    return NextResponse.json(
      { error: 'Failed to remove friendship' },
      { status: 500 }
    )
  }
}