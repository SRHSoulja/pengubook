import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'received' // 'sent', 'received'
    const status = searchParams.get('status') || 'PENDING' // 'PENDING', 'ACCEPTED', 'DECLINED'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    

    const whereClause: any = { status }

    if (type === 'sent') {
      whereClause.initiatorId = userId
    } else {
      whereClause.receiverId = userId
    }

    const friendRequests = await prisma.friendship.findMany({
      where: whereClause,
      include: {
        initiator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            level: true,
            isAdmin: true,
            discordName: true,
            twitterHandle: true,
            profile: {
              select: {
                followersCount: true,
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
            isAdmin: true,
            discordName: true,
            twitterHandle: true,
            profile: {
              select: {
                followersCount: true,
                profileVerified: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })


    return NextResponse.json({
      success: true,
      requests: friendRequests,
      type,
      status,
      count: friendRequests.length
    })

  } catch (error: any) {
    console.error('[Friends] GET requests error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch friend requests', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { initiatorId, receiverId } = body

    if (!initiatorId || !receiverId) {
      return NextResponse.json(
        { error: 'Initiator ID and receiver ID are required' },
        { status: 400 }
      )
    }

    if (initiatorId === receiverId) {
      return NextResponse.json(
        { error: 'Users cannot send friend requests to themselves' },
        { status: 400 }
      )
    }

    

    // Check if both users exist
    const [initiator, receiver] = await Promise.all([
      prisma.user.findUnique({
        where: { id: initiatorId },
        select: { id: true, isBanned: true, displayName: true }
      }),
      prisma.user.findUnique({
        where: { id: receiverId },
        select: { id: true, isBanned: true, displayName: true }
      })
    ])

    if (!initiator) {
      return NextResponse.json(
        { error: 'Initiator user not found' },
        { status: 404 }
      )
    }

    if (!receiver) {
      return NextResponse.json(
        { error: 'Receiver user not found' },
        { status: 404 }
      )
    }

    if (initiator.isBanned || receiver.isBanned) {
      return NextResponse.json(
        { error: 'Banned users cannot send or receive friend requests' },
        { status: 403 }
      )
    }

    // Check if a friendship already exists (in either direction)
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { initiatorId, receiverId },
          { initiatorId: receiverId, receiverId: initiatorId }
        ]
      }
    })

    if (existingFriendship) {
      return NextResponse.json(
        { error: 'Friend request already exists or users are already friends' },
        { status: 409 }
      )
    }

    // Create the friend request
    const friendRequest = await prisma.friendship.create({
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

    // Create notification for receiver
    await prisma.notification.create({
      data: {
        fromUserId: initiatorId,
        toUserId: receiverId,
        type: 'FRIEND_REQUEST',
        title: 'Friend Request',
        message: `${initiator.displayName} sent you a friend request`,
        metadata: JSON.stringify({
          friendshipId: friendRequest.id,
          initiatorId,
          initiatorName: initiator.displayName
        })
      }
    })


    return NextResponse.json({
      success: true,
      request: friendRequest
    }, { status: 201 })

  } catch (error: any) {
    console.error('[Friends] POST request error:', error)
    return NextResponse.json(
      { error: 'Failed to send friend request', details: error.message },
      { status: 500 }
    )
  }
}