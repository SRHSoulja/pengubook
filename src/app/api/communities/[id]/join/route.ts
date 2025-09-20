import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import {
  getUserFromBody,
  AuthenticationError,
  AuthorizationError
} from '@/lib/auth'
import { rateLimiters, RateLimitError } from '@/lib/rateLimit'
import { checkTokenGateAccess } from '@/lib/blockchain/tokenGating'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting
    rateLimiters.writeOperations(request)

    const body = await request.json()
    const { id: communityId } = params

    // Validate and get user ID from body
    const userId = await getUserFromBody(body)

    // Check if community exists and get token gate info
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: {
        id: true,
        visibility: true,
        displayName: true,
        creatorId: true,
        isTokenGated: true,
        tokenGateType: true,
        tokenContractAddress: true,
        tokenMinAmount: true,
        tokenIds: true,
        tokenSymbol: true,
        tokenDecimals: true
      }
    })

    if (!community) {
      throw new AuthenticationError("Community not found")
    }

    // Prevent joining private communities without invitation
    if (community.visibility === 'PRIVATE') {
      throw new AuthorizationError("This community is private and requires an invitation")
    }

    // Prevent creators from joining their own community (they're already owners)
    if (community.creatorId === userId) {
      throw new AuthenticationError("You cannot join your own community - you are already the owner")
    }

    // Check if user is already a member
    const existingMembership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId
        }
      }
    })

    if (existingMembership) {
      throw new AuthenticationError("You are already a member of this community")
    }

    // Verify user exists and is not banned
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isBanned: true, displayName: true, walletAddress: true }
    })

    if (!user) {
      throw new AuthenticationError("User not found")
    }

    if (user.isBanned) {
      throw new AuthorizationError("Banned users cannot join communities")
    }

    // Check token gate requirements
    if (community.isTokenGated) {
      const tokenAccess = await checkTokenGateAccess(user.walletAddress, community)

      if (!tokenAccess.hasAccess) {
        throw new AuthorizationError(
          tokenAccess.error ||
          `You need to hold ${community.tokenSymbol || 'the required tokens'} to join this community`
        )
      }
    }

    // Add user as a member using a transaction to ensure consistency
    await prisma.$transaction(async (tx) => {
      await tx.communityMember.create({
        data: {
          userId,
          communityId,
          role: 'MEMBER'
        }
      })

      // Update the community's member count
      await tx.community.update({
        where: { id: communityId },
        data: {
          membersCount: {
            increment: 1
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: `Successfully joined ${community.displayName}! Welcome to the penguin colony!`
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

    console.error("Error joining community:", error)
    return NextResponse.json(
      { error: "Failed to join community" },
      { status: 500 }
    )
  }
}
