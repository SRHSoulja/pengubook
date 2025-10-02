import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Get user's privacy settings
export const GET = withRateLimit(30, 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: {
        allowDirectMessages: true,
        dmPrivacyLevel: true,
        isPrivate: true,
        showActivity: true,
        showTips: true
      }
    })


    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: profile
    })

  } catch (error: any) {
    logger.error('Error fetching privacy settings', error, 'Privacy')
    return NextResponse.json(
      { error: 'Failed to fetch privacy settings', details: error.message },
      { status: 500 }
    )
  }
}))

// Update user's privacy settings
export const PUT = withRateLimit(10, 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const {
      allowDirectMessages,
      dmPrivacyLevel,
      isPrivate,
      showActivity,
      showTips
    } = body

    // Validate dmPrivacyLevel
    if (dmPrivacyLevel && !['ALL', 'FRIENDS_ONLY', 'NONE'].includes(dmPrivacyLevel)) {
      return NextResponse.json(
        { error: 'Invalid DM privacy level. Must be ALL, FRIENDS_ONLY, or NONE' },
        { status: 400 }
      )
    }

    

    // Prepare update data
    const updateData: any = {}

    if (typeof allowDirectMessages === 'boolean') {
      updateData.allowDirectMessages = allowDirectMessages
    }

    if (dmPrivacyLevel) {
      updateData.dmPrivacyLevel = dmPrivacyLevel
    }

    if (typeof isPrivate === 'boolean') {
      updateData.isPrivate = isPrivate
    }

    if (typeof showActivity === 'boolean') {
      updateData.showActivity = showActivity
    }

    if (typeof showTips === 'boolean') {
      updateData.showTips = showTips
    }

    // Update profile
    const updatedProfile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        ...updateData
      },
      select: {
        allowDirectMessages: true,
        dmPrivacyLevel: true,
        isPrivate: true,
        showActivity: true,
        showTips: true
      }
    })


    logger.info('Privacy settings updated', {
      userId: user.id.slice(0, 8) + '...',
      changes: Object.keys(updateData)
    }, 'Privacy')

    return NextResponse.json({
      success: true,
      data: updatedProfile,
      message: 'Privacy settings updated successfully'
    })

  } catch (error: any) {
    logger.error('Error updating privacy settings', error, 'Privacy')
    return NextResponse.json(
      { error: 'Failed to update privacy settings', details: error.message },
      { status: 500 }
    )
  }
}))