import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Cron job to clean up expired authentication nonces
 * Prevents DoS attack via nonce table bloat
 *
 * Security: Vercel cron jobs are authenticated via special header
 * See: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
 */
export async function GET(request: NextRequest) {
  // SECURITY: Verify this request is from Vercel Cron
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.error('[Nonce Cleanup] Unauthorized cron job access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const now = new Date()

    // Delete expired nonces (expiresAt < now)
    const deleteExpiredNonces = await prisma.authNonce.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    })

    // Delete used nonces older than 24 hours (keep recent ones for audit trail)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const deleteOldUsedNonces = await prisma.authNonce.deleteMany({
      where: {
        used: true,
        usedAt: {
          lt: oneDayAgo
        }
      }
    })

    // Delete old failed auth attempts (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const deleteOldAuthAttempts = await prisma.authAttempt.deleteMany({
      where: {
        createdAt: {
          lt: sevenDaysAgo
        }
      }
    })

    // Clean up expired rate limit records
    const deleteExpiredRateLimits = await prisma.rateLimit.deleteMany({
      where: {
        resetTime: {
          lt: BigInt(Date.now())
        }
      }
    })

    // Clean up expired revoked sessions
    const deleteExpiredRevokedSessions = await prisma.revokedSession.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    })

    console.log('[Nonce Cleanup] Cleanup completed:', {
      expiredNonces: deleteExpiredNonces.count,
      oldUsedNonces: deleteOldUsedNonces.count,
      oldAuthAttempts: deleteOldAuthAttempts.count,
      expiredRateLimits: deleteExpiredRateLimits.count,
      expiredRevokedSessions: deleteExpiredRevokedSessions.count,
      timestamp: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      cleaned: {
        expiredNonces: deleteExpiredNonces.count,
        oldUsedNonces: deleteOldUsedNonces.count,
        oldAuthAttempts: deleteOldAuthAttempts.count,
        expiredRateLimits: deleteExpiredRateLimits.count,
        expiredRevokedSessions: deleteExpiredRevokedSessions.count
      },
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Nonce Cleanup] Error:', error)
    return NextResponse.json(
      {
        error: 'Cleanup failed',
        details: error.message
      },
      { status: 500 }
    )
  }
}
