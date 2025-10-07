import { NextRequest, NextResponse } from 'next/server'
import { withAdminAuth, withRateLimit } from '@/lib/auth-middleware'
import { getAdminActions, getAdminActionStats, ADMIN_ACTIONS, TARGET_TYPES } from '@/lib/admin-logger'

export const dynamic = 'force-dynamic'

/**
 * SECURITY: Admin Audit Log Endpoint
 * Provides comprehensive audit trail viewing for admins
 * Rate limited and admin-only access
 *
 * Query parameters:
 * - adminId: Filter by admin user
 * - action: Filter by action type
 * - targetType: Filter by target type
 * - targetId: Filter by target ID
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * - limit: Results per page (default: 50, max: 100)
 * - offset: Pagination offset
 * - stats: Return statistics instead of logs (true/false)
 */
export const GET = withRateLimit(100, 60000)( // 100 requests per minute
  withAdminAuth(async (request: NextRequest, admin: any) => {
    try {
      const { searchParams } = new URL(request.url)

      // Check if requesting statistics
      const wantStats = searchParams.get('stats') === 'true'

      if (wantStats) {
        // Return statistics
        const days = parseInt(searchParams.get('days') || '30')
        const stats = await getAdminActionStats(
          searchParams.get('adminId') || undefined,
          Math.min(days, 365) // Max 1 year
        )

        return NextResponse.json({
          success: true,
          stats,
          timestamp: new Date().toISOString()
        })
      }

      // Return paginated audit logs
      const filters = {
        adminId: searchParams.get('adminId') || undefined,
        action: searchParams.get('action') || undefined,
        targetType: searchParams.get('targetType') || undefined,
        targetId: searchParams.get('targetId') || undefined,
        startDate: searchParams.get('startDate')
          ? new Date(searchParams.get('startDate')!)
          : undefined,
        endDate: searchParams.get('endDate')
          ? new Date(searchParams.get('endDate')!)
          : undefined,
        limit: Math.min(
          parseInt(searchParams.get('limit') || '50'),
          100
        ),
        offset: Math.max(
          parseInt(searchParams.get('offset') || '0'),
          0
        )
      }

      const result = await getAdminActions(filters)

      return NextResponse.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString()
      })

    } catch (error) {
      console.error('[Admin Audit Log] Error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch audit logs',
          details: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  })
)

/**
 * Get available action types and target types for filtering UI
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({
    success: true,
    availableActions: Object.values(ADMIN_ACTIONS),
    availableTargetTypes: Object.values(TARGET_TYPES),
    queryParameters: {
      adminId: 'string (optional)',
      action: 'string (optional) - One of availableActions',
      targetType: 'string (optional) - One of availableTargetTypes',
      targetId: 'string (optional)',
      startDate: 'ISO date string (optional)',
      endDate: 'ISO date string (optional)',
      limit: 'number (optional, default: 50, max: 100)',
      offset: 'number (optional, default: 0)',
      stats: 'boolean (optional) - Return statistics instead of logs'
    }
  })
}
