import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT /api/admin/xp-levels/[id] - Update XP level
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
      level,
      xpRequired,
      title,
      icon,
      perks
    } = await req.json()

    // Convert perks array to JSON string
    const perksJson = JSON.stringify(perks || [])

    // Update XP level
    const xpLevel = await prisma.xPLevel.update({
      where: { id: params.id },
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
    console.error('Failed to update XP level:', error)

    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Level number already exists' },
        { status: 400 }
      )
    }

    // Handle not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'XP level not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update XP level' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/xp-levels/[id] - Delete XP level
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

    // Delete XP level
    await prisma.xPLevel.delete({
      where: { id: params.id }
    })

    return NextResponse.json({
      success: true,
      message: 'XP level deleted successfully'
    })
  } catch (error: any) {
    console.error('Failed to delete XP level:', error)

    // Handle not found
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'XP level not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to delete XP level' },
      { status: 500 }
    )
  }
}
