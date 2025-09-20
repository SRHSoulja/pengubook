import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import {
  getUserFromBody,
  validateInput,
  validateArrayInput,
  AuthenticationError,
  AuthorizationError
} from '@/lib/auth'
import { authenticateUserSecure } from '@/lib/auth/secure'
import { rateLimiters, RateLimitError } from '@/lib/rateLimit'

const prisma = new PrismaClient()

// POST - Create a new group conversation
export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    rateLimiters.writeOperations(request)

    const body = await request.json()

    const currentUser = await authenticateUserSecure(request)

    if (currentUser.isBanned) {
      throw new AuthorizationError('Banned users cannot create groups')
    }

    // Validate and sanitize inputs
    const groupName = validateInput(body.groupName, 'Group name', 100)
    const groupDescription = body.groupDescription ?
      validateInput(body.groupDescription, 'Group description', 500) : null
    const groupAvatar = body.groupAvatar ?
      validateInput(body.groupAvatar, 'Group avatar URL', 500) : null

    // Validate participant IDs
    if (!body.participantIds || !Array.isArray(body.participantIds)) {
      throw new AuthenticationError('Participant IDs are required and must be an array')
    }

    const participantIds = validateArrayInput(body.participantIds, 'Participant IDs', 50)

    // Ensure current user is included in participants
    const allParticipants = Array.from(new Set([currentUser.id, ...participantIds]))

    // Validate minimum participants for group (at least 3 including creator)
    if (allParticipants.length < 3) {
      throw new AuthenticationError('Group conversations require at least 3 participants')
    }

    // Verify all participants exist and are not banned
    const participants = await prisma.user.findMany({
      where: {
        id: { in: allParticipants },
        isBanned: false
      },
      select: { id: true, username: true, displayName: true }
    })

    if (participants.length !== allParticipants.length) {
      throw new AuthenticationError('Some participants not found or are banned')
    }

    // Create group conversation
    const conversation = await prisma.conversation.create({
      data: {
        isGroup: true,
        groupName,
        groupDescription,
        groupAvatar,
        createdBy: currentUser.id,
        participants: JSON.stringify(allParticipants),
        adminIds: JSON.stringify([currentUser.id]) // Creator is the initial admin
      }
    })

    // Get participant details for response
    const participantDetails = await prisma.user.findMany({
      where: { id: { in: allParticipants } },
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
        participants: participantDetails,
        adminIds: JSON.parse(conversation.adminIds)
      },
      message: 'Group conversation created successfully!'
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

    console.error('Error creating group conversation:', error)
    return NextResponse.json(
      { error: 'Failed to create group conversation' },
      { status: 500 }
    )
  }
}