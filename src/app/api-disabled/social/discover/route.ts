import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Discover users and communities (simplified implementation)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'all' // 'users', 'communities', 'all'
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const data: any = {}

    if (type === 'users' || type === 'all') {
      data.suggestedUsers = await discoverUsers(userId, limit)
    }

    if (type === 'communities' || type === 'all') {
      data.suggestedCommunities = await discoverCommunities(userId, limit)
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error discovering content:', error)
    return NextResponse.json(
      { error: 'Failed to discover content' },
      { status: 500 }
    )
  }
}

async function discoverUsers(userId: string, limit: number) {
  try {
    // Get current user's data with simplified schema queries
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        following: { select: { followingId: true } }
      }
    })

    if (!currentUser) {
      return []
    }

    const followingIds = currentUser.following.map(f => f.followingId)
    const excludeIds = [userId, ...followingIds]

    // Find other users not already followed, excluding banned users
    const suggestedUsers = await prisma.user.findMany({
      where: {
        id: { notIn: excludeIds },
        isBanned: false
      },
      include: {
        profile: true
      },
      orderBy: [
        { level: 'desc' },
        { xp: 'desc' }
      ],
      take: limit
    })

    // Return formatted user suggestions
    return suggestedUsers.map(user => ({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        level: user.level,
        profile: {
          profileVerified: user.profile?.profileVerified || false,
          followersCount: user.profile?.followersCount || 0,
          postsCount: user.profile?.postsCount || 0
        }
      },
      reason: 'Active penguin in the colony',
      mutualConnections: 0,
      commonInterests: [],
      score: user.level + (user.xp / 100)
    }))

  } catch (error) {
    console.error('Error discovering users:', error)
    return []
  }
}

async function discoverCommunities(userId: string, limit: number) {
  try {
    // Get user's current memberships to exclude communities they're already in
    const userMemberships = await prisma.communityMember.findMany({
      where: { userId },
      select: { communityId: true }
    })

    const excludeCommunityIds = userMemberships.map(m => m.communityId)

    // Get communities the user hasn't joined, excluding their own created communities
    const communities = await prisma.community.findMany({
      where: {
        id: { notIn: excludeCommunityIds },
        creatorId: { not: userId }, // Exclude communities created by this user
        visibility: 'PUBLIC'
      },
      orderBy: [
        { isOfficial: 'desc' },
        { membersCount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit
    })

    return communities.map(community => ({
      community: {
        ...community,
        tags: JSON.parse(community.tags || '[]')
      },
      reason: community.isOfficial ? 'Official community' : 'Popular in the colony',
      matchingInterests: JSON.parse(community.tags || '[]').slice(0, 2),
      memberFriends: [],
      score: community.membersCount + (community.isOfficial ? 100 : 0)
    }))

  } catch (error) {
    console.error('Error discovering communities:', error)
    return []
  }
}