import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdminAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// GET: Fetch all moderation settings
// SECURITY: Requires authentication to prevent moderation bypass
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const settings = await prisma.moderationSettings.findMany({
      orderBy: [
        { action: 'desc' }, // REJECT first, then FLAG, then ALLOW
        { labelName: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      settings
    })
  } catch (error: any) {
    console.error('[Admin] Moderation settings GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch moderation settings', details: error.message },
      { status: 500 }
    )
  }
})

// POST: Create or update moderation setting
// SECURITY: Already uses withAuth + manual admin check, replace with withAdminAuth
export const POST = withAdminAuth(async (request: NextRequest, user: any) => {
  try {
    // Admin check now handled by withAdminAuth middleware

    const body = await request.json()
    const {
      labelName,
      action = 'FLAG',
      minConfidence = 60,
      requiresReview = false,
      isEnabled = true,
      displayName,
      description
    } = body

    if (!labelName) {
      return NextResponse.json(
        { error: 'labelName is required' },
        { status: 400 }
      )
    }

    // Upsert the setting
    const setting = await prisma.moderationSettings.upsert({
      where: { labelName },
      update: {
        action,
        minConfidence,
        requiresReview,
        isEnabled,
        displayName,
        description
      },
      create: {
        labelName,
        action,
        minConfidence,
        requiresReview,
        isEnabled,
        displayName,
        description
      }
    })

    console.log('[Admin] Moderation setting updated:', {
      labelName,
      action,
      adminId: user.id
    })

    return NextResponse.json({
      success: true,
      setting
    })
  } catch (error: any) {
    console.error('[Admin] Moderation settings POST error:', error)
    return NextResponse.json(
      { error: 'Failed to update moderation setting', details: error.message },
      { status: 500 }
    )
  }
})

// DELETE: Delete a moderation setting
export const DELETE = withAuth(async (request: NextRequest, user: any) => {
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const labelName = searchParams.get('labelName')

    if (!labelName) {
      return NextResponse.json(
        { error: 'labelName is required' },
        { status: 400 }
      )
    }

    await prisma.moderationSettings.delete({
      where: { labelName }
    })

    console.log('[Admin] Moderation setting deleted:', {
      labelName,
      adminId: user.id
    })

    return NextResponse.json({
      success: true,
      message: 'Moderation setting deleted'
    })
  } catch (error: any) {
    console.error('[Admin] Moderation settings DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete moderation setting', details: error.message },
      { status: 500 }
    )
  }
})
