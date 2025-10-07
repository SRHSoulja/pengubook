import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * SECURITY: Admin Action Logger
 * Provides comprehensive audit logging for all admin operations
 * Required for compliance, forensics, and security monitoring
 */

/**
 * Admin action types for categorization and filtering
 */
export const ADMIN_ACTIONS = {
  // User Management
  USER_BAN: 'USER_BAN',
  USER_UNBAN: 'USER_UNBAN',
  USER_DELETE: 'USER_DELETE',
  USER_UPDATE: 'USER_UPDATE',
  USER_VERIFY: 'USER_VERIFY',
  USER_PROMOTE_ADMIN: 'USER_PROMOTE_ADMIN',
  USER_DEMOTE_ADMIN: 'USER_DEMOTE_ADMIN',

  // Content Moderation
  POST_DELETE: 'POST_DELETE',
  POST_PIN: 'POST_PIN',
  POST_UNPIN: 'POST_UNPIN',
  POST_MARK_NSFW: 'POST_MARK_NSFW',
  POST_APPROVE: 'POST_APPROVE',
  POST_REJECT: 'POST_REJECT',

  // Comment Moderation
  COMMENT_DELETE: 'COMMENT_DELETE',
  COMMENT_APPROVE: 'COMMENT_APPROVE',
  COMMENT_REJECT: 'COMMENT_REJECT',

  // Community Management
  COMMUNITY_CREATE: 'COMMUNITY_CREATE',
  COMMUNITY_UPDATE: 'COMMUNITY_UPDATE',
  COMMUNITY_DELETE: 'COMMUNITY_DELETE',
  COMMUNITY_BAN_USER: 'COMMUNITY_BAN_USER',

  // Token Management
  TOKEN_VERIFY: 'TOKEN_VERIFY',
  TOKEN_BLACKLIST: 'TOKEN_BLACKLIST',
  TOKEN_REMOVE_BLACKLIST: 'TOKEN_REMOVE_BLACKLIST',

  // Report Handling
  REPORT_RESOLVE: 'REPORT_RESOLVE',
  REPORT_DISMISS: 'REPORT_DISMISS',

  // System Configuration
  SETTINGS_UPDATE: 'SETTINGS_UPDATE',
  XP_LEVELS_UPDATE: 'XP_LEVELS_UPDATE',
  ACHIEVEMENT_CREATE: 'ACHIEVEMENT_CREATE',
  ACHIEVEMENT_UPDATE: 'ACHIEVEMENT_UPDATE',
  ACHIEVEMENT_DELETE: 'ACHIEVEMENT_DELETE',

  // Project/Application Management
  PROJECT_APPROVE: 'PROJECT_APPROVE',
  PROJECT_REJECT: 'PROJECT_REJECT',
  APPLICATION_APPROVE: 'APPLICATION_APPROVE',
  APPLICATION_REJECT: 'APPLICATION_REJECT'
} as const

export type AdminActionType = typeof ADMIN_ACTIONS[keyof typeof ADMIN_ACTIONS]

/**
 * Target types for admin actions
 */
export const TARGET_TYPES = {
  USER: 'USER',
  POST: 'POST',
  COMMENT: 'COMMENT',
  COMMUNITY: 'COMMUNITY',
  TOKEN: 'TOKEN',
  REPORT: 'REPORT',
  ACHIEVEMENT: 'ACHIEVEMENT',
  SETTINGS: 'SETTINGS',
  PROJECT: 'PROJECT',
  APPLICATION: 'APPLICATION'
} as const

export type TargetType = typeof TARGET_TYPES[keyof typeof TARGET_TYPES]

/**
 * Log an admin action with full context
 * SECURITY: Captures IP, user agent, and full context for audit trails
 *
 * @param params - Admin action parameters
 */
export async function logAdminAction(params: {
  adminId: string
  adminName: string
  action: AdminActionType
  targetType: TargetType
  targetId: string
  targetName?: string
  reason?: string
  metadata?: Record<string, any>
  request?: NextRequest
  success?: boolean
  error?: string
}): Promise<void> {
  try {
    // Extract IP and User Agent from request
    let ipAddress: string | undefined
    let userAgent: string | undefined

    if (params.request) {
      // Try various headers for IP address (behind proxies/load balancers)
      ipAddress =
        params.request.headers.get('x-forwarded-for')?.split(',')[0] ||
        params.request.headers.get('x-real-ip') ||
        params.request.headers.get('cf-connecting-ip') || // Cloudflare
        params.request.ip ||
        'unknown'

      userAgent = params.request.headers.get('user-agent') || undefined
    }

    // Create admin action record
    await prisma.adminAction.create({
      data: {
        adminId: params.adminId,
        adminName: params.adminName,
        action: params.action,
        targetType: params.targetType,
        targetId: params.targetId,
        targetName: params.targetName,
        reason: params.reason,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        ipAddress,
        userAgent,
        success: params.success ?? true,
        error: params.error
      }
    })

    console.log('[Admin Action]', {
      admin: params.adminName,
      adminId: params.adminId.slice(0, 8) + '...',
      action: params.action,
      target: `${params.targetType}:${params.targetId.slice(0, 8)}...`,
      targetName: params.targetName,
      success: params.success ?? true,
      ip: ipAddress
    })

  } catch (error) {
    // CRITICAL: Never fail the admin operation due to logging failure
    // But log the error for investigation
    console.error('[Admin Action Logger] Failed to log action:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      action: params.action,
      adminId: params.adminId.slice(0, 8) + '...',
      targetId: params.targetId.slice(0, 8) + '...'
    })
  }
}

