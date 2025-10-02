import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { initiatorId, receiverId } = body

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
          { userId: initiatorId, friendId: receiverId },
          { userId: receiverId, friendId: initiatorId }
        ]
      }
    })

    if (existingFriendship) {
      return NextResponse.json(
        { error: 'Friendship already exists or request pending' },
        { status: 409 }
      )
    }

    // Create friend request
    await prisma.friendship.create({
      data: {
        userId: initiatorId,
        friendId: receiverId,
        status: 'PENDING'
      }
    })


    return NextResponse.json({
      success: true,
      content: 'Friend request sent successfully'
    })

  } catch (error: any) {
    console.error('[Social Friends] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to send friend request', details: error.message },
      { status: 500 }
    )
  }
}