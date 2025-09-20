import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        profile: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        walletAddress: user.walletAddress,
        bio: user.bio,
        avatar: user.avatar,
        level: user.level,
        xp: user.xp,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
        profile: {
          tipCount: user.profile?.tipCount || 0,
          totalTipsReceived: user.profile?.totalTipsReceived || 0,
          followersCount: user.profile?.followersCount || 0,
          followingCount: user.profile?.followingCount || 0,
          postsCount: user.profile?.postsCount || 0,
          interests: user.profile?.interests || '[]',
          socialLinks: user.profile?.socialLinks || '[]',
          profileVerified: user.profile?.profileVerified || false
        }
      }
    })
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}