/**
 * OPERATIONS: Alert & Notification System
 *
 * Send critical alerts to team channels:
 * - Discord webhooks
 * - Slack webhooks
 * - Generic webhooks (PagerDuty, Opsgenie, etc.)
 *
 * Use cases:
 * - Security incidents (unauthorized access, rate limit violations)
 * - System health issues (database down, high memory)
 * - Admin actions (user bans, content deletion)
 * - Anomaly detection (unusual traffic patterns)
 */

import { logger } from '@/lib/logger'

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

export interface Alert {
  title: string
  message: string
  severity: AlertSeverity
  timestamp?: string
  metadata?: Record<string, any>
  source?: string // Component that triggered alert
}

export interface AlertConfig {
  enabled: boolean
  webhookUrl: string
  type: 'discord' | 'slack' | 'generic'
  rateLimitMs?: number // Minimum time between alerts
}

/**
 * Base Alert Provider
 */
abstract class AlertProvider {
  protected config: AlertConfig
  protected lastAlertTime: number = 0

  constructor(config: AlertConfig) {
    this.config = config
  }

  /**
   * Send alert (rate limited)
   */
  async send(alert: Alert): Promise<boolean> {
    if (!this.config.enabled) {
      return false
    }

    // Rate limiting
    const now = Date.now()
    const timeSinceLastAlert = now - this.lastAlertTime
    const rateLimit = this.config.rateLimitMs || 60000 // 1 minute default

    if (timeSinceLastAlert < rateLimit) {
      logger.debug('Alert rate limited', {
        alert: alert.title,
        timeSinceLastMs: timeSinceLastAlert
      }, { component: 'ALERTS' })
      return false
    }

    try {
      await this.sendAlert(alert)
      this.lastAlertTime = now

      logger.info('Alert sent', {
        title: alert.title,
        severity: alert.severity,
        provider: this.config.type
      }, { component: 'ALERTS' })

      return true
    } catch (error: any) {
      logger.error('Alert send failed', {
        title: alert.title,
        error: error.message,
        provider: this.config.type
      }, { component: 'ALERTS' })
      return false
    }
  }

  /**
   * Send alert (implemented by subclasses)
   */
  protected abstract sendAlert(alert: Alert): Promise<void>
}

/**
 * Discord Webhook Provider
 */
export class DiscordAlertProvider extends AlertProvider {
  protected async sendAlert(alert: Alert): Promise<void> {
    const color = this.getSeverityColor(alert.severity)
    const emoji = this.getSeverityEmoji(alert.severity)

    const payload = {
      embeds: [
        {
          title: `${emoji} ${alert.title}`,
          description: alert.message,
          color,
          timestamp: alert.timestamp || new Date().toISOString(),
          fields: [
            {
              name: 'Severity',
              value: alert.severity.toUpperCase(),
              inline: true
            },
            ...(alert.source
              ? [
                  {
                    name: 'Source',
                    value: alert.source,
                    inline: true
                  }
                ]
              : []),
            ...(alert.metadata
              ? Object.entries(alert.metadata).map(([key, value]) => ({
                  name: key,
                  value: String(value),
                  inline: true
                }))
              : [])
          ],
          footer: {
            text: 'PeBloq Alerts',
            icon_url: 'https://pebloq.vercel.app/icon.png'
          }
        }
      ]
    }

    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status} ${response.statusText}`)
    }
  }

  private getSeverityColor(severity: AlertSeverity): number {
    const colors = {
      info: 0x3498db, // Blue
      warning: 0xf39c12, // Orange
      error: 0xe74c3c, // Red
      critical: 0x992d22 // Dark red
    }
    return colors[severity]
  }

  private getSeverityEmoji(severity: AlertSeverity): string {
    const emojis = {
      info: 'ℹ️',
      warning: '⚠️',
      error: '🚨',
      critical: '🔥'
    }
    return emojis[severity]
  }
}

/**
 * Slack Webhook Provider
 */
export class SlackAlertProvider extends AlertProvider {
  protected async sendAlert(alert: Alert): Promise<void> {
    const color = this.getSeverityColor(alert.severity)
    const emoji = this.getSeverityEmoji(alert.severity)

    const fields = [
      {
        title: 'Severity',
        value: alert.severity.toUpperCase(),
        short: true
      },
      ...(alert.source
        ? [
            {
              title: 'Source',
              value: alert.source,
              short: true
            }
          ]
        : []),
      ...(alert.metadata
        ? Object.entries(alert.metadata).map(([key, value]) => ({
            title: key,
            value: String(value),
            short: true
          }))
        : [])
    ]

    const payload = {
      attachments: [
        {
          color,
          title: `${emoji} ${alert.title}`,
          text: alert.message,
          fields,
          ts: Math.floor(Date.now() / 1000),
          footer: 'PeBloq Alerts',
          footer_icon: 'https://pebloq.vercel.app/icon.png'
        }
      ]
    }

    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status} ${response.statusText}`)
    }
  }

  private getSeverityColor(severity: AlertSeverity): string {
    const colors = {
      info: '#3498db',
      warning: '#f39c12',
      error: '#e74c3c',
      critical: '#992d22'
    }
    return colors[severity]
  }

  private getSeverityEmoji(severity: AlertSeverity): string {
    const emojis = {
      info: ':information_source:',
      warning: ':warning:',
      error: ':rotating_light:',
      critical: ':fire:'
    }
    return emojis[severity]
  }
}