/**
 * Get admin action history with filtering and pagination
 *
 * @param filters - Query filters
 * @returns Admin actions with pagination info
 */
export async function getAdminActions(filters: {
  adminId?: string
  action?: AdminActionType
  targetType?: TargetType
  targetId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}): Promise<{
  actions: any[]
  total: number
  limit: number
  offset: number
}> {
  const {
    adminId,
    action,
    targetType,
    targetId,
    startDate,
    endDate,
    limit = 50,
    offset = 0
  } = filters

  // Build where clause
  const where: any = {}

  if (adminId) where.adminId = adminId
  if (action) where.action = action
  if (targetType) where.targetType = targetType
  if (targetId) where.targetId = targetId

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  // Execute queries in parallel
  const [actions, total] = await Promise.all([
    prisma.adminAction.findMany({
      where,
      include: {
        admin: {
          select: {
            id: true,
            displayName: true,
            username: true,
            isAdmin: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100), // Max 100 per page
      skip: offset
    }),
    prisma.adminAction.count({ where })
  ])

  return {
    actions: actions.map(action => ({
      ...action,
      metadata: action.metadata ? JSON.parse(action.metadata) : null
    })),
    total,
    limit,
    offset
  }
}

/**
 * Get admin action statistics
 * Useful for dashboards and monitoring
 *
 * @param adminId - Optional: filter by specific admin
 * @param days - Number of days to look back (default: 30)
 */
export async function getAdminActionStats(
  adminId?: string,
  days: number = 30
): Promise<{
  totalActions: number
  actionsByType: Record<string, number>
  actionsByAdmin: Record<string, { name: string; count: number }>
  successRate: number
  recentActions: any[]
}> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  const where: any = {
    createdAt: { gte: startDate }
  }
  if (adminId) where.adminId = adminId

  // Get all actions in date range
  const actions = await prisma.adminAction.findMany({
    where,
    include: {
      admin: {
        select: {
          id: true,
          displayName: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Calculate statistics
  const totalActions = actions.length
  const successfulActions = actions.filter(a => a.success).length
  const successRate = totalActions > 0 ? (successfulActions / totalActions) * 100 : 100

  // Group by action type
  const actionsByType: Record<string, number> = {}
  actions.forEach(action => {
    actionsByType[action.action] = (actionsByType[action.action] || 0) + 1
  })

  // Group by admin
  const actionsByAdmin: Record<string, { name: string; count: number }> = {}
  actions.forEach(action => {
    if (!actionsByAdmin[action.adminId]) {
      actionsByAdmin[action.adminId] = {
        name: action.admin.displayName || action.admin.username || 'Unknown Admin',
        count: 0
      }
    }
    actionsByAdmin[action.adminId].count++
  })

  // Get recent actions (last 10)
  const recentActions = actions.slice(0, 10).map(action => ({
    id: action.id,
    adminName: action.adminName,
    action: action.action,
    targetType: action.targetType,
    targetId: action.targetId,
    targetName: action.targetName,
    createdAt: action.createdAt,
    success: action.success
  }))

  return {
    totalActions,
    actionsByType,
    actionsByAdmin,
    successRate,
    recentActions
  }
}

/**
 * Middleware wrapper: Logs admin actions automatically
 * Use this to wrap admin endpoint handlers
 *
 * Usage:
 * export const DELETE = withAdminActionLogging({
 *   action: ADMIN_ACTIONS.USER_DELETE,
 *   targetType: TARGET_TYPES.USER,
 *   getTargetId: (request) => request.params.id
 * })(async (request, user) => {
 *   // Handler logic
 * })
 */
export function withAdminActionLogging(config: {
  action: AdminActionType
  targetType: TargetType
  getTargetId: (request: any) => string | Promise<string>
  getTargetName?: (request: any) => string | Promise<string | undefined>
  getReason?: (request: any) => string | Promise<string | undefined>
  getMetadata?: (request: any) => Record<string, any> | Promise<Record<string, any> | undefined>
}) {
  return function<T extends any[]>(
    handler: (request: NextRequest, user: any, ...args: T) => Promise<Response>
  ) {
    return async (request: NextRequest, user: any, ...args: T): Promise<Response> => {
      let success = true
      let error: string | undefined
      let targetId: string = ''
      let targetName: string | undefined
      let reason: string | undefined
      let metadata: Record<string, any> | undefined

      try {
        // Extract target information
        targetId = await Promise.resolve(config.getTargetId(request))
        if (config.getTargetName) {
          targetName = await Promise.resolve(config.getTargetName(request))
        }
        if (config.getReason) {
          reason = await Promise.resolve(config.getReason(request))
        }
        if (config.getMetadata) {
          metadata = await Promise.resolve(config.getMetadata(request))
        }

        // Execute handler
        const response = await handler(request, user, ...args)

        // Check if response indicates failure
        if (response.status >= 400) {
          success = false
          try {
            const body = await response.clone().json()
            error = body.error || `HTTP ${response.status}`
          } catch {
            error = `HTTP ${response.status}`
          }
        }

        return response

      } catch (err) {
        success = false
        error = err instanceof Error ? err.message : 'Unknown error'
        throw err

      } finally {
        // Log the action (fire and forget - don't block response)
        logAdminAction({
          adminId: user.id,
          adminName: user.displayName || user.username || 'Unknown Admin',
          action: config.action,
          targetType: config.targetType,
          targetId,
          targetName,
          reason,
          metadata,
          request,
          success,
          error
        }).catch(err => {
          console.error('[Admin Action Logger] Failed to log:', err)
        })
      }
    }
  }
}
