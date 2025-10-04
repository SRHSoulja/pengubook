import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'
import { validate } from '@/lib/validation'
import { ErrorResponses, sanitizeError } from '@/lib/error-response'

export const dynamic = 'force-dynamic'

// Get tips for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const type = searchParams.get('type') || 'received' // 'sent', 'received', 'all'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    logAPI.request('tips', { userId: userId.slice(0, 8) + '...', type, limit })

    

    let whereClause: any = {
      status: 'COMPLETED' // Only show completed tips
    }

    if (type === 'sent') {
      whereClause.fromUserId = userId
    } else if (type === 'received') {
      whereClause.toUserId = userId
    } else if (type === 'all') {
      whereClause.OR = [
        { fromUserId: userId },
        { toUserId: userId }
      ]
    }

    const tips = await prisma.tip.findMany({
      where: whereClause,
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
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })


    const formattedTips = tips.map(tip => ({
      id: tip.id,
      amount: tip.amount,
      transactionHash: tip.transactionHash,
      message: tip.message,
      isPublic: tip.isPublic,
      createdAt: tip.createdAt,
      fromUser: tip.fromUser,
      toUser: tip.toUser,
      token: tip.token
    }))

    return NextResponse.json({
      success: true,
      tips: formattedTips,
      type,
      pagination: {
        limit,
        offset,
        hasMore: tips.length === limit
      }
    })

  } catch (error: any) {
    logAPI.error('tips', error)
    // SECURITY: Sanitize error response in production
    return ErrorResponses.internalError(sanitizeError(error))
  }
}

