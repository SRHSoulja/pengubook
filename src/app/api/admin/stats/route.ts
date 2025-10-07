import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// SECURITY: Admin-only endpoint - requires authentication and admin privileges
export const GET = withAdminAuth(async (request: NextRequest, user: any) => {
  try {
    // Get start of today (midnight in server timezone)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Fetch all statistics in parallel
    const [
      totalUsers,
      verifiedTokens,
      blacklistedTokens,
      pendingReports,
      recentUsers
    ] = await Promise.all([
      prisma.user.count(),
      prisma.verifiedToken.count(),
      prisma.blacklistedToken.count(),
      prisma.tokenReport.count({
        where: { status: 'PENDING' }
      }),
      prisma.user.count({
        where: {
          createdAt: {
            gte: today // Since midnight today
          }
        }
      })
    ])


    return NextResponse.json({
      totalUsers,
      verifiedTokens,
      blacklistedTokens,
      pendingReports,
      recentUsers
    })

  } catch (error: any) {
    console.error('[Admin Stats] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: error.message },
      { status: 500 }
    )
  }
})
