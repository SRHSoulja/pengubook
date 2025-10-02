import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MOD_PERMISSIONS, PERMISSION_PRESETS } from '@/lib/mod-permissions'

export const dynamic = 'force-dynamic'

// Get all moderators for a community
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const communityId = params.id

    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: {
        id: true,
        creatorId: true,
        moderators: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
              }
            }
          },
          orderBy: {
            assignedAt: 'desc'
          }
        }
      }
    })

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      )
    }

    // Format moderators with parsed permissions
    const moderators = community.moderators.map(mod => ({
      id: mod.id,
      userId: mod.userId,
      user: mod.user,
      permissions: JSON.parse(mod.permissions),
      assignedBy: mod.assignedBy,
      assignedAt: mod.assignedAt,
    }))

    return NextResponse.json({
      success: true,
      moderators,
      creatorId: community.creatorId
    })

  } catch (error: any) {
    console.error('Error fetching moderators:', error)
    return NextResponse.json(
      { error: 'Failed to fetch moderators', details: error.message },
      { status: 500 }
    )
  }
}

// Add or update a moderator
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const communityId = params.id
    const userId = request.headers.get('x-user-id')
    const { targetUserId, permissions, preset } = await request.json()

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get community and check permissions
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        moderators: true
      }
    })

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      )
    }

    // Only creator or mods with MANAGE_MODERATORS can add mods
    const isCreator = community.creatorId === userId
    const currentMod = community.moderators.find(mod => mod.userId === userId)
    const currentPermissions = currentMod ? JSON.parse(currentMod.permissions) : []
    const canManageMods = isCreator || currentPermissions.includes(MOD_PERMISSIONS.MANAGE_MODERATORS)

    if (!canManageMods) {
      return NextResponse.json(
        { error: 'You do not have permission to manage moderators' },
        { status: 403 }
      )
    }

    // Check if target user is a member
    const membership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'User must be a member of the community first' },
        { status: 400 }
      )
    }

    // Determine final permissions
    let finalPermissions = permissions || []
    if (preset && PERMISSION_PRESETS[preset as keyof typeof PERMISSION_PRESETS]) {
      finalPermissions = PERMISSION_PRESETS[preset as keyof typeof PERMISSION_PRESETS]
    }

    // Create or update moderator
    const moderator = await prisma.communityModerator.upsert({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId
        }
      },
      update: {
        permissions: JSON.stringify(finalPermissions),
        assignedBy: userId,
      },
      create: {
        userId: targetUserId,
        communityId,
        permissions: JSON.stringify(finalPermissions),
        assignedBy: userId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          }
        }
      }
    })

    // Update member role to MODERATOR
    await prisma.communityMember.update({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId
        }
      },
      data: {
        role: 'MODERATOR'
      }
    })

    return NextResponse.json({
      success: true,
      moderator: {
        ...moderator,
        permissions: JSON.parse(moderator.permissions)
      }
    })

  } catch (error: any) {
    console.error('Error adding moderator:', error)
    return NextResponse.json(
      { error: 'Failed to add moderator', details: error.message },
      { status: 500 }
    )
  }
}

// Remove a moderator
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const communityId = params.id
    const userId = request.headers.get('x-user-id')
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'Target user ID required' },
        { status: 400 }
      )
    }

    // Get community and check permissions
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        moderators: true
      }
    })

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      )
    }

    // Only creator or self can remove moderator
    const isCreator = community.creatorId === userId
    const isSelf = userId === targetUserId

    if (!isCreator && !isSelf) {
      return NextResponse.json(
        { error: 'Only the creator can remove other moderators' },
        { status: 403 }
      )
    }

    // Delete moderator record
    await prisma.communityModerator.delete({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId
        }
      }
    })

    // Update member role back to MEMBER
    await prisma.communityMember.update({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId
        }
      },
      data: {
        role: 'MEMBER'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Moderator removed successfully'
    })

  } catch (error: any) {
    console.error('Error removing moderator:', error)
    return NextResponse.json(
      { error: 'Failed to remove moderator', details: error.message },
      { status: 500 }
    )
  }
}
