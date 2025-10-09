import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'
import { checkTokenGateAccess } from '@/lib/blockchain'

export const dynamic = 'force-dynamic'

// Verify token gate access for a community
export const POST = withRateLimit(20, 60 * 1000)(withAuth(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const { id: communityId } = params
    const body = await request.json()
    const { walletAddress } = body

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    logAPI.request('community/verify-access', { communityId, walletAddress: walletAddress.slice(0, 10) + '...' })

    

    // Get community with token gating info
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: {
        id: true,
        name: true,
        displayName: true,
        isTokenGated: true,
        tokenGateType: true,
        tokenContractAddress: true,
        tokenMinAmount: true,
        tokenIds: true,
        tokenSymbol: true,
        visibility: true
      }
    })

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      )
    }

    // If community is not token gated, allow access
    if (!community.isTokenGated) {
      return NextResponse.json({
        success: true,
        hasAccess: true,
        content: 'Community does not require token gating',
        community: {
          id: community.id,
          name: community.name,
          displayName: community.displayName,
          isTokenGated: false
        }
      })
    }

    // Verify user owns this wallet address
    const userWallet = await prisma.user.findUnique({
      where: { id: user.id },
      select: { walletAddress: true }
    })

    if (!userWallet?.walletAddress || userWallet.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Wallet address does not match your account' },
        { status: 403 }
      )
    }

    // Check token gate requirements
    if (!community.tokenContractAddress) {
      return NextResponse.json(
        { error: 'Community token gating is misconfigured' },
        { status: 500 }
      )
    }

    const tokenIds = community.tokenIds ? JSON.parse(community.tokenIds) : []
    const minimumAmount = community.tokenMinAmount || '1'

    try {
      const accessCheck = await checkTokenGateAccess(walletAddress, {
        tokenAddress: community.tokenContractAddress,
        minimumAmount,
        tokenIds: tokenIds.length > 0 ? tokenIds : undefined
      })

      let verificationData: any = {
        hasAccess: accessCheck.hasAccess,
        tokenGateType: community.tokenGateType,
        tokenSymbol: community.tokenSymbol,
        requirements: {
          contractAddress: community.tokenContractAddress,
          minimumAmount: community.tokenMinAmount,
          tokenIds: tokenIds
        }
      }

      if (accessCheck.balance) {
        verificationData.userBalance = accessCheck.balance
      }

      if (accessCheck.ownedTokens) {
        verificationData.ownedTokens = accessCheck.ownedTokens.map(token => ({
          tokenId: token.tokenId,
          metadata: token.metadata
        }))
      }

      // Log access attempt
      logger.info('Token gate access check', {
        communityId,
        userId: user.id.slice(0, 8) + '...',
        walletAddress: walletAddress.slice(0, 10) + '...',
        hasAccess: accessCheck.hasAccess,
        tokenSymbol: community.tokenSymbol
      }, { component: 'TokenGating' })


      return NextResponse.json({
        success: true,
        ...verificationData,
        community: {
          id: community.id,
          name: community.name,
          displayName: community.displayName,
          isTokenGated: true,
          tokenSymbol: community.tokenSymbol
        },
        message: accessCheck.hasAccess
          ? 'Access granted - token requirements met'
          : 'Access denied - token requirements not met'
      })

    } catch (blockchainError: any) {
      logger.error('Blockchain verification failed', { error: blockchainError.message, communityId, walletAddress }, { component: 'TokenGating' })

      return NextResponse.json(
        { error: 'Unable to verify token ownership. Please try again later.', details: blockchainError.message },
        { status: 503 }
      )
    }

  } catch (error: any) {
    logAPI.error('community/verify-access', error)
    return NextResponse.json(
      { error: 'Failed to verify community access', details: error.message },
      { status: 500 }
    )
  }
}))