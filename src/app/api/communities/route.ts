import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const visibility = searchParams.get('visibility') || 'PUBLIC'
    const search = searchParams.get('search')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    const userId = searchParams.get('userId') // For checking membership

    const prisma = new PrismaClient()

    const whereClause: any = {
      visibility
    }

    if (category) {
      whereClause.category = category
    }

    if (search) {
      whereClause.OR = [
        {
          name: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          displayName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          description: {
            contains: search,
            mode: 'insensitive'
          }
        }
      ]
    }

    const communities = await prisma.community.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            level: true,
            isAdmin: true
          }
        },
        members: userId ? {
          where: { userId },
          select: {
            id: true,
            role: true,
            joinedAt: true
          }
        } : false,
        moderators: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            posts: true
          }
        }
      },
      orderBy: [
        { isOfficial: 'desc' },
        { membersCount: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })

    await prisma.$disconnect()

    const formattedCommunities = communities.map(community => ({
      id: community.id,
      name: community.name,
      displayName: community.displayName,
      description: community.description,
      avatar: community.avatar,
      banner: community.banner,
      category: community.category,
      tags: JSON.parse(community.tags || '[]'),
      visibility: community.visibility,
      rules: community.rules,
      isOfficial: community.isOfficial,
      creator: community.creator,
      tokenGating: {
        isTokenGated: community.isTokenGated,
        tokenGateType: community.tokenGateType,
        tokenContractAddress: community.tokenContractAddress,
        tokenMinAmount: community.tokenMinAmount,
        tokenIds: JSON.parse(community.tokenIds || '[]'),
        tokenSymbol: community.tokenSymbol
      },
      stats: {
        membersCount: community._count.members,
        postsCount: community._count.posts
      },
      moderators: community.moderators.map(mod => ({
        user: mod.user,
        permissions: JSON.parse(mod.permissions || '[]'),
        assignedAt: mod.assignedAt
      })),
      userMembership: userId && community.members.length > 0 ? {
        role: community.members[0].role,
        joinedAt: community.members[0].joinedAt
      } : null,
      createdAt: community.createdAt,
      updatedAt: community.updatedAt
    }))

    return NextResponse.json({
      success: true,
      communities: formattedCommunities,
      pagination: {
        limit,
        offset,
        hasMore: communities.length === limit
      }
    })

  } catch (error: any) {
    console.error('[Communities] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch communities', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      displayName,
      description,
      avatar,
      banner,
      category,
      tags = [],
      visibility = 'PUBLIC',
      rules,
      creatorId,
      tokenGating = {}
    } = body

    if (!name || !displayName || !description || !creatorId || !category) {
      return NextResponse.json(
        { error: 'Name, display name, description, creator ID, and category are required' },
        { status: 400 }
      )
    }

    // Validate name format (alphanumeric, hyphens, underscores)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return NextResponse.json(
        { error: 'Community name can only contain letters, numbers, hyphens, and underscores' },
        { status: 400 }
      )
    }

    if (name.length < 3 || name.length > 50) {
      return NextResponse.json(
        { error: 'Community name must be between 3 and 50 characters' },
        { status: 400 }
      )
    }

    const prisma = new PrismaClient()

    // Check if creator exists and is not banned
    const creator = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { id: true, isBanned: true, isAdmin: true, level: true }
    })

    if (!creator) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Creator user not found' },
        { status: 404 }
      )
    }

    if (creator.isBanned) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Banned users cannot create communities' },
        { status: 403 }
      )
    }

    // Check minimum level requirement for community creation (unless admin)
    if (!creator.isAdmin && creator.level < 5) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'You must be at least level 5 to create a community. Visit /levels to see how to level up!' },
        { status: 403 }
      )
    }

    // Check if community name already exists
    const existingCommunity = await prisma.community.findUnique({
      where: { name }
    })

    if (existingCommunity) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'A community with this name already exists' },
        { status: 409 }
      )
    }

    // Create the community
    const newCommunity = await prisma.community.create({
      data: {
        name,
        displayName,
        description,
        avatar,
        banner,
        category,
        tags: JSON.stringify(tags),
        visibility,
        rules,
        creatorId,
        isTokenGated: tokenGating.isTokenGated || false,
        tokenGateType: tokenGating.tokenGateType,
        tokenContractAddress: tokenGating.tokenContractAddress,
        tokenMinAmount: tokenGating.tokenMinAmount,
        tokenIds: JSON.stringify(tokenGating.tokenIds || []),
        tokenSymbol: tokenGating.tokenSymbol,
        membersCount: 1 // Creator is automatically a member
      },
      include: {
        creator: {
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

    // Add creator as the first member with ADMIN role
    await prisma.communityMember.create({
      data: {
        userId: creatorId,
        communityId: newCommunity.id,
        role: 'ADMIN'
      }
    })

    // Add creator as moderator with full permissions
    await prisma.communityModerator.create({
      data: {
        userId: creatorId,
        communityId: newCommunity.id,
        permissions: JSON.stringify(['ALL'])
      }
    })

    await prisma.$disconnect()

    const formattedCommunity = {
      id: newCommunity.id,
      name: newCommunity.name,
      displayName: newCommunity.displayName,
      description: newCommunity.description,
      avatar: newCommunity.avatar,
      banner: newCommunity.banner,
      category: newCommunity.category,
      tags: JSON.parse(newCommunity.tags || '[]'),
      visibility: newCommunity.visibility,
      rules: newCommunity.rules,
      isOfficial: newCommunity.isOfficial,
      creator: newCommunity.creator,
      tokenGating: {
        isTokenGated: newCommunity.isTokenGated,
        tokenGateType: newCommunity.tokenGateType,
        tokenContractAddress: newCommunity.tokenContractAddress,
        tokenMinAmount: newCommunity.tokenMinAmount,
        tokenIds: JSON.parse(newCommunity.tokenIds || '[]'),
        tokenSymbol: newCommunity.tokenSymbol
      },
      stats: {
        membersCount: newCommunity.membersCount,
        postsCount: newCommunity.postsCount
      },
      createdAt: newCommunity.createdAt,
      updatedAt: newCommunity.updatedAt
    }

    return NextResponse.json({
      success: true,
      community: formattedCommunity
    }, { status: 201 })

  } catch (error: any) {
    console.error('[Communities] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create community', details: error.message },
      { status: 500 }
    )
  }
}