import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// This endpoint should be called by a cron job (e.g., Vercel Cron or external service)
// It cleans up expired and used nonces to prevent database bloat

export async function POST(request: NextRequest) {
  try {
    // Verify request is from authorized source (cron job secret)
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret) {
      console.warn('[Nonce Cleanup] CRON_SECRET not configured')
      return NextResponse.json(
        { error: 'Service not configured' },
        { status: 500 }
      )
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      console.warn('[Nonce Cleanup] Unauthorized cleanup attempt')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Delete expired nonces
    const expiredDeleted = await prisma.authNonce.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    })

    // Delete used nonces older than 7 days (keep for audit purposes)
    const oldUsedDeleted = await prisma.authNonce.deleteMany({
      where: {
        used: true,
        usedAt: {
          lt: sevenDaysAgo
        }
      }
    })

    // Also clean up old auth attempts (keep 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const oldAttemptsDeleted = await prisma.authAttempt.deleteMany({
      where: {
        createdAt: {
          lt: thirtyDaysAgo
        }
      }
    })

    console.log('[Nonce Cleanup] Cleanup completed:', {
      expiredNonces: expiredDeleted.count,
      oldUsedNonces: oldUsedDeleted.count,
      oldAuthAttempts: oldAttemptsDeleted.count
    })

    return NextResponse.json({
      success: true,
      deleted: {
        expiredNonces: expiredDeleted.count,
        oldUsedNonces: oldUsedDeleted.count,
        oldAuthAttempts: oldAttemptsDeleted.count
      }
    })
  } catch (error: any) {
    console.error('[Nonce Cleanup] Failed:', error)
    return NextResponse.json(
      { error: 'Cleanup failed', details: error.message },
      { status: 500 }
    )
  }
}

// Allow GET for manual testing (with same auth)
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const expectedSecret = process.env.CRON_SECRET

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Return stats without deleting
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const [expiredNonces, oldUsedNonces, oldAttempts] = await Promise.all([
      prisma.authNonce.count({
        where: { expiresAt: { lt: now } }
      }),
      prisma.authNonce.count({
        where: { used: true, usedAt: { lt: sevenDaysAgo } }
      }),
      prisma.authAttempt.count({
        where: { createdAt: { lt: thirtyDaysAgo } }
      })
    ])

    return NextResponse.json({
      cleanupNeeded: {
        expiredNonces,
        oldUsedNonces,
        oldAuthAttempts: oldAttempts
      }
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
