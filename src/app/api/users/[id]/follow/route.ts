import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: followingId } = params
    const body = await request.json()
    const { followerId } = body

    if (!followerId) {
      return NextResponse.json(
        { error: 'Follower ID is required' },
        { status: 400 }
      )
    }

    if (followerId === followingId) {
      return NextResponse.json(
        { error: 'Users cannot follow themselves' },
        { status: 400 }
      )
    }

    

    // Check if both users exist
    const [follower, following] = await Promise.all([
      prisma.user.findUnique({
        where: { id: followerId },
        select: { id: true, isBanned: true, displayName: true }
      }),
      prisma.user.findUnique({
        where: { id: followingId },
        select: { id: true, isBanned: true, displayName: true }
      })
    ])

    if (!follower) {
      return NextResponse.json(
        { error: 'Follower user not found' },
        { status: 404 }
      )
    }

    if (!following) {
      return NextResponse.json(
        { error: 'User to follow not found' },
        { status: 404 }
      )
    }

    if (follower.isBanned) {
      return NextResponse.json(
        { error: 'Banned users cannot follow others' },
        { status: 403 }
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

    // Create the follow relationship
    const follow = await prisma.follow.create({
      data: {
        followerId,
        followingId
      },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            level: true,
            isAdmin: true
          }
        },
        following: {
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

    // Update follower counts
    await Promise.all([
      // Update follower's following count
      prisma.profile.upsert({
        where: { userId: followerId },
        update: {
          followingCount: {
            increment: 1
          }
        },
        create: {
          userId: followerId,
          followingCount: 1
        }
      }),
      // Update following user's followers count
      prisma.profile.upsert({
        where: { userId: followingId },
        update: {
          followersCount: {
            increment: 1
          }
        },
        create: {
          userId: followingId,
          followersCount: 1
        }
      })
    ])

    // Create notification for the user being followed
    await prisma.notification.create({
      data: {
        fromUserId: followerId,
        toUserId: followingId,
        type: 'FOLLOW',
        title: 'New Follower',
        message: `${follower.displayName} started following you`,
        metadata: JSON.stringify({
          followerId,
          followerName: follower.displayName
        })
      }
    })


    return NextResponse.json({
      success: true,
      follow: {
        id: follow.id,
        followerId: follow.followerId,
        followingId: follow.followingId,
        createdAt: follow.createdAt,
        follower: follow.follower,
        following: follow.following
      }
    }, { status: 201 })

  } catch (error: any) {
    console.error('[Follow] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to follow user', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: followingId } = params
    const { searchParams } = new URL(request.url)
    const followerId = searchParams.get('followerId')

    if (!followerId) {
      return NextResponse.json(
        { error: 'Follower ID is required' },
        { status: 400 }
      )
    }

    

    // Check if follow relationship exists
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    })

    if (!existingFollow) {
      return NextResponse.json(
        { error: 'Follow relationship not found' },
        { status: 404 }
      )
    }

    // Delete the follow relationship
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    })

    // Update follower counts
    await Promise.all([
      // Update follower's following count
      prisma.profile.updateMany({
        where: { userId: followerId },
        data: {
          followingCount: {
            decrement: 1
          }
        }
      }),
      // Update following user's followers count
      prisma.profile.updateMany({
        where: { userId: followingId },
        data: {
          followersCount: {
            decrement: 1
          }
        }
      })
    ])

    // Remove follow notification
    await prisma.notification.deleteMany({
      where: {
        fromUserId: followerId,
        toUserId: followingId,
        type: 'FOLLOW'
      }
    })


    return NextResponse.json({
      success: true,
      message: 'Unfollowed successfully'
    })

  } catch (error: any) {
    console.error('[Follow] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to unfollow user', details: error.message },
      { status: 500 }
    )
  }
}