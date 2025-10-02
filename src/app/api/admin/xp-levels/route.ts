import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/admin/xp-levels - Fetch all XP levels
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

    // Fetch all XP levels
    const levels = await prisma.xPLevel.findMany({
      orderBy: { level: 'asc' }
    })

    // Parse perks from JSON string
    const levelsWithParsedPerks = levels.map(level => ({
      ...level,
      perks: JSON.parse(level.perks)
    }))

    return NextResponse.json({
      success: true,
      levels: levelsWithParsedPerks
    })
  } catch (error) {
    console.error('Failed to fetch XP levels:', error)
    return NextResponse.json(
      { error: 'Failed to fetch XP levels' },
      { status: 500 }
    )
  }
}

// POST /api/admin/xp-levels - Create new XP level
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
      level,
      xpRequired,
      title,
      icon,
      perks
    } = await req.json()

    // Validate required fields
    if (level === undefined || xpRequired === undefined || !title || !icon) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Convert perks array to JSON string
    const perksJson = JSON.stringify(perks || [])

    // Create XP level
    const xpLevel = await prisma.xPLevel.create({
      data: {
        level,
        xpRequired,
        title,
        icon,
        perks: perksJson
      }
    })

    return NextResponse.json({
      success: true,
      level: {
        ...xpLevel,
        perks: JSON.parse(xpLevel.perks)
      }
    })
  } catch (error: any) {
    console.error('Failed to create XP level:', error)

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Level number already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create XP level' },
      { status: 500 }
    )
  }
}
