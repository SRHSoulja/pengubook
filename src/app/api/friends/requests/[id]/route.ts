import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: friendshipId } = params
    const body = await request.json()
    const { userId, action } = body // action: 'accept' or 'decline'

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be either "accept" or "decline"' },
        { status: 400 }
      )
    }

    const prisma = new PrismaClient()

    // Find the friendship request
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      include: {
        initiator: {
          select: {
            id: true,
            displayName: true
          }
        },
        receiver: {
          select: {
            id: true,
            displayName: true
          }
        }
      }
    })

    if (!friendship) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Friend request not found' },
        { status: 404 }
      )
    }

    // Verify user is the receiver of the request
    if (friendship.receiverId !== userId) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Only the receiver can respond to this friend request' },
        { status: 403 }
      )
    }

    // Check if request is still pending
    if (friendship.status !== 'PENDING') {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Friend request has already been responded to' },
        { status: 409 }
      )
    }

    const newStatus = action === 'accept' ? 'ACCEPTED' : 'DECLINED'

    // Update the friendship status
    const updatedFriendship = await prisma.friendship.update({
      where: { id: friendshipId },
      data: {
        status: newStatus,
        updatedAt: new Date()
      },
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            level: true,
            isAdmin: true
          }
        },
        receiver: {
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

    if (action === 'accept') {
      // Create mutual follow relationships for accepted friends
      await Promise.all([
        prisma.follow.upsert({
          where: {
            followerId_followingId: {
              followerId: friendship.initiatorId,
              followingId: friendship.receiverId
            }
          },
          update: {},
          create: {
            followerId: friendship.initiatorId,
            followingId: friendship.receiverId
          }
        }),
        prisma.follow.upsert({
          where: {
            followerId_followingId: {
              followerId: friendship.receiverId,
              followingId: friendship.initiatorId
            }
          },
          update: {},
          create: {
            followerId: friendship.receiverId,
            followingId: friendship.initiatorId
          }
        })
      ])

      // Update follower counts
      await Promise.all([
        prisma.profile.upsert({
          where: { userId: friendship.initiatorId },
          update: {
            followingCount: { increment: 1 },
            followersCount: { increment: 1 }
          },
          create: {
            userId: friendship.initiatorId,
            followingCount: 1,
            followersCount: 1
          }
        }),
        prisma.profile.upsert({
          where: { userId: friendship.receiverId },
          update: {
            followingCount: { increment: 1 },
            followersCount: { increment: 1 }
          },
          create: {
            userId: friendship.receiverId,
            followingCount: 1,
            followersCount: 1
          }
        })
      ])

      // Create notification for initiator
      await prisma.notification.create({
        data: {
          fromUserId: friendship.receiverId,
          toUserId: friendship.initiatorId,
          type: 'FRIEND_ACCEPTED',
          title: 'Friend Request Accepted',
          message: `${friendship.receiver.displayName} accepted your friend request`,
          metadata: JSON.stringify({
            friendshipId,
            acceptedBy: friendship.receiverId,
            acceptedByName: friendship.receiver.displayName
          })
        }
      })
    }

    // Remove the original friend request notification
    await prisma.notification.deleteMany({
      where: {
        fromUserId: friendship.initiatorId,
        toUserId: friendship.receiverId,
        type: 'FRIEND_REQUEST',
        metadata: {
          contains: `"friendshipId":"${friendshipId}"`
        }
      }
    })

    await prisma.$disconnect()

    return NextResponse.json({
      success: true,
      friendship: updatedFriendship,
      action,
      message: `Friend request ${action}ed successfully`
    })

  } catch (error: any) {
    console.error('[Friends] PUT request error:', error)
    return NextResponse.json(
      { error: `Failed to ${body?.action || 'update'} friend request`, details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: friendshipId } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const prisma = new PrismaClient()

    // Find the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
      select: {
        id: true,
        initiatorId: true,
        receiverId: true,
        status: true
      }
    })

    if (!friendship) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Friendship not found' },
        { status: 404 }
      )
    }

    // Verify user is involved in this friendship
    if (friendship.initiatorId !== userId && friendship.receiverId !== userId) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'You can only delete your own friendship requests' },
        { status: 403 }
      )
    }

    // If friendship is accepted, remove mutual follows
    if (friendship.status === 'ACCEPTED') {
      await Promise.all([
        prisma.follow.deleteMany({
          where: {
            followerId: friendship.initiatorId,
            followingId: friendship.receiverId
          }
        }),
        prisma.follow.deleteMany({
          where: {
            followerId: friendship.receiverId,
            followingId: friendship.initiatorId
          }
        })
      ])

      // Update follower counts
      await Promise.all([
        prisma.profile.updateMany({
          where: { userId: friendship.initiatorId },
          data: {
            followingCount: { decrement: 1 },
            followersCount: { decrement: 1 }
          }
        }),
        prisma.profile.updateMany({
          where: { userId: friendship.receiverId },
          data: {
            followingCount: { decrement: 1 },
            followersCount: { decrement: 1 }
          }
        })
      ])
    }

    // Delete the friendship
    await prisma.friendship.delete({
      where: { id: friendshipId }
    })

    // Remove any related notifications
    await prisma.notification.deleteMany({
      where: {
        OR: [
          {
            fromUserId: friendship.initiatorId,
            toUserId: friendship.receiverId,
            type: { in: ['FRIEND_REQUEST', 'FRIEND_ACCEPTED'] }
          },
          {
            fromUserId: friendship.receiverId,
            toUserId: friendship.initiatorId,
            type: { in: ['FRIEND_REQUEST', 'FRIEND_ACCEPTED'] }
          }
        ],
        metadata: {
          contains: `"friendshipId":"${friendshipId}"`
        }
      }
    })

    await prisma.$disconnect()

    return NextResponse.json({
      success: true,
      message: 'Friendship deleted successfully'
    })

  } catch (error: any) {
    console.error('[Friends] DELETE request error:', error)
    return NextResponse.json(
      { error: 'Failed to delete friendship', details: error.message },
      { status: 500 }
    )
  }
}