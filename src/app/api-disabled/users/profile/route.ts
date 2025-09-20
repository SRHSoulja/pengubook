import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('walletAddress')

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      include: { profile: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get tip counts
    const tipsGivenCount = await prisma.tip.count({
      where: { fromUserId: user.id }
    })

    const tipsReceivedCount = await prisma.tip.count({
      where: { toUserId: user.id }
    })

    // Add computed fields to profile
    const enhancedUser = {
      ...user,
      profile: user.profile ? {
        ...user.profile,
        tipCount: tipsGivenCount,
        tipsReceivedCount: tipsReceivedCount
      } : {
        tipCount: tipsGivenCount,
        tipsReceivedCount: tipsReceivedCount
      }
    }

    return NextResponse.json({ user: enhancedUser })
  } catch (error) {
    console.error('Failed to fetch user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { walletAddress, username, displayName, bio, interests } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Check if username is being changed and if it's already taken
    if (username) {
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          NOT: { walletAddress }
        }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username is already taken' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {}
    if (username) updateData.username = username
    if (displayName) updateData.displayName = displayName
    if (bio) updateData.bio = bio

    const updatedUser = await prisma.user.update({
      where: { walletAddress },
      data: {
        ...updateData,
        ...(interests && {
          profile: {
            update: {
              interests: JSON.stringify(interests)
            }
          }
        })
      },
      include: { profile: true }
    })

    return NextResponse.json({ user: updatedUser })
  } catch (error) {
    console.error('Failed to update user profile:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}