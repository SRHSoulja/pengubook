import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import {
  validateInput,
  validateArrayInput,
  AuthenticationError,
  AuthorizationError
} from '@/lib/auth'
import { authenticateUserSecure } from '@/lib/auth/secure'
import { rateLimiters, RateLimitError } from '@/lib/rateLimit'

const prisma = new PrismaClient()

// GET - Get group conversation details
export async function GET(
  request: NextRequest,
  { params }: { params: { groupId: string } }
) {
  try {
    rateLimiters.general(request)

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

    const participantIds = JSON.parse(conversation.participants)
    if (!participantIds.includes(user.id)) {
      throw new AuthorizationError('You are not a member of this group')
    }

    // Get participant details
    const participants = await prisma.user.findMany({
      where: { id: { in: participantIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        ...conversation,
        participants,
        adminIds: JSON.parse(conversation.adminIds)
      }
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

    console.error('Error fetching group details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch group details' },
      { status: 500 }
    )
  }
}

// PUT - Update group conversation
export async function PUT(
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
    const participantIds = JSON.parse(conversation.participants)

    if (!participantIds.includes(user.id)) {
      throw new AuthorizationError('You are not a member of this group')
    }

    if (!adminIds.includes(user.id)) {
      throw new AuthorizationError('Only group admins can update group details')
    }

    // Validate and update fields
    const updateData: any = {}

    if (body.groupName !== undefined) {
      updateData.groupName = validateInput(body.groupName, 'Group name', 100)
    }

    if (body.groupDescription !== undefined) {
      updateData.groupDescription = body.groupDescription ?
        validateInput(body.groupDescription, 'Group description', 500) : null
    }

    if (body.groupAvatar !== undefined) {
      updateData.groupAvatar = body.groupAvatar ?
        validateInput(body.groupAvatar, 'Group avatar URL', 500) : null
    }

    const updatedConversation = await prisma.conversation.update({
      where: { id: params.groupId },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: {
        ...updatedConversation,
        adminIds: JSON.parse(updatedConversation.adminIds)
      },
      message: 'Group updated successfully!'
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

    console.error('Error updating group:', error)
    return NextResponse.json(
      { error: 'Failed to update group' },
      { status: 500 }
    )
  }
}