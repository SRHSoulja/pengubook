import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { interactionType } = await request.json()
    const walletAddress = request.headers.get('x-wallet-address')

    if (!interactionType) {
      return NextResponse.json(
        { error: 'Interaction type is required' },
        { status: 400 }
      )
    }

    // Validate interaction type
    const validInteractions = ['VIEW', 'CLICK', 'IMPRESSION']
    if (!validInteractions.includes(interactionType)) {
      return NextResponse.json(
        { error: 'Invalid interaction type' },
        { status: 400 }
      )
    }

    // Get user if wallet address provided
    let user = null
    if (walletAddress) {
      user = await prisma.user.findUnique({
        where: { walletAddress }
      })
    }

    // Get advertisement
    const ad = await prisma.advertisement.findUnique({
      where: { id: params.id }
    })

    if (!ad) {
      return NextResponse.json(
        { error: 'Advertisement not found' },
        { status: 404 }
      )
    }

    if (!ad.isActive) {
      return NextResponse.json(
        { error: 'Advertisement is not active' },
        { status: 400 }
      )
    }

    // Check if ad has ended
    if (ad.endDate && ad.endDate < new Date()) {
      return NextResponse.json(
        { error: 'Advertisement has ended' },
        { status: 400 }
      )
    }

    // Calculate cost for this interaction
    let cost = 0
    if (interactionType === 'CLICK') {
      cost = ad.costPerClick
    } else if (interactionType === 'VIEW') {
      cost = ad.costPerView
    }

    // Check if advertiser has enough budget
    const newTotalSpent = ad.totalSpent + cost
    if (newTotalSpent > ad.budget) {
      // Deactivate ad if budget exceeded
      await prisma.advertisement.update({
        where: { id: params.id },
        data: { isActive: false }
      })

      return NextResponse.json(
        { error: 'Advertisement budget exceeded' },
        { status: 400 }
      )
    }

    // Record interaction
    await prisma.adInteraction.create({
      data: {
        adId: params.id,
        userId: user?.id || null,
        interactionType
      }
    })

    // Update ad statistics
    const updateData: any = {
      totalSpent: { increment: cost }
    }

    if (interactionType === 'CLICK') {
      updateData.totalClicks = { increment: 1 }
    } else if (interactionType === 'VIEW') {
      updateData.totalViews = { increment: 1 }
    }

    await prisma.advertisement.update({
      where: { id: params.id },
      data: updateData
    })

    console.log('Ad interaction recorded:', {
      adId: params.id,
      userId: user?.id,
      interactionType,
      cost
    })

    return NextResponse.json({
      success: true,
      message: 'Interaction recorded successfully'
    })
  } catch (error) {
    console.error('Error recording ad interaction:', error)
    return NextResponse.json(
      { error: 'Failed to record interaction' },
      { status: 500 }
    )
  }
}