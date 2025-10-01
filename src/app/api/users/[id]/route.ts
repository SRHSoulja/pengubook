import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const prisma = new PrismaClient()

    // Check if id is a wallet address (starts with 0x and is 42 chars)
    const isWalletAddress = /^0x[a-fA-F0-9]{40}$/.test(id)

    const user = await prisma.user.findFirst({
      where: isWalletAddress
        ? {
            walletAddress: {
              equals: id,
              mode: 'insensitive'
            }
          }
        : { id },
      include: {
        profile: true,
        _count: {
          select: {
            posts: true,
            followers: true,
            following: true,
            tipsReceived: true
          }
        }
      }
    })

    if (!user) {
      await prisma.$disconnect()
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    await prisma.$disconnect()

    const profileData = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      bio: user.bio,
      avatar: user.avatar,
      level: user.level,
      xp: user.xp,
      isAdmin: user.isAdmin,
      discordName: user.discordName,
      twitterHandle: user.twitterHandle,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastSeen: user.lastSeen,
      isOnline: user.isOnline,
      profile: user.profile ? {
        socialLinks: JSON.parse(user.profile.socialLinks || '[]'),
        interests: JSON.parse(user.profile.interests || '[]'),
        location: user.profile.location,
        website: user.profile.website,
        company: user.profile.company,
        timezone: user.profile.timezone,
        languages: JSON.parse(user.profile.languages || '[]'),
        skills: JSON.parse(user.profile.skills || '[]'),
        isPrivate: user.profile.isPrivate,
        showActivity: user.profile.showActivity,
        showTips: user.profile.showTips,
        allowDirectMessages: user.profile.allowDirectMessages,
        theme: user.profile.theme,
        bannerImage: user.profile.bannerImage,
        profileVerified: user.profile.profileVerified
      } : null,
      stats: {
        posts: user._count.posts,
        followers: user._count.followers,
        following: user._count.following,
        tips: user._count.tipsReceived
      }
    }

    return NextResponse.json({
      success: true,
      data: profileData
    })

  } catch (error: any) {
    console.error('[Users] GET by ID error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user', details: error.message },
      { status: 500 }
    )
  }
}