/**
 * Generic Webhook Provider
 * For PagerDuty, Opsgenie, custom endpoints, etc.
 */
export class GenericWebhookProvider extends AlertProvider {
  protected async sendAlert(alert: Alert): Promise<void> {
    const payload = {
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      timestamp: alert.timestamp || new Date().toISOString(),
      source: alert.source || 'pebloq',
      metadata: alert.metadata || {}
    }

    const response = await fetch(this.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error(`Generic webhook failed: ${response.status} ${response.statusText}`)
    }
  }
}

/**
 * Alert Manager
 * Manages multiple alert providers
 */
export class AlertManager {
  private providers: AlertProvider[] = []

  /**
   * Add alert provider
   */
  addProvider(provider: AlertProvider): void {
    this.providers.push(provider)
  }

  /**
   * Send alert to all providers
   */
  async send(alert: Alert): Promise<number> {
    let sentCount = 0

    for (const provider of this.providers) {
      try {
        const sent = await provider.send(alert)
        if (sent) sentCount++
      } catch (error: any) {
        logger.error('Alert provider error', {
          error: error.message,
          alert: alert.title
        }, { component: 'ALERTS' })
      }
    }

    return sentCount
  }

  /**
   * Send critical alert (bypasses rate limiting)
   */
  async sendCritical(alert: Alert): Promise<number> {
    return this.send({ ...alert, severity: 'critical' })
  }
}

/**
 * Initialize alert providers from environment variables
 */
export function initializeAlerts(): AlertManager {
  const manager = new AlertManager()

  // Discord webhook
  if (process.env.DISCORD_WEBHOOK_URL) {
    const discord = new DiscordAlertProvider({
      enabled: true,
      webhookUrl: process.env.DISCORD_WEBHOOK_URL,
      type: 'discord',
      rateLimitMs: parseInt(process.env.ALERT_RATE_LIMIT_MS || '60000')
    })
    manager.addProvider(discord)
    logger.info('Discord alerts initialized', {}, { component: 'ALERTS' })
  }

  // Slack webhook
  if (process.env.SLACK_WEBHOOK_URL) {
    const slack = new SlackAlertProvider({
      enabled: true,
      webhookUrl: process.env.SLACK_WEBHOOK_URL,
      type: 'slack',
      rateLimitMs: parseInt(process.env.ALERT_RATE_LIMIT_MS || '60000')
    })
    manager.addProvider(slack)
    logger.info('Slack alerts initialized', {}, { component: 'ALERTS' })
  }

  // Generic webhook (PagerDuty, Opsgenie, etc.)
  if (process.env.GENERIC_WEBHOOK_URL) {
    const generic = new GenericWebhookProvider({
      enabled: true,
      webhookUrl: process.env.GENERIC_WEBHOOK_URL,
      type: 'generic',
      rateLimitMs: parseInt(process.env.ALERT_RATE_LIMIT_MS || '60000')
    })
    manager.addProvider(generic)
    logger.info('Generic webhook alerts initialized', {}, { component: 'ALERTS' })
  }

  return manager
}

// Global alert manager instance
let globalAlertManager: AlertManager | null = null

/**
 * Get or create global alert manager
 */
export function getAlertManager(): AlertManager {
  if (!globalAlertManager) {
    globalAlertManager = initializeAlerts()
  }
  return globalAlertManager
}

