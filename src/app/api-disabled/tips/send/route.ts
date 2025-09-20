import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { fromAddress, toAddress, amount, tokenSymbol = 'ETH', message, transactionHash, status = 'COMPLETED' } = await request.json()

    if (!fromAddress || !toAddress || !amount || !transactionHash) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Get sender and recipient
    const sender = await prisma.user.findUnique({
      where: { walletAddress: fromAddress }
    })

    const recipient = await prisma.user.findUnique({
      where: { walletAddress: toAddress }
    })

    if (!sender || !recipient) {
      return NextResponse.json(
        { error: 'Sender or recipient not found' },
        { status: 404 }
      )
    }

    // Get the selected token
    const selectedToken = await prisma.token.findUnique({
      where: { symbol: tokenSymbol }
    })

    if (!selectedToken) {
      return NextResponse.json(
        { error: `Token ${tokenSymbol} not found` },
        { status: 400 }
      )
    }

    // Create tip record
    const tip = await prisma.tip.create({
      data: {
        fromUserId: sender.id,
        toUserId: recipient.id,
        tokenId: selectedToken.id,
        amount: amount.toString(),
        transactionHash: transactionHash,
        status: status
      },
      include: {
        fromUser: true,
        toUser: true,
        token: true
      }
    })

    // Only update profile stats if tip is COMPLETED
    if (status === 'COMPLETED') {
      const amountValue = parseFloat(amount)

      // Update sender's profile (tips sent)
      await prisma.profile.update({
        where: { userId: sender.id },
        data: {
          tipCount: { increment: 1 }
        }
      })

      // Update recipient's profile (tips received)
      await prisma.profile.update({
        where: { userId: recipient.id },
        data: {
          totalTipsReceived: { increment: amountValue }
        }
      })
    }

    console.log('Tip recorded:', {
      from: sender.displayName,
      to: recipient.displayName,
      amount: `${amount} ${selectedToken.symbol}`,
      token: selectedToken.name,
      status: status,
      message,
      hash: transactionHash
    })

    return NextResponse.json({
      tip,
      message: `Tip ${status.toLowerCase()} successfully!`
    })

  } catch (error) {
    console.error('Failed to record tip:', error)
    return NextResponse.json(
      { error: 'Failed to record tip' },
      { status: 500 }
    )
  }
}