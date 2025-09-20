import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateUserSecure, AuthenticationError, AuthorizationError } from '@/lib/auth/secure'

const prisma = new PrismaClient()

// Get ads for display
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const placement = searchParams.get('placement') || 'feed'
    const limit = parseInt(searchParams.get('limit') || '3')

    // Get active ads
    const ads = await prisma.advertisement.findMany({
      where: {
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } }
        ]
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    return NextResponse.json({
      success: true,
      data: ads
    })
  } catch (error) {
    console.error('Error fetching ads:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ads' },
      { status: 500 }
    )
  }
}

// Create new ad (admin only)
export async function POST(request: NextRequest) {
  try {
    const {
      title,
      description,
      imageUrl,
      linkUrl,
      targetAudience = 'ALL',
      budget = 100,
      costPerClick = 0.01,
      costPerView = 0.001,
      endDate
    } = await request.json()

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      )
    }

    const user = await authenticateUserSecure(request)

    // Check if user is admin
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Create advertisement
    const ad = await prisma.advertisement.create({
      data: {
        creatorId: user.id,
        title: title.trim(),
        description: description.trim(),
        imageUrl: imageUrl?.trim() || null,
        linkUrl: linkUrl?.trim() || null,
        targetAudience,
        budget: parseFloat(budget.toString()),
        costPerClick: parseFloat(costPerClick.toString()),
        costPerView: parseFloat(costPerView.toString()),
        endDate: endDate ? new Date(endDate) : null
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      }
    })

    console.log('Advertisement created:', {
      id: ad.id,
      title: ad.title,
      creator: ad.creator.displayName,
      budget: ad.budget
    })

    return NextResponse.json({
      success: true,
      data: ad,
      message: 'Advertisement created successfully!'
    })
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    console.error('Error creating advertisement:', error)
    return NextResponse.json(
      { error: 'Failed to create advertisement' },
      { status: 500 }
    )
  }
}