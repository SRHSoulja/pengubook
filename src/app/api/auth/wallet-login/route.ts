import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    // Skip database operations during build
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'Database not available during build'
      }, { status: 503 })
    }

    const { PrismaClient } = await import('@prisma/client')
    

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
      // Create new user with profile
      user = await prisma.user.create({
        data: {
          walletAddress,
          username: `user_${walletAddress.slice(-6)}`,
          displayName: `Penguin ${walletAddress.slice(-4)}`,
          profile: {
            create: {
              isPrivate: false,
              showActivity: true,
              showTips: true,
              allowDirectMessages: true,
              theme: 'dark',
              profileVerified: false
            }
          }
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