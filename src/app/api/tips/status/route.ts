import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(request: NextRequest) {
  try {
    const { transactionHash, status } = await request.json()

    if (!transactionHash || !status) {
      return NextResponse.json(
        { error: 'Transaction hash and status are required' },
        { status: 400 }
      )
    }

    // Validate status
    const validStatuses = ['PENDING', 'COMPLETED', 'CANCELED', 'FAILED']
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      )
    }

    // Find the tip by transaction hash
    const existingTip = await prisma.tip.findUnique({
      where: { transactionHash },
      include: {
        fromUser: { include: { profile: true } },
        toUser: { include: { profile: true } }
      }
    })

    if (!existingTip) {
      return NextResponse.json(
        { error: 'Tip not found' },
        { status: 404 }
      )
    }

    const oldStatus = existingTip.status
    const amountValue = parseFloat(existingTip.amount)

    // Update tip status
    const updatedTip = await prisma.tip.update({
      where: { transactionHash },
      data: { status }
    })

    // Handle profile stats updates based on status change
    if (oldStatus !== status) {
      if (oldStatus === 'COMPLETED' && (status === 'CANCELED' || status === 'FAILED')) {
        // Tip was completed but now canceled/failed - decrement counters
        await Promise.all([
          // Decrement sender's stats
          prisma.profile.update({
            where: { userId: existingTip.fromUserId },
            data: {
              tipCount: { decrement: 1 }
            }
          }),
          // Decrement recipient's stats
          prisma.profile.update({
            where: { userId: existingTip.toUserId },
            data: {
              totalTipsReceived: { decrement: amountValue }
            }
          })
        ])
      } else if ((oldStatus === 'PENDING' || oldStatus === 'CANCELED' || oldStatus === 'FAILED') && status === 'COMPLETED') {
        // Tip is now completed - increment counters
        await Promise.all([
          // Increment sender's stats
          prisma.profile.update({
            where: { userId: existingTip.fromUserId },
            data: {
              tipCount: { increment: 1 }
            }
          }),
          // Increment recipient's stats
          prisma.profile.update({
            where: { userId: existingTip.toUserId },
            data: {
              totalTipsReceived: { increment: amountValue }
            }
          })
        ])
      }
    }

    console.log('Tip status updated:', {
      transactionHash,
      oldStatus,
      newStatus: status,
      from: existingTip.fromUser.displayName,
      to: existingTip.toUser.displayName,
      amount: existingTip.amount
    })

    return NextResponse.json({
      success: true,
      tip: updatedTip,
      message: `Tip status updated to ${status.toLowerCase()}`
    })

  } catch (error) {
    console.error('Failed to update tip status:', error)
    return NextResponse.json(
      { error: 'Failed to update tip status' },
      { status: 500 }
    )
  }
}