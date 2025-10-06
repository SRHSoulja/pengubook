import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkTokenGateAccess } from '@/lib/blockchain/tokenGating'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: communityId } = params
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    

    // Check if community exists
    const community = await prisma.community.findUnique({
      where: { id: communityId },
      select: {
        id: true,
        name: true,
        displayName: true,
        visibility: true,
        isTokenGated: true,
        tokenGateType: true,
        tokenContractAddress: true,
        tokenMinAmount: true,
        tokenIds: true,
        tokenSymbol: true,
        tokenDecimals: true,
        creatorId: true
      }
    })

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      )
    }

    // Check if user exists and is not banned
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        isBanned: true,
        displayName: true,
        walletAddress: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.isBanned) {
      return NextResponse.json(
        { error: 'Banned users cannot join communities' },
        { status: 403 }
      )
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
      return NextResponse.json(
        { error: 'User is already a member of this community' },
        { status: 409 }
      )
    }

    // Check community visibility
    if (community.visibility === 'PRIVATE') {
      return NextResponse.json(
        { error: 'This is a private community. You need an invitation to join.' },
        { status: 403 }
      )
    }

    // Token gating check (if enabled)
    if (community.isTokenGated) {
      if (!user.walletAddress) {
        return NextResponse.json(
          {
            error: 'Wallet connection required',
            details: 'This is a token-gated community. You must connect your wallet to join.'
          },
          { status: 403 }
        )
      }

      console.log('[Community Join] Verifying token ownership:', {
        userId,
        communityId,
        tokenGateType: community.tokenGateType,
        tokenContractAddress: community.tokenContractAddress,
        tokenMinAmount: community.tokenMinAmount,
        walletAddress: user.walletAddress
      })

      const tokenCheck = await checkTokenGateAccess(user.walletAddress, {
        isTokenGated: community.isTokenGated,
        tokenGateType: community.tokenGateType,
        tokenContractAddress: community.tokenContractAddress,
        tokenMinAmount: community.tokenMinAmount,
        tokenIds: community.tokenIds,
        tokenDecimals: community.tokenDecimals
      })

      if (!tokenCheck.hasAccess) {
        const errorMessage = tokenCheck.error || 'You do not own the required tokens to join this community'
        const requiredTokenInfo = community.tokenSymbol
          ? `Requires: ${community.tokenMinAmount || '1'} ${community.tokenSymbol}`
          : 'Token requirements not met'

        return NextResponse.json(
          {
            error: errorMessage,
            details: requiredTokenInfo,
            tokenCheck: tokenCheck.details
          },
          { status: 403 }
        )
      }

      console.log('[Community Join] Token verification passed:', {
        userId,
        communityId,
        userBalance: tokenCheck.details?.userBalance,
        ownedTokenIds: tokenCheck.details?.ownedTokenIds
      })
    }

    // Create membership
    const membership = await prisma.communityMember.create({
      data: {
        userId,
        communityId,
        role: 'MEMBER'
      },
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
        },
        community: {
          select: {
            id: true,
            name: true,
            displayName: true,
            avatar: true
          }
        }
      }
    })

    // Update community member count
    await prisma.community.update({
      where: { id: communityId },
      data: {
        membersCount: {
          increment: 1
        }
      }
    })

    // Create notification for community creator (if not self-joining)
    if (community.creatorId !== userId) {
      await prisma.notification.create({
        data: {
          fromUserId: userId,
          toUserId: community.creatorId,
          type: 'COMMUNITY_JOIN',
          title: 'New Community Member',
          content: `${user.displayName} joined your community "${community.displayName}"`
        }
      })
    }


    return NextResponse.json({
      success: true,
      membership: {
        id: membership.id,
        role: membership.role,
        joinedAt: membership.joinedAt,
        user: membership.user,
        community: membership.community
      },
      content: `Successfully joined "${community.displayName}"`
    }, { status: 201 })

  } catch (error: any) {
    console.error('[Community Join] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to join community', details: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: communityId } = params
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
      where: { id: communityId },
      select: {
        id: true,
        name: true,
        displayName: true,
        creatorId: true
      }
    })

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      )
    }

    // Check if user is a member
    const membership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId
        }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'User is not a member of this community' },
        { status: 404 }
      )
    }

    // Prevent community creator from leaving their own community
    if (community.creatorId === userId) {
      return NextResponse.json(
        { error: 'Community creators cannot leave their own community. Transfer ownership or delete the community instead.' },
        { status: 403 }
      )
    }

    // Remove membership
    await prisma.communityMember.delete({
      where: {
        userId_communityId: {
          userId,
          communityId
        }
      }
    })

    // Remove moderator status if user was a moderator
    await prisma.communityModerator.deleteMany({
      where: {
        userId,
        communityId
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


    return NextResponse.json({
      success: true,
      content: `Successfully left "${community.displayName}"`
    })

  } catch (error: any) {
    console.error('[Community Leave] DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to leave community', details: error.message },
      { status: 500 }
    )
  }
}