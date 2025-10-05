import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/admin/achievements/[id] - Update achievement
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Update achievement
    const achievement = await prisma.achievement.update({
      where: { id: params.id },
      data: {
        name,
        title,
        description,
        icon,
        category,
        rarity,
        requirement,
        xpReward,
        isActive,
        triggerType: triggerType || null,
        metricType: metricType || null
      }
    })

    return NextResponse.json({
      success: true,
      achievement
    })
  } catch (error: any) {
    console.error('Failed to update achievement:', error)

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Achievement with this name already exists' },
        { status: 400 }
      )
    }

    // Handle not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update achievement' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/achievements/[id] - Delete achievement
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Delete achievement
    await prisma.achievement.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'Achievement deleted successfully'
    })
  } catch (error: any) {
    console.error('Failed to delete achievement:', error)

    // Handle not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete achievement' },
      { status: 500 }
    )
  }
}
