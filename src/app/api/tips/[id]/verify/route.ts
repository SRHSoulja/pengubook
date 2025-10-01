import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { withAdminAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Verify and complete a tip transaction (admin only)
export const POST = withRateLimit(20, 60 * 1000)(withAdminAuth(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const { id: tipId } = params
    const body = await request.json()
    const { status, blockNumber, gasUsed, blockTimestamp } = body

    if (!status || !['COMPLETED', 'FAILED', 'CANCELLED'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be COMPLETED, FAILED, or CANCELLED' },
        { status: 400 }
      )
    }

    const prisma = new PrismaClient()

    // Find the tip
    const tip = await prisma.tip.findUnique({
      where: { id: tipId },
      include: {
        fromUser: {
          select: {
            id: true,
            displayName: true,
            walletAddress: true
          }
        },
        toUser: {
          select: {
            id: true,
            displayName: true,
            walletAddress: true
          }
        },
        token: {
          select: {
            id: true,
            symbol: true,
            contractAddress: true,
            decimals: true
          }
        }
      }
    })

    if (!tip) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Tip not found' },
        { status: 404 }
      )
    }

    if (tip.status !== 'PENDING') {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'Tip has already been verified' },
        { status: 409 }
      )
    }

    // TODO: In production, verify the transaction on-chain here
    // Example verification steps:
    // 1. Query blockchain for transaction by hash
    // 2. Verify transaction exists and is confirmed
    // 3. Verify from/to addresses match user wallet addresses
    // 4. Verify token contract and amount match
    // 5. Check if transaction is successful

    const updateData: any = {
      status
    }

    // Update tip status
    const updatedTip = await prisma.tip.update({
      where: { id: tipId },
      data: updateData,
      include: {
        fromUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            level: true,
            isAdmin: true
          }
        },
        toUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            level: true,
            isAdmin: true
          }
        },
        token: {
          select: {
            id: true,
            name: true,
            symbol: true,
            contractAddress: true,
            decimals: true,
            logoUrl: true
          }
        }
      }
    })

    if (status === 'FAILED' || status === 'CANCELLED') {
      // Revert tip statistics if transaction failed
      const amountNum = parseFloat(tip.amount)
      await prisma.profile.updateMany({
        where: { userId: tip.toUserId },
        data: {
          tipCount: { decrement: 1 },
          totalTipsReceived: { decrement: amountNum }
        }
      })

      // Update notification
      await prisma.notification.updateMany({
        where: {
          fromUserId: tip.fromUserId,
          toUserId: tip.toUserId,
          type: 'TIP'
        },
        data: {
          title: 'Tip Failed',
          content: `Tip of ${tip.amount} ${tip.token.symbol} could not be processed`
        }
      })
    } else if (status === 'COMPLETED') {
      // Update notification for successful tip
      await prisma.notification.updateMany({
        where: {
          fromUserId: tip.fromUserId,
          toUserId: tip.toUserId,
          type: 'TIP'
        },
        data: {
          title: 'Tip Confirmed',
          content: `${tip.fromUser.displayName} sent you ${tip.amount} ${tip.token.symbol}${tip.message ? `: "${tip.message}"` : ''} - Transaction confirmed!`
        }
      })
    }

    await prisma.$disconnect()

    logger.info(`Tip ${status.toLowerCase()}`, {
      tipId: updatedTip.id,
      from: tip.fromUser.id.slice(0, 8) + '...',
      to: tip.toUser.id.slice(0, 8) + '...',
      amount: tip.amount,
      token: tip.token.symbol,
      txHash: tip.transactionHash.slice(0, 10) + '...',
      verifiedBy: user.id
    }, 'TipVerification')

    return NextResponse.json({
      success: true,
      tip: {
        id: updatedTip.id,
        amount: updatedTip.amount,
        transactionHash: updatedTip.transactionHash,
        message: updatedTip.message,
        isPublic: updatedTip.isPublic,
        status: updatedTip.status,
        createdAt: updatedTip.createdAt,
        updatedAt: updatedTip.updatedAt,
        fromUser: updatedTip.fromUser,
        toUser: updatedTip.toUser,
        token: updatedTip.token
      },
      message: `Tip ${status.toLowerCase()} successfully`
    })

  } catch (error: any) {
    logAPI.error('tips/verify', error)
    return NextResponse.json(
      { error: 'Failed to verify tip', details: error.message },
      { status: 500 }
    )
  }
}))