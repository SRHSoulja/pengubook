import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { checkTokenGateAccess } from '@/lib/blockchain/tokenGating'
import {
  AuthenticationError,
  AuthorizationError
} from '@/lib/auth'
import { rateLimiters, RateLimitError } from '@/lib/rateLimit'

const prisma = new PrismaClient()

// GET - Check if user meets token gate requirements
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    rateLimiters.general(request)

    const walletAddress = request.headers.get('x-wallet-address')
    const { id: communityId } = params

    if (!walletAddress) {
      throw new AuthenticationError('Wallet address is required')
    }

    // Get community token gate info
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: {
        id: true,
        displayName: true,
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
      throw new AuthenticationError('Community not found')
    }

    // If not token gated, user has access
    if (!community.isTokenGated) {
      return NextResponse.json({
        success: true,
        data: {
          hasAccess: true,
          isTokenGated: false,
          message: 'Community is open to all members'
        }
      })
    }

    // Check token gate access
    const tokenAccess = await checkTokenGateAccess(walletAddress, community)

    return NextResponse.json({
      success: true,
      data: {
        hasAccess: tokenAccess.hasAccess,
        isTokenGated: true,
        tokenGateType: community.tokenGateType,
        tokenSymbol: community.tokenSymbol,
        tokenMinAmount: community.tokenMinAmount,
        userBalance: tokenAccess.details?.userBalance,
        ownedTokenIds: tokenAccess.details?.ownedTokenIds,
        error: tokenAccess.error,
        message: tokenAccess.hasAccess
          ? `You meet the token requirements for ${community.displayName}`
          : `You need to hold ${community.tokenSymbol || 'the required tokens'} to access ${community.displayName}`
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

    console.error('Error checking token gate access:', error)
    return NextResponse.json(
      { error: 'Failed to check token gate access' },
      { status: 500 }
    )
  }
}