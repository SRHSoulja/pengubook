import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/achievements - Fetch all achievements
export async function GET(req: NextRequest) {
  try {
    const walletAddress = req.headers.get('x-wallet-address')

    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { walletAddress }
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Fetch all achievements
    const achievements = await prisma.achievement.findMany({
      orderBy: [
        { category: 'asc' },
        { rarity: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      achievements
    })
  } catch (error) {
    console.error('Failed to fetch achievements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch achievements' },
      { status: 500 }
    )
  }
}

// POST /api/admin/achievements - Create new achievement
export async function POST(req: NextRequest) {
  try {
    const walletAddress = req.headers.get('x-wallet-address')

    if (!walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const user = await prisma.user.findUnique({
      where: { walletAddress }
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const {
      name,
      title,
      description,
      icon,
      category,
      rarity,
      requirement,
      xpReward,
      isActive,
      triggerType,
      metricType
    } = await req.json()

    // Validate required fields
    if (!name || !title || !description || !icon || !category || !rarity || requirement === undefined || xpReward === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create achievement
    const achievement = await prisma.achievement.create({
      data: {
        name,
        title,
        description,
        icon,
        category,
        rarity,
        requirement,
        xpReward,
        isActive: isActive ?? true,
        triggerType: triggerType || null,
        metricType: metricType || null
      }
    })

    return NextResponse.json({
      success: true,
      achievement
    })
  } catch (error: any) {
    console.error('Failed to create achievement:', error)

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Achievement with this name already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create achievement' },
      { status: 500 }
    )
  }
}
