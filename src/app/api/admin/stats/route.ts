import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    

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
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
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
}
