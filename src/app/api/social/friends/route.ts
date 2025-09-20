import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST - Send friend request
export async function POST(request: NextRequest) {
  try {
    const { initiatorId, receiverId } = await request.json()

    if (!initiatorId || !receiverId) {
      return NextResponse.json(
        { error: 'Initiator ID and Receiver ID are required' },
        { status: 400 }
      )
    }

    if (initiatorId === receiverId) {
      return NextResponse.json(
        { error: 'Cannot send friend request to yourself' },
        { status: 400 }
      )
    }

    // Check if friendship already exists
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { initiatorId, receiverId },
          { initiatorId: receiverId, receiverId: initiatorId }
        ]
      }
    })

    if (existingFriendship) {
      let message = 'Friend request already exists'
      if (existingFriendship.status === 'ACCEPTED') {
        message = 'You are already friends'
      } else if (existingFriendship.status === 'DECLINED') {
        message = 'Friend request was declined'
      } else if (existingFriendship.status === 'BLOCKED') {
        message = 'Cannot send friend request'
      }

      return NextResponse.json(
        { error: message },
        { status: 400 }
      )
    }

    // Create friend request
    const friendship = await prisma.friendship.create({
      data: {
        initiatorId,
        receiverId,
        status: 'PENDING'
      },
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

    // Create activity for initiator
    await prisma.activity.create({
      data: {
        userId: initiatorId,
        activityType: 'FRIEND_REQUEST_SENT',
        targetType: 'user',
        targetId: receiverId,
        content: JSON.stringify({
          receiverUsername: friendship.receiver.username,
          receiverDisplayName: friendship.receiver.displayName
        })
      }
    })

    // Create notification for receiver
    await prisma.notification.create({
      data: {
        fromUserId: initiatorId,
        toUserId: receiverId,
        type: 'FRIEND_REQUEST',
        title: 'Friend Request',
        content: `${friendship.initiator.displayName} sent you a friend request`
      }
    })

    return NextResponse.json({
      success: true,
      data: friendship,
      message: `Friend request sent to ${friendship.receiver.displayName}`
    })
  } catch (error) {
    console.error('Error sending friend request:', error)
    return NextResponse.json(
      { error: 'Failed to send friend request' },
      { status: 500 }
    )
  }
}

// GET - Get friend requests and friends for a user
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'all' // 'pending', 'friends', 'all'

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    let data: any = {}

    if (type === 'pending' || type === 'all') {
      // Get pending friend requests (received)
      const pendingRequests = await prisma.friendship.findMany({
        where: {
          receiverId: userId,
          status: 'PENDING'
        },
        include: {
          initiator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              level: true,
              profile: {
                select: {
                  profileVerified: true,
                  followersCount: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      })

      data.pendingRequests = pendingRequests
    }

    if (type === 'friends' || type === 'all') {
      // Get accepted friendships
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [
            { initiatorId: userId },
            { receiverId: userId }
          ],
          status: 'ACCEPTED'
        },
        include: {
          initiator: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              level: true,
              isOnline: true,
              lastSeen: true,
              profile: {
                select: {
                  profileVerified: true
                }
              }
            }
          },
          receiver: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
              level: true,
              isOnline: true,
              lastSeen: true,
              profile: {
                select: {
                  profileVerified: true
                }
              }
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      })

      // Format friends list (get the other user in each friendship)
      const friends = friendships.map(friendship => {
        const friend = friendship.initiatorId === userId
          ? friendship.receiver
          : friendship.initiator

        return {
          friendshipId: friendship.id,
          user: friend,
          friendsSince: friendship.updatedAt
        }
      })

      data.friends = friends
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error fetching friends data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch friends data' },
      { status: 500 }
    )
  }
}