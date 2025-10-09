import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'
import { verifyTipTransaction } from '@/lib/utils/transaction-verification'

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
      return NextResponse.json(
        { error: 'Tip not found' },
        { status: 404 }
      )
    }

    if (tip.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Tip has already been verified' },
        { status: 409 }
      )
    }

    // Verify transaction on-chain
    if (!tip.fromUser.walletAddress || !tip.toUser.walletAddress) {
      return NextResponse.json(
        { error: 'Sender or recipient missing wallet address' },
        { status: 400 }
      )
    }

    logger.info('Verifying tip transaction on-chain', {
      tipId: tip.id,
      txHash: tip.transactionHash.slice(0, 10) + '...',
      from: tip.fromUser.walletAddress.slice(0, 10) + '...',
      to: tip.toUser.walletAddress.slice(0, 10) + '...'
    }, 'TipVerification')

    const verificationResult = await verifyTipTransaction(
      tip.transactionHash,
      tip.fromUser.walletAddress,
      tip.toUser.walletAddress
    )

    // Check verification result
    if (!verificationResult.exists) {
      logger.warn('Transaction not found on-chain', {
        tipId: tip.id,
        txHash: tip.transactionHash,
        error: verificationResult.error
      }, 'TipVerification')

      return NextResponse.json(
        { error: 'Transaction not found on blockchain', details: verificationResult.error },
        { status: 404 }
      )
    }

    if (!verificationResult.confirmed) {
      return NextResponse.json(
        { error: 'Transaction not yet confirmed', details: 'Please wait for blockchain confirmation' },
        { status: 425 } // Too Early
      )
    }

    if (!verificationResult.success) {
      logger.warn('Transaction failed on-chain', {
        tipId: tip.id,
        txHash: tip.transactionHash,
        error: verificationResult.error
      }, 'TipVerification')

      // Auto-mark as FAILED
      const updateData: any = {
        status: 'FAILED'
      }

      await prisma.tip.update({
        where: { id: tipId },
        data: updateData
      })

      return NextResponse.json(
        { error: 'Transaction failed on blockchain', details: verificationResult.error },
        { status: 400 }
      )
    }

    // Transaction verified successfully!
    const updateData: any = {
      status: status === 'COMPLETED' ? 'COMPLETED' : status
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
        fromUser: updatedTip.fromUser,
        toUser: updatedTip.toUser,
        token: updatedTip.token
      },
      content: `Tip ${status.toLowerCase()} successfully`
    })

  } catch (error: any) {
    logAPI.error('tips/verify', error)
    return NextResponse.json(
      { error: 'Failed to verify tip', details: error.message },
      { status: 500 }
    )
  }
}))