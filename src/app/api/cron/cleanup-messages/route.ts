import { NextRequest, NextResponse } from 'next/server'
import { cleanupExpiredMessages, permanentlyDeleteOldMessages } from '@/lib/message-cleanup'

export const dynamic = 'force-dynamic'

/**
 * Cron endpoint to cleanup expired messages
 * Should be called periodically (every minute) by a cron service
 *
 * Security: In production, this should be protected by:
 * 1. Vercel Cron secret header
 * 2. Or API key authentication
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (if in production)
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Run both cleanup jobs
    const [expiredResult, oldMessagesResult] = await Promise.all([
      cleanupExpiredMessages(),
      permanentlyDeleteOldMessages()
    ])

    return NextResponse.json({
      success: true,
      expiredMessages: expiredResult,
      oldMessages: oldMessagesResult,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: error.message },
      { status: 500 }
    )
  }
}
