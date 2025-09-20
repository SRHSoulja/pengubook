import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Check if user exists, create if not
    let user = await prisma.user.findUnique({
      where: { walletAddress }
    })

    if (!user) {
      // Create new user
      user = await prisma.user.create({
        data: {
          walletAddress,
          username: `user_${walletAddress.slice(-6)}`,
          displayName: `Penguin ${walletAddress.slice(-4)}`,
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Wallet authentication successful',
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        displayName: user.displayName
      }
    })
  } catch (error) {
    console.error('Wallet login error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}