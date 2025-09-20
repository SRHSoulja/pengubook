import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateUserSecure, AuthenticationError, AuthorizationError } from '@/lib/auth/secure'

const prisma = new PrismaClient()

// POST /api/users/follow - Follow or unfollow a user
export async function POST(request: NextRequest) {
  try {
    const { targetUserId, action } = await request.json()

    // Authenticate user securely
    const currentUser = await authenticateUserSecure(request)

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    // Prevent self-following
    if (currentUser.id === targetUserId) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    if (action === 'follow') {
      // Check if already following
      const existingFollow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUser.id,
            followingId: targetUserId
          }
        }
      })

      if (existingFollow) {
        return NextResponse.json({ error: 'Already following this user' }, { status: 400 })
      }

      // Create follow relationship
      const follow = await prisma.follow.create({
        data: {
          followerId: currentUser.id,
          followingId: targetUserId
        },
        include: {
          follower: true,
          following: true
        }
      })

      // Update follower/following counts
      await Promise.all([
        prisma.profile.update({
          where: { userId: currentUser.id },
          data: {
            followingCount: {
              increment: 1
            }
          }
        }),
        prisma.profile.update({
          where: { userId: targetUserId },
          data: {
            followersCount: {
              increment: 1
            }
          }
        })
      ])

      // Create activity
      await prisma.activity.create({
        data: {
          userId: currentUser.id,
          activityType: 'USER_FOLLOWED',
          targetId: targetUserId,
          targetType: 'user',
          content: JSON.stringify({
            followedUserId: targetUserId,
            followedUserName: targetUser.displayName
          })
        }
      })

      // Create notification for target user
      await prisma.notification.create({
        data: {
          fromUserId: currentUser.id,
          toUserId: targetUserId,
          type: 'FOLLOW',
          title: 'New Follower',
          content: `${currentUser.displayName} started following you`
        }
      })

      return NextResponse.json({
        success: true,
        data: {
          follow,
          message: `Now following ${targetUser.displayName}`
        }
      })

    } else if (action === 'unfollow') {
      // Find and delete follow relationship
      const followToDelete = await prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: currentUser.id,
            followingId: targetUserId
          }
        }
      })

      if (!followToDelete) {
        return NextResponse.json({ error: 'Not following this user' }, { status: 400 })
      }

      await prisma.follow.delete({
        where: {
          id: followToDelete.id
        }
      })

      // Update follower/following counts
      await Promise.all([
        prisma.profile.update({
          where: { userId: currentUser.id },
          data: {
            followingCount: {
              decrement: 1
            }
          }
        }),
        prisma.profile.update({
          where: { userId: targetUserId },
          data: {
            followersCount: {
              decrement: 1
            }
          }
        })
      ])

      return NextResponse.json({
        success: true,
        data: {
          message: `Unfollowed ${targetUser.displayName}`
        }
      })

    } else {
      return NextResponse.json({ error: 'Invalid action. Use "follow" or "unfollow"' }, { status: 400 })
    }

  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    console.error('Error handling follow action:', error)
    return NextResponse.json({
      error: 'Failed to handle follow action'
    }, { status: 500 })
  }
}

// GET /api/users/follow - Get user's following/followers
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') // 'followers' or 'following'
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    if (!type || (type !== 'followers' && type !== 'following')) {
      return NextResponse.json({ error: 'Type must be "followers" or "following"' }, { status: 400 })
    }

    let results

    if (type === 'followers') {
      results = await prisma.follow.findMany({
        where: { followingId: userId },
        include: {
          follower: {
            include: {
              profile: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      })

      const users = results.map(follow => follow.follower)
      const hasMore = results.length === limit

      return NextResponse.json({
        success: true,
        data: {
          users,
          hasMore,
          nextOffset: hasMore ? offset + limit : null
        }
      })

    } else { // following
      results = await prisma.follow.findMany({
        where: { followerId: userId },
        include: {
          following: {
            include: {
              profile: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: offset,
        take: limit
      })

      const users = results.map(follow => follow.following)
      const hasMore = results.length === limit

      return NextResponse.json({
        success: true,
        data: {
          users,
          hasMore,
          nextOffset: hasMore ? offset + limit : null
        }
      })
    }

  } catch (error) {
    console.error('Error fetching follow data:', error)
    return NextResponse.json({
      error: 'Failed to fetch follow data'
    }, { status: 500 })
  }
}