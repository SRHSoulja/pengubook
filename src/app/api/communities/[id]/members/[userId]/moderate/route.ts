import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { MOD_PERMISSIONS, canModerate } from '@/lib/mod-permissions'

export const dynamic = 'force-dynamic'

// Moderate a member (ban, mute, kick)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
) {
  try {
    const communityId = params.id
    const targetUserId = params.userId
    const currentUserId = request.headers.get('x-user-id')
    const { action, reason, duration } = await request.json()

    // action can be: 'ban', 'mute', 'kick', 'unmute', 'unban'

    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (!['ban', 'mute', 'kick', 'unmute', 'unban'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: ban, mute, kick, unmute, or unban' },
        { status: 400 }
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

    // Check if user has appropriate permissions
    const modStatus = canModerate(currentUserId, community.creatorId, community.moderators)

    if (!modStatus.isMod) {
      return NextResponse.json(
        { error: 'You do not have moderation permissions' },
        { status: 403 }
      )
    }

    // Check specific permissions for the action
    const requiresManageMembers = ['ban', 'kick', 'unban'].includes(action)
    const requiresMutePermission = ['mute', 'unmute'].includes(action)

    if (requiresManageMembers && !modStatus.permissions.includes(MOD_PERMISSIONS.MANAGE_MEMBERS)) {
      return NextResponse.json(
        { error: 'You do not have permission to ban/kick members' },
        { status: 403 }
      )
    }

    if (requiresMutePermission && !modStatus.permissions.includes(MOD_PERMISSIONS.MUTE_MEMBERS)) {
      return NextResponse.json(
        { error: 'You do not have permission to mute members' },
        { status: 403 }
      )
    }

    // Prevent moderation of the creator
    if (targetUserId === community.creatorId) {
      return NextResponse.json(
        { error: 'Cannot moderate the community creator' },
        { status: 403 }
      )
    }

    // Prevent moderating yourself
    if (targetUserId === currentUserId) {
      return NextResponse.json(
        { error: 'Cannot moderate yourself' },
        { status: 403 }
      )
    }

    // Get target member
    const targetMember = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: targetUserId,
          communityId
        }
      }
    })

    if (!targetMember) {
      return NextResponse.json(
        { error: 'Member not found in this community' },
        { status: 404 }
      )
    }

    let result

    switch (action) {
      case 'kick':
        // Remove member from community
        await prisma.communityMember.delete({
          where: {
            userId_communityId: {
              userId: targetUserId,
              communityId
            }
          }
        })

        // Update community member count
        await prisma.community.update({
          where: { id: communityId },
          data: {
            membersCount: {
              decrement: 1
            }
          }
        })

        result = { message: 'Member kicked successfully' }
        break

      case 'ban':
        // Update member status to BANNED
        await prisma.communityMember.update({
          where: {
            userId_communityId: {
              userId: targetUserId,
              communityId
            }
          },
          data: {
            status: 'BANNED'
          }
        })

        result = { message: 'Member banned successfully' }
        break

      case 'unban':
        // Update member status back to ACTIVE
        await prisma.communityMember.update({
          where: {
            userId_communityId: {
              userId: targetUserId,
              communityId
            }
          },
          data: {
            status: 'ACTIVE'
          }
        })

        result = { message: 'Member unbanned successfully' }
        break

      case 'mute':
        // Update member status to MUTED
        await prisma.communityMember.update({
          where: {
            userId_communityId: {
              userId: targetUserId,
              communityId
            }
          },
          data: {
            status: 'MUTED'
          }
        })

        result = {
          message: 'Member muted successfully',
          duration: duration || 'indefinite'
        }
        break

      case 'unmute':
        // Update member status back to ACTIVE
        await prisma.communityMember.update({
          where: {
            userId_communityId: {
              userId: targetUserId,
              communityId
            }
          },
          data: {
            status: 'ACTIVE'
          }
        })

        result = { message: 'Member unmuted successfully' }
        break
    }

    // TODO: Log moderation action to mod logs

    return NextResponse.json({
      success: true,
      action,
      targetUserId,
      moderator: currentUserId,
      reason: reason || null,
      ...result
    })

  } catch (error: any) {
    console.error('Error moderating member:', error)
    return NextResponse.json(
      { error: 'Failed to moderate member', details: error.message },
      { status: 500 }
    )
  }
}
