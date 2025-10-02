import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    

    // Get all users with their social accounts for testing
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
        walletAddress: true,
        discordId: true,
        discordName: true,
        twitterId: true,
        twitterHandle: true,
        bio: true,
        level: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    })


    return NextResponse.json({
      success: true,
      totalUsers: users.length,
      users: users.map(user => ({
        id: user.id.slice(0, 8) + '...',
        username: user.username,
        displayName: user.displayName,
        walletAddress: user.walletAddress?.slice(0, 10) + '...',
        hasDiscord: !!user.discordId,
        discordName: user.discordName,
        hasTwitter: !!user.twitterId,
        twitterHandle: user.twitterHandle,
        bio: user.bio?.slice(0, 50) + (user.bio && user.bio.length > 50 ? '...' : ''),
        level: user.level,
        createdAt: user.createdAt
      })),
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[TestProfile] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch test data', details: error.message },
      { status: 500 }
    )
  }
}