// Create a new tip
export const POST = withRateLimit(10, 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { toUserId, tokenId, amount, message, isPublic = true, transactionHash } = body

    // Validate input
    const validation = validate((v) => ({
      toUserId: v.string(toUserId, 'toUserId', { required: true }),
      tokenId: v.string(tokenId, 'tokenId', { required: true }),
      amount: v.string(amount, 'amount', { required: true }),
      message: v.string(message, 'message', { maxLength: 500 }),
      isPublic: v.boolean(isPublic, 'isPublic') ?? true,
      transactionHash: v.string(transactionHash, 'transactionHash', { required: true })
    }))

    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const { toUserId: validToUserId, tokenId: validTokenId, amount: validAmount,
            message: validMessage, isPublic: validIsPublic, transactionHash: validTxHash } = validation.sanitizedData

    // Self-tipping check
    if (user.id === validToUserId) {
      return NextResponse.json(
        { error: 'Users cannot tip themselves' },
        { status: 400 }
      )
    }

    // Validate transaction hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(validTxHash)) {
      return NextResponse.json(
        { error: 'Invalid transaction hash format' },
        { status: 400 }
      )
    }

    // Validate amount (must be positive number)
    const amountNum = parseFloat(validAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      )
    }

    

    // Check if transaction hash already exists
    const existingTip = await prisma.tip.findUnique({
      where: { transactionHash: validTxHash }
    })

    if (existingTip) {
      return NextResponse.json(
        { error: 'Transaction hash already used' },
        { status: 409 }
      )
    }

    // Verify recipient exists and is not banned
    const recipient = await prisma.user.findUnique({
      where: { id: validToUserId },
      select: { id: true, isBanned: true, displayName: true }
    })

    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient user not found' },
        { status: 404 }
      )
    }

    if (recipient.isBanned) {
      return NextResponse.json(
        { error: 'Cannot tip banned users' },
        { status: 403 }
      )
    }

    // Verify token exists and is enabled
    const token = await prisma.token.findUnique({
      where: { id: validTokenId },
      select: { id: true, isEnabled: true, symbol: true, decimals: true }
    })

    if (!token) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      )
    }

    if (!token.isEnabled) {
      return NextResponse.json(
        { error: 'Token is not enabled for tipping' },
        { status: 403 }
      )
    }

    // === CRITICAL SECURITY: Verify transaction on-chain BEFORE recording ===
    // Get sender's wallet address
    const senderUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { walletAddress: true }
    })

    if (!senderUser?.walletAddress) {
      return NextResponse.json(
        { error: 'Sender wallet address not found. Please reconnect your wallet.' },
        { status: 400 }
      )
    }

    // Get recipient's wallet address
    const recipientUser = await prisma.user.findUnique({
      where: { id: validToUserId },
      select: { walletAddress: true }
    })

    if (!recipientUser?.walletAddress) {
      return NextResponse.json(
        { error: 'Recipient wallet address not found' },
        { status: 400 }
      )
    }

    // Import verification utility
    const { verifyTransaction } = await import('@/lib/utils/transaction-verification')

    // Verify transaction exists and succeeded on-chain
    const txVerification = await verifyTransaction(validTxHash, 1)

    if (!txVerification.exists) {
      return NextResponse.json(
        { error: 'Transaction not found on blockchain. Please ensure the transaction is confirmed.' },
        { status: 404 }
      )
    }

    if (!txVerification.confirmed) {
      return NextResponse.json(
        { error: 'Transaction not yet confirmed. Please wait for confirmation and try again.' },
        { status: 425 } // Too Early status code
      )
    }

    if (!txVerification.success) {
      return NextResponse.json(
        { error: 'Transaction failed on blockchain', details: txVerification.error },
        { status: 400 }
      )
    }

    // Verify sender matches authenticated user's wallet
    if (txVerification.from?.toLowerCase() !== senderUser.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Transaction sender does not match your wallet address' },
        { status: 403 }
      )
    }

    // Verify recipient matches target user's wallet
    if (txVerification.to?.toLowerCase() !== recipientUser.walletAddress.toLowerCase()) {
      return NextResponse.json(
        { error: 'Transaction recipient does not match target user wallet' },
        { status: 403 }
      )
    }

    // Create tip with COMPLETED status (already verified on-chain)
    const newTip = await prisma.tip.create({
      data: {
        fromUserId: user.id,
        toUserId: validToUserId,
        tokenId: validTokenId,
        amount: validAmount,
        transactionHash: validTxHash,
        message: validMessage || null,
        isPublic: validIsPublic,
        status: 'COMPLETED' // Already verified on-chain
      },
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

    // Update recipient's tip statistics
    await prisma.profile.upsert({
      where: { userId: validToUserId },
      update: {
        tipCount: { increment: 1 },
        totalTipsReceived: { increment: amountNum }
      },
      create: {
        userId: validToUserId,
        tipCount: 1,
        totalTipsReceived: amountNum
      }
    })

    // Create notification for recipient
    await prisma.notification.create({
      data: {
        fromUserId: user.id,
        toUserId: validToUserId,
        type: 'TIP',
        title: 'New Tip Received',
        content: `${user.displayName} sent you ${validAmount} ${token.symbol}${validMessage ? `: "${validMessage}"` : ''}`
      }
    })


    logger.info('Tip created', {
      tipId: newTip.id,
      from: user.id.slice(0, 8) + '...',
      to: validToUserId.slice(0, 8) + '...',
      amount: validAmount,
      token: token.symbol,
      txHash: validTxHash.slice(0, 10) + '...'
    }, 'Tipping')

    return NextResponse.json({
      success: true,
      tip: {
        id: newTip.id,
        amount: newTip.amount,
        transactionHash: newTip.transactionHash,
        message: newTip.message,
        isPublic: newTip.isPublic,
        status: newTip.status,
        createdAt: newTip.createdAt,
        fromUser: newTip.fromUser,
        toUser: newTip.toUser,
        token: newTip.token
      },
      content: 'Tip created successfully. Transaction verification in progress.'
    }, { status: 201 })

  } catch (error: any) {
    logAPI.error('tips', error)
    // SECURITY: Sanitize error response in production
    return ErrorResponses.internalError(sanitizeError(error))
  }
}))