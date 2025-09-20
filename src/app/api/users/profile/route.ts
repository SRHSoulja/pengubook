import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Skip database operations during build
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({
        success: false,
        error: 'Database not available during build'
      }, { status: 503 })
    }

    const { PrismaClient } = await import('@prisma/client')
    const prisma = new PrismaClient()

    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress }
    })

    await prisma.$disconnect()

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        walletAddress: user.walletAddress,
        bio: user.bio,
        avatar: user.avatar,
        level: user.level,
        isAdmin: user.isAdmin,
        isBanned: user.isBanned,
        discordName: user.discordName,
        twitterHandle: user.twitterHandle,
        profile: user.profile
      }
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}