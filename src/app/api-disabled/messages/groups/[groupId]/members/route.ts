import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import {
  validateArrayInput,
  AuthenticationError,
  AuthorizationError
} from '@/lib/auth'
import { authenticateUserSecure } from '@/lib/auth/secure'
import { rateLimiters, RateLimitError } from '@/lib/rateLimit'

const prisma = new PrismaClient()

// POST - Add members to group
export async function POST(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    rateLimiters.writeOperations(request)

    const body = await request.json()

    const user = await authenticateUserSecure(request)

    // Get group conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.groupId }
    })

    if (!conversation) {
      throw new AuthenticationError('Group conversation not found')
    }

    if (!conversation.isGroup) {
      throw new AuthenticationError('This is not a group conversation')
    }

    const adminIds = JSON.parse(conversation.adminIds)
    const currentParticipants = JSON.parse(conversation.participants)

    if (!currentParticipants.includes(user.id)) {
      throw new AuthorizationError('You are not a member of this group')
    }

    if (!adminIds.includes(user.id)) {
      throw new AuthorizationError('Only group admins can add members')
    }

    // Validate new member IDs
    if (!body.userIds || !Array.isArray(body.userIds)) {
      throw new AuthenticationError('User IDs are required and must be an array')
    }

    const newUserIds = validateArrayInput(body.userIds, 'User IDs', 20)

    // Verify new users exist and are not banned
    const newUsers = await prisma.user.findMany({
      where: {
        id: { in: newUserIds },
        isBanned: false
      },
      select: { id: true, username: true, displayName: true }
    })

    if (newUsers.length !== newUserIds.length) {
      throw new AuthenticationError('Some users not found or are banned')
    }

    // Filter out users already in the group
    const usersToAdd = newUserIds.filter(id => !currentParticipants.includes(id))

    if (usersToAdd.length === 0) {
      throw new AuthenticationError('All specified users are already in the group')
    }

    // Check group size limit (max 50 members)
    const newParticipantCount = currentParticipants.length + usersToAdd.length
    if (newParticipantCount > 50) {
      throw new AuthorizationError('Group cannot exceed 50 members')
    }

    // Update conversation with new participants
    const updatedParticipants = [...currentParticipants, ...usersToAdd]
    await prisma.conversation.update({
      where: { id: params.groupId },
      data: {
        participants: JSON.stringify(updatedParticipants)
      }
    })

    // Create system message about added members
    const addedUsernames = newUsers
      .filter(u => usersToAdd.includes(u.id))
      .map(u => u.displayName)
      .join(', ')

    await prisma.message.create({
      data: {
        conversationId: params.groupId,
        senderId: user.id,
        content: `Added ${addedUsernames} to the group`,
        messageType: 'SYSTEM'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        addedUsers: usersToAdd,
        totalMembers: updatedParticipants.length
      },
      message: `Successfully added ${usersToAdd.length} member(s) to the group`
    })
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': error.retryAfter.toString() }
        }
      )
    }

    console.error('Error adding group members:', error)
    return NextResponse.json(
      { error: 'Failed to add group members' },
      { status: 500 }
    )
  }
}

// DELETE - Remove members from group
export async function DELETE(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    rateLimiters.writeOperations(request)

    const body = await request.json()

    const user = await authenticateUserSecure(request)

    // Get group conversation
    const conversation = await prisma.conversation.findUnique({
      where: { id: params.groupId }
    })

    if (!conversation) {
      throw new AuthenticationError('Group conversation not found')
    }

    if (!conversation.isGroup) {
      throw new AuthenticationError('This is not a group conversation')
    }

    const adminIds = JSON.parse(conversation.adminIds)
    const currentParticipants = JSON.parse(conversation.participants)

    if (!currentParticipants.includes(user.id)) {
      throw new AuthorizationError('You are not a member of this group')
    }

    // Validate user IDs to remove
    if (!body.userIds || !Array.isArray(body.userIds)) {
      throw new AuthenticationError('User IDs are required and must be an array')
    }

    const userIdsToRemove = validateArrayInput(body.userIds, 'User IDs', 20)

    // Check permissions: admins can remove anyone, users can only remove themselves
    const canRemoveOthers = adminIds.includes(user.id)
    const removingSelf = userIdsToRemove.length === 1 && userIdsToRemove[0] === user.id

    if (!canRemoveOthers && !removingSelf) {
      throw new AuthorizationError('You can only remove yourself from the group')
    }

    // Prevent removing the group creator unless they're removing themselves
    if (conversation.createdBy && userIdsToRemove.includes(conversation.createdBy) &&
        conversation.createdBy !== user.id) {
      throw new AuthorizationError('Cannot remove the group creator')
    }

    // Filter to only remove existing participants
    const usersToRemove = userIdsToRemove.filter(id => currentParticipants.includes(id))

    if (usersToRemove.length === 0) {
      throw new AuthenticationError('None of the specified users are in the group')
    }

    // Update conversation participants
    const updatedParticipants = currentParticipants.filter((id: string) => !usersToRemove.includes(id))

    // If removing the last member, delete the conversation
    if (updatedParticipants.length === 0) {
      await prisma.conversation.delete({
        where: { id: params.groupId }
      })

      return NextResponse.json({
        success: true,
        message: 'Group conversation deleted as no members remain'
      })
    }

    // Update admin list if any admins were removed
    const updatedAdminIds = adminIds.filter((id: string) => !usersToRemove.includes(id))

    // If no admins remain, make the oldest remaining member an admin
    if (updatedAdminIds.length === 0 && updatedParticipants.length > 0) {
      updatedAdminIds.push(updatedParticipants[0])
    }

    await prisma.conversation.update({
      where: { id: params.groupId },
      data: {
        participants: JSON.stringify(updatedParticipants),
        adminIds: JSON.stringify(updatedAdminIds)
      }
    })

    // Get removed user details for system message
    const removedUsers = await prisma.user.findMany({
      where: { id: { in: usersToRemove } },
      select: { displayName: true }
    })

    const removedUsernames = removedUsers.map(u => u.displayName).join(', ')

    // Create system message about removed members
    await prisma.message.create({
      data: {
        conversationId: params.groupId,
        senderId: user.id,
        content: removingSelf ?
          `${removedUsernames} left the group` :
          `Removed ${removedUsernames} from the group`,
        messageType: 'SYSTEM'
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        removedUsers: usersToRemove,
        totalMembers: updatedParticipants.length
      },
      message: `Successfully removed ${usersToRemove.length} member(s) from the group`
    })
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': error.retryAfter.toString() }
        }
      )
    }

    console.error('Error removing group members:', error)
    return NextResponse.json(
      { error: 'Failed to remove group members' },
      { status: 500 }
    )
  }
}