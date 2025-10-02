import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { followerId, followingId } = body

    if (!followerId || !followingId) {
      return NextResponse.json(
        { error: 'Follower ID and Following ID are required' },
        { status: 400 }
      )
    }

    if (followerId === followingId) {
      return NextResponse.json(
        { error: 'Cannot follow yourself' },
        { status: 400 }
      )
    }

    

    // Check if already following
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    })

    if (existingFollow) {
      return NextResponse.json(
        { error: 'Already following this user' },
        { status: 409 }
      )
    }

    // Create follow relationship
    await prisma.follow.create({
      data: {
        followerId,
        followingId
      }
    })

    // Update follower counts
    await prisma.profile.updateMany({
      where: { userId: followingId },
      data: {
        followersCount: {
          increment: 1
        }
      }
    })

    await prisma.profile.updateMany({
      where: { userId: followerId },
      data: {
        followingCount: {
          increment: 1
        }
      }
    })


    return NextResponse.json({
      success: true,
      message: 'Successfully followed user'
    })

  } catch (error: any) {
    console.error('[Social Follow] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to follow user', details: error.message },
      { status: 500 }
    )
  }
}