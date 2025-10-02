import { prisma } from '@/lib/prisma'

export type StreakAuditEvent =
  | 'STREAK_CREATED'
  | 'STREAK_EXTENDED'
  | 'STREAK_BROKEN'
  | 'STREAK_UPDATE_BLOCKED'
  | 'SUSPICIOUS_ACTIVITY'

interface AuditLogData {
  userId: string
  streakType: string
  event: StreakAuditEvent
  metadata?: any
  ipAddress?: string
  userAgent?: string
}

/**
 * Log streak-related events for security auditing
 * SECURITY: Helps detect and investigate suspicious patterns
 */
export async function logStreakAudit(data: AuditLogData): Promise<void> {
  try {
    // Log to console for immediate visibility
    console.log(`[STREAK AUDIT] ${data.event} - User: ${data.userId}, Type: ${data.streakType}`, data.metadata || '')

    // Could be extended to log to database, external service, etc.
    // For now, we'll use the Activity table
    await prisma.activity.create({
      data: {
        userId: data.userId,
        activityType: `STREAK_${data.event}`,
        content: JSON.stringify({
          streakType: data.streakType,
          metadata: data.metadata,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          timestamp: new Date().toISOString()
        })
      }
    }).catch(err => {
      // Don't fail the streak update if audit logging fails
      console.error('[STREAK AUDIT] Failed to log audit:', err)
    })
  } catch (error) {
    console.error('[STREAK AUDIT] Error in audit logging:', error)
  }
}

/**
 * Detect suspicious streak patterns
 * SECURITY: Identifies potential manipulation attempts
 */
export async function detectSuspiciousStreakActivity(
  userId: string,
  streakType: string
): Promise<boolean> {
  try {
    // Check for rapid streak updates in the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    const recentUpdates = await prisma.activity.count({
      where: {
        userId,
        activityType: {
          startsWith: 'STREAK_'
        },
        createdAt: {
          gte: oneHourAgo
        }
      }
    })

    // More than 10 streak-related activities in an hour is suspicious
    if (recentUpdates > 10) {
      await logStreakAudit({
        userId,
        streakType,
        event: 'SUSPICIOUS_ACTIVITY',
        metadata: {
          reason: 'Excessive streak updates',
          count: recentUpdates,
          timeWindow: '1 hour'
        }
      })
      return true
    }

    return false
  } catch (error) {
    console.error('[STREAK AUDIT] Error detecting suspicious activity:', error)
    return false
  }
}

/**
 * Get streak audit history for a user
 * Useful for admin review
 */
export async function getStreakAuditHistory(
  userId: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const activities = await prisma.activity.findMany({
      where: {
        userId,
        activityType: {
          startsWith: 'STREAK_'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    return activities.map(activity => ({
      id: activity.id,
      event: activity.activityType,
      data: activity.content ? JSON.parse(activity.content) : null,
      timestamp: activity.createdAt
    }))
  } catch (error) {
    console.error('[STREAK AUDIT] Error fetching audit history:', error)
    return []
  }
}
