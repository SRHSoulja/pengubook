import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeUrl } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId') // For checking membership and permissions

    

    const community = await prisma.community.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
                isAdmin: true
              }
            }
          },
          orderBy: [
            { role: 'asc' }, // ADMIN, MODERATOR, MEMBER
            { joinedAt: 'asc' }
          ],
          take: 20 // Limit initial member list
        },
        moderators: {
          include: {
            user: {
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
        }
      }
    })

    // Posts are not linked to communities in the schema
    const recentPosts: any[] = []

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      )
    }

    // Check user membership and permissions
    let userMembership = null
    let userPermissions: string[] = []

    if (userId) {
      const membership = community.members.find(m => m.userId === userId)
      if (membership) {
        userMembership = {
          role: membership.role,
          joinedAt: membership.joinedAt
        }

        // Get moderator permissions if user is a moderator
        const moderator = community.moderators.find(m => m.userId === userId)
        if (moderator) {
          userPermissions = JSON.parse(moderator.permissions || '[]')
        }
      }
    }


    const formattedCommunity = {
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
      creatorId: community.creatorId,
      tokenGating: {
        isTokenGated: community.isTokenGated,
        tokenGateType: community.tokenGateType,
        tokenContractAddress: community.tokenContractAddress,
        tokenMinAmount: community.tokenMinAmount,
        tokenIds: JSON.parse(community.tokenIds || '[]'),
        tokenSymbol: community.tokenSymbol
      },
      stats: {
        membersCount: community.membersCount,
        postsCount: community.postsCount
      },
      members: community.members.map(member => ({
        user: member.user,
        role: member.role,
        joinedAt: member.joinedAt
      })),
      moderators: community.moderators.map(mod => ({
        user: mod.user,
        permissions: JSON.parse(mod.permissions || '[]'),
        assignedAt: mod.assignedAt
      })),
      recentPosts: recentPosts.map(post => ({
        id: post.id,
        content: post.content.substring(0, 200) + (post.content.length > 200 ? '...' : ''),
        contentType: post.contentType,
        createdAt: post.createdAt,
        author: post.author,
        stats: {
          likes: post._count.likes,
          comments: post._count.comments,
          shares: post._count.shares
        }
      })),
      userMembership,
      userPermissions,
      createdAt: community.createdAt,
      updatedAt: community.updatedAt
    }

    return NextResponse.json({
      success: true,
      community: formattedCommunity
    })

  } catch (error: any) {
    console.error('[Communities] GET by ID error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch community', details: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { userId, ...updateData } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    

    // Check if community exists
    const community = await prisma.community.findUnique({
      where: { id },
      select: {
        id: true,
        creatorId: true,
        name: true
      }
    })

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to edit (creator, admin, or moderator with permissions)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isAdmin: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    let hasPermission = false

    if (user.isAdmin || community.creatorId === userId) {
      hasPermission = true
    } else {
      // Check if user is a moderator with edit permissions
      const moderator = await prisma.communityModerator.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: id
          }
        }
      })

      if (moderator) {
        const permissions = JSON.parse(moderator.permissions || '[]')
        hasPermission = permissions.includes('ALL') || permissions.includes('EDIT_COMMUNITY')
      }
    }

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this community' },
        { status: 403 }
      )
    }

    // Prepare update data
    const allowedFields = [
      'displayName', 'description', 'avatar', 'banner', 'category',
      'tags', 'visibility', 'rules', 'isTokenGated', 'tokenGateType',
      'tokenContractAddress', 'tokenMinAmount', 'tokenIds', 'tokenSymbol'
    ]

    const sanitizedUpdateData: any = {}

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        if (field === 'tags' || field === 'tokenIds') {
          sanitizedUpdateData[field] = JSON.stringify(updateData[field])
        } else {
          sanitizedUpdateData[field] = updateData[field]
        }
      }
    }

    // SECURITY: Validate avatar and banner URLs to prevent XSS
    if (sanitizedUpdateData.avatar) {
      const sanitized = sanitizeUrl(sanitizedUpdateData.avatar)
      if (!sanitized) {
        return NextResponse.json(
          { error: 'Invalid avatar URL. Must be a valid http/https URL.' },
          { status: 400 }
        )
      }
      sanitizedUpdateData.avatar = sanitized
    }

    if (sanitizedUpdateData.banner) {
      const sanitized = sanitizeUrl(sanitizedUpdateData.banner)
      if (!sanitized) {
        return NextResponse.json(
          { error: 'Invalid banner URL. Must be a valid http/https URL.' },
          { status: 400 }
        )
      }
      sanitizedUpdateData.banner = sanitized
    }

    // Cannot change name after creation
    if (updateData.name && updateData.name !== community.name) {
      return NextResponse.json(
        { error: 'Community name cannot be changed after creation' },
        { status: 400 }
      )
    }

    const updatedCommunity = await prisma.community.update({
      where: { id },
      data: {
        ...sanitizedUpdateData,
        updatedAt: new Date()
      }
    })


    const formattedCommunity = {
      id: updatedCommunity.id,
      name: updatedCommunity.name,
      displayName: updatedCommunity.displayName,
      description: updatedCommunity.description,
      avatar: updatedCommunity.avatar,
      banner: updatedCommunity.banner,
      category: updatedCommunity.category,
      tags: JSON.parse(updatedCommunity.tags || '[]'),
      visibility: updatedCommunity.visibility,
      rules: updatedCommunity.rules,
      isOfficial: updatedCommunity.isOfficial,
      creatorId: updatedCommunity.creatorId,
      tokenGating: {
        isTokenGated: updatedCommunity.isTokenGated,
        tokenGateType: updatedCommunity.tokenGateType,
        tokenContractAddress: updatedCommunity.tokenContractAddress,
        tokenMinAmount: updatedCommunity.tokenMinAmount,
        tokenIds: JSON.parse(updatedCommunity.tokenIds || '[]'),
        tokenSymbol: updatedCommunity.tokenSymbol
      },
      stats: {
        membersCount: updatedCommunity.membersCount,
        postsCount: updatedCommunity.postsCount
      },
      createdAt: updatedCommunity.createdAt,
      updatedAt: updatedCommunity.updatedAt
    }

    return NextResponse.json({
      success: true,
      community: formattedCommunity
    })

  } catch (error: any) {
    console.error('[Communities] PUT error:', error)
    return NextResponse.json(
      { error: 'Failed to update community', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    

    // Check if community exists
    const community = await prisma.community.findUnique({
      where: { id },
      select: {
        id: true,
        creatorId: true,
        name: true,
        displayName: true
      }
    })

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to delete (creator or admin only)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isAdmin: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (!user.isAdmin && community.creatorId !== userId) {
      return NextResponse.json(
        { error: 'Only the community creator or admin can delete this community' },
        { status: 403 }
      )
    }

    // Delete the community (cascade will handle related records)
    await prisma.community.delete({
      where: { id }
    })


    return NextResponse.json({
      success: true,
      content: `Community "${community.displayName}" deleted successfully`
    })

  } catch (error: any) {
    console.error('[Communities] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete community', details: error.message },
      { status: 500 }
    )
  }
}