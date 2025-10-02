import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MOD_PERMISSIONS, canModerate } from '@/lib/mod-permissions'

export const dynamic = 'force-dynamic'

// Update a member's custom title
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const communityId = params.id
    const targetUserId = params.userId
    const currentUserId = request.headers.get('x-user-id')
    const { customTitle } = await request.json()

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get community with moderators
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        moderators: {
          select: {
            userId: true,
            permissions: true,
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

    // Check if user has permission to manage roles
    const modStatus = canModerate(currentUserId, community.creatorId, community.moderators)

    if (!modStatus.isMod || !modStatus.permissions.includes(MOD_PERMISSIONS.MANAGE_ROLES)) {
      return NextResponse.json(
        { error: 'You do not have permission to manage member roles' },
        { status: 403 }
      )
    }

    // Validate custom title length
    if (customTitle && customTitle.length > 50) {
      return NextResponse.json(
        { error: 'Custom title cannot exceed 50 characters' },
        { status: 400 }
      )
    }

    // Update member's custom title
    const updatedMember = await prisma.communityMember.update({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId
        }
      },
      data: {
        customTitle: customTitle || null
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

    return NextResponse.json({
      success: true,
      member: updatedMember
    })

  } catch (error: any) {
    console.error('Error updating member title:', error)
    return NextResponse.json(
      { error: 'Failed to update member title', details: error.message },
      { status: 500 }
    )
  }
}

// Remove a member's custom title
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const communityId = params.id
    const targetUserId = params.userId
    const currentUserId = request.headers.get('x-user-id')

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get community with moderators
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      include: {
        moderators: {
          select: {
            userId: true,
            permissions: true,
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

    // Check permissions
    const modStatus = canModerate(currentUserId, community.creatorId, community.moderators)

    if (!modStatus.isMod || !modStatus.permissions.includes(MOD_PERMISSIONS.MANAGE_ROLES)) {
      return NextResponse.json(
        { error: 'You do not have permission to manage member roles' },
        { status: 403 }
      )
    }

    // Remove custom title
    await prisma.communityMember.update({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId
        }
      },
      data: {
        customTitle: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Custom title removed successfully'
    })

  } catch (error: any) {
    console.error('Error removing member title:', error)
    return NextResponse.json(
      { error: 'Failed to remove member title', details: error.message },
      { status: 500 }
    )
  }
}