/**
 * Convenience functions for common alert types
 */

export const SecurityAlerts = {
  rateLimitViolation: async (userId: string, endpoint: string, ip: string) => {
    const manager = getAlertManager()
    await manager.send({
      title: '🚨 Rate Limit Violation',
      message: `User exceeded rate limit on ${endpoint}`,
      severity: 'warning',
      source: 'SECURITY',
      metadata: {
        userId: userId.slice(0, 8) + '...',
        endpoint,
        ip: ip.slice(0, -5) + 'xxx'
      }
    })
  },

  unauthorizedAccess: async (userId: string, resource: string, ip: string) => {
    const manager = getAlertManager()
    await manager.sendCritical({
      title: '🔥 Unauthorized Access Attempt',
      message: `User attempted to access restricted resource: ${resource}`,
      severity: 'critical',
      source: 'SECURITY',
      metadata: {
        userId: userId.slice(0, 8) + '...',
        resource,
        ip: ip.slice(0, -5) + 'xxx'
      }
    })
  },

  suspiciousActivity: async (description: string, metadata?: Record<string, any>) => {
    const manager = getAlertManager()
    await manager.send({
      title: '⚠️ Suspicious Activity Detected',
      message: description,
      severity: 'warning',
      source: 'SECURITY',
      metadata
    })
  },

  dataExfiltration: async (userId: string, dataType: string, size: number) => {
    const manager = getAlertManager()
    await manager.sendCritical({
      title: '🔥 Potential Data Exfiltration',
      message: `Large ${dataType} export by user`,
      severity: 'critical',
      source: 'SECURITY',
      metadata: {
        userId: userId.slice(0, 8) + '...',
        dataType,
        sizeMB: Math.round(size / 1024 / 1024)
      }
    })
  }
}

export const SystemAlerts = {
  databaseDown: async () => {
    const manager = getAlertManager()
    await manager.sendCritical({
      title: '🔥 Database Connection Failed',
      message: 'Unable to connect to PostgreSQL database',
      severity: 'critical',
      source: 'SYSTEM'
    })
  },

  highMemory: async (percent: number) => {
    const manager = getAlertManager()
    await manager.send({
      title: '⚠️ High Memory Usage',
      message: `Memory usage at ${percent}%`,
      severity: percent > 90 ? 'error' : 'warning',
      source: 'SYSTEM',
      metadata: { memoryPercent: percent }
    })
  },

  degradedPerformance: async (component: string, responseTime: number) => {
    const manager = getAlertManager()
    await manager.send({
      title: '⚠️ Degraded Performance',
      message: `${component} response time elevated`,
      severity: 'warning',
      source: 'SYSTEM',
      metadata: { component, responseTimeMs: responseTime }
    })
  },

  deploymentFailed: async (error: string) => {
    const manager = getAlertManager()
    await manager.sendCritical({
      title: '🔥 Deployment Failed',
      message: error,
      severity: 'critical',
      source: 'DEPLOYMENT'
    })
  }
}

export const AdminAlerts = {
  userBanned: async (adminId: string, userId: string, reason: string) => {
    const manager = getAlertManager()
    await manager.send({
      title: 'ℹ️ User Banned',
      message: `Admin banned user: ${reason}`,
      severity: 'info',
      source: 'ADMIN',
      metadata: {
        adminId: adminId.slice(0, 8) + '...',
        userId: userId.slice(0, 8) + '...',
        reason
      }
    })
  },

  contentDeleted: async (adminId: string, contentType: string, contentId: string) => {
    const manager = getAlertManager()
    await manager.send({
      title: 'ℹ️ Content Deleted',
      message: `Admin deleted ${contentType}`,
      severity: 'info',
      source: 'ADMIN',
      metadata: {
        adminId: adminId.slice(0, 8) + '...',
        contentType,
        contentId: contentId.slice(0, 8) + '...'
      }
    })
  },

  massAction: async (adminId: string, action: string, count: number) => {
    const manager = getAlertManager()
    await manager.send({
      title: '⚠️ Mass Admin Action',
      message: `Admin performed bulk ${action} on ${count} items`,
      severity: 'warning',
      source: 'ADMIN',
      metadata: {
        adminId: adminId.slice(0, 8) + '...',
        action,
        count
      }
    })
  }
}

export default getAlertManager
