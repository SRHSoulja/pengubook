import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredCsrfTokens } from '@/lib/csrf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * SECURITY: CSRF Token Cleanup Cron Job
 * Removes expired and used CSRF tokens from database
 *
 * VERCEL CRON CONFIGURATION:
 * Add to vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/cleanup-csrf",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 *
 * This runs every hour at minute 0
 *
 * SECURITY: Protected by Vercel Cron secret header
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify request is from Vercel Cron
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('[CSRF Cleanup] Unauthorized cron attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CSRF Cleanup] Starting cleanup...')

    // Clean up expired/used CSRF tokens
    const deletedCount = await cleanupExpiredCsrfTokens()

    console.log('[CSRF Cleanup] Cleanup complete:', {
      deletedCount,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      message: 'CSRF token cleanup completed',
      deletedCount,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[CSRF Cleanup] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'CSRF cleanup failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
