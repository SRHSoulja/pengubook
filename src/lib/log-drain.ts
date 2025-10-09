/**
 * OPERATIONS: Log Drain Integration
 *
 * Sends structured logs to external observability platforms:
 * - Datadog: APM and log management
 * - Axiom: Serverless-native log analytics
 * - Grafana Loki: Open-source log aggregation
 *
 * Supports batching, retry logic, and graceful degradation.
 */

import { logger } from '@/lib/logger'

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  data?: any
  context?: {
    requestId?: string
    userId?: string
    ip?: string
    component?: string
  }
  metadata?: {
    version?: string
    environment?: string
    hostname?: string
  }
}

interface LogDrainConfig {
  enabled: boolean
  batchSize: number
  flushInterval: number // milliseconds
  retryAttempts: number
  retryDelay: number // milliseconds
}

/**
 * Base class for log drain implementations
 */
abstract class LogDrain {
  protected config: LogDrainConfig
  protected buffer: LogEntry[] = []
  protected flushTimer?: NodeJS.Timeout

  constructor(config: Partial<LogDrainConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      batchSize: config.batchSize ?? 100,
      flushInterval: config.flushInterval ?? 10000, // 10 seconds
      retryAttempts: config.retryAttempts ?? 3,
      retryDelay: config.retryDelay ?? 1000
    }

    if (this.config.enabled) {
      this.startFlushTimer()
    }
  }

  /**
   * Add log entry to buffer
   */
  public log(entry: LogEntry): void {
    if (!this.config.enabled) return

    this.buffer.push(entry)

    // Flush if buffer is full
    if (this.buffer.length >= this.config.batchSize) {
      this.flush()
    }
  }

  /**
   * Flush buffer to external service
   */
  public async flush(): Promise<void> {
    if (this.buffer.length === 0) return

    const batch = [...this.buffer]
    this.buffer = []

    try {
      await this.send(batch)
    } catch (error: any) {
      // On failure, add logs back to buffer for retry
      this.buffer.push(...batch)
      logger.error('Log drain flush failed', {
        error: error.message,
        drainType: this.constructor.name,
        batchSize: batch.length
      }, { component: 'LOG_DRAIN' })
    }
  }

  /**
   * Start periodic flush timer
   */
  protected startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushInterval)
  }

  /**
   * Stop flush timer (cleanup)
   */
  public stop(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }
    this.flush() // Final flush
  }

  /**
   * Send logs to external service (implemented by subclasses)
   */
  protected abstract send(logs: LogEntry[]): Promise<void>
}

/**
 * Datadog Log Drain
 * https://docs.datadoghq.com/api/latest/logs/
 */
export class DatadogLogDrain extends LogDrain {
  private apiKey: string
  private site: string // e.g., 'datadoghq.com' or 'datadoghq.eu'
  private service: string
  private hostname: string

  constructor(
    apiKey: string,
    options: {
      site?: string
      service?: string
      hostname?: string
    } & Partial<LogDrainConfig> = {}
  ) {
    super(options)
    this.apiKey = apiKey
    this.site = options.site || 'datadoghq.com'
    this.service = options.service || 'pebloq'
    this.hostname = options.hostname || process.env.HOSTNAME || 'vercel'
  }

  protected async send(logs: LogEntry[]): Promise<void> {
    const url = `https://http-intake.logs.${this.site}/api/v2/logs`

    // Transform to Datadog format
    const ddLogs = logs.map(log => ({
      ddsource: 'nodejs',
      ddtags: `env:${process.env.NODE_ENV},service:${this.service},version:2.7.4`,
      hostname: this.hostname,
      message: log.message,
      status: log.level,
      timestamp: new Date(log.timestamp).getTime(),
      ...log.data,
      context: log.context,
      metadata: log.metadata
    }))

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'DD-API-KEY': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ddLogs)
    })

    if (!response.ok) {
      throw new Error(`Datadog API error: ${response.status} ${response.statusText}`)
    }
  }
}

/**
 * Axiom Log Drain
 * https://axiom.co/docs/send-data/ingest
 */
export class AxiomLogDrain extends LogDrain {
  private apiToken: string
  private dataset: string
  private orgId?: string

  constructor(
    apiToken: string,
    dataset: string,
    options: {
      orgId?: string
    } & Partial<LogDrainConfig> = {}
  ) {
    super(options)
    this.apiToken = apiToken
    this.dataset = dataset
    this.orgId = options.orgId
  }

  protected async send(logs: LogEntry[]): Promise<void> {
    const url = `https://api.axiom.co/v1/datasets/${this.dataset}/ingest`

    // Axiom expects array of JSON objects
    const axiomLogs = logs.map(log => ({
      _time: log.timestamp,
      level: log.level,
      message: log.message,
      ...log.data,
      ...log.context,
      ...log.metadata,
      service: 'pebloq',
      version: '2.7.4',
      environment: process.env.NODE_ENV || 'development'
    }))

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json'
    }

    if (this.orgId) {
      headers['X-Axiom-Org-Id'] = this.orgId
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(axiomLogs)
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Axiom API error: ${response.status} ${text}`)
    }
  }
}

/**
 * Grafana Loki Log Drain
 * https://grafana.com/docs/loki/latest/api/#push-log-entries-to-loki
 */
export class LokiLogDrain extends LogDrain {
  private url: string
  private username?: string
  private password?: string
  private tenant?: string

  constructor(
    url: string,
    options: {
      username?: string
      password?: string
      tenant?: string
    } & Partial<LogDrainConfig> = {}
  ) {
    super(options)
    this.url = url
    this.username = options.username
    this.password = options.password
    this.tenant = options.tenant
  }

  protected async send(logs: LogEntry[]): Promise<void> {
    // Group logs by labels for Loki streams
    const streams: Record<string, any[]> = {}

    for (const log of logs) {
      const labels = {
        level: log.level,
        component: log.context?.component || 'app',
        environment: process.env.NODE_ENV || 'development',
        service: 'pebloq',
        version: '2.7.4'
      }

      const labelKey = JSON.stringify(labels)

      if (!streams[labelKey]) {
        streams[labelKey] = []
      }

      // Loki expects [timestamp_ns, log_line]
      const timestampNs = (new Date(log.timestamp).getTime() * 1000000).toString()
      const logLine = JSON.stringify({
        message: log.message,
        ...log.data,
        ...log.context
      })

      streams[labelKey].push([timestampNs, logLine])
    }

    // Transform to Loki format
    const lokiPayload = {
      streams: Object.entries(streams).map(([labelKey, values]) => ({
        stream: JSON.parse(labelKey),
        values
      }))
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Basic auth if provided
    if (this.username && this.password) {
      const auth = Buffer.from(`${this.username}:${this.password}`).toString('base64')
      headers['Authorization'] = `Basic ${auth}`
    }

    // Multi-tenant support
    if (this.tenant) {
      headers['X-Scope-OrgID'] = this.tenant
    }

    const response = await fetch(`${this.url}/loki/api/v1/push`, {
      method: 'POST',
      headers,
      body: JSON.stringify(lokiPayload)
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Loki API error: ${response.status} ${text}`)
    }
  }
}

/**
 * Console Log Drain (for development/testing)
 */
export class ConsoleLogDrain extends LogDrain {
  protected async send(logs: LogEntry[]): Promise<void> {
    for (const log of logs) {
      console.log(JSON.stringify(log))
    }
  }
}

/**
 * Log Drain Manager
 * Manages multiple log drains and distributes logs
 */
export class LogDrainManager {
  private drains: LogDrain[] = []
  private isShuttingDown = false

  /**
   * Add a log drain
   */
  public addDrain(drain: LogDrain): void {
    this.drains.push(drain)
  }

  /**
   * Send log entry to all drains
   */
  public log(entry: LogEntry): void {
    if (this.isShuttingDown) return

    for (const drain of this.drains) {
      try {
        drain.log(entry)
      } catch (error: any) {
        // Fail silently to prevent log drain from crashing app
        console.error('Log drain error:', error.message)
      }
    }
  }

  /**
   * Flush all drains
   */
  public async flush(): Promise<void> {
    await Promise.all(this.drains.map(drain => drain.flush()))
  }

  /**
   * Shutdown all drains (call on process exit)
   */
  public async shutdown(): Promise<void> {
    this.isShuttingDown = true
    await Promise.all(this.drains.map(drain => drain.stop()))
  }
}

/**
 * Initialize log drains based on environment variables
 */
export function initializeLogDrains(): LogDrainManager {
  const manager = new LogDrainManager()

  // Datadog
  if (process.env.DATADOG_API_KEY) {
    const datadog = new DatadogLogDrain(process.env.DATADOG_API_KEY, {
      site: process.env.DATADOG_SITE || 'datadoghq.com',
      service: process.env.DATADOG_SERVICE || 'pebloq',
      hostname: process.env.HOSTNAME
    })
    manager.addDrain(datadog)
    logger.info('Datadog log drain initialized', {}, { component: 'LOG_DRAIN' })
  }

  // Axiom
  if (process.env.AXIOM_TOKEN && process.env.AXIOM_DATASET) {
    const axiom = new AxiomLogDrain(
      process.env.AXIOM_TOKEN,
      process.env.AXIOM_DATASET,
      {
        orgId: process.env.AXIOM_ORG_ID
      }
    )
    manager.addDrain(axiom)
    logger.info('Axiom log drain initialized', {}, { component: 'LOG_DRAIN' })
  }

  // Grafana Loki
  if (process.env.LOKI_URL) {
    const loki = new LokiLogDrain(process.env.LOKI_URL, {
      username: process.env.LOKI_USERNAME,
      password: process.env.LOKI_PASSWORD,
      tenant: process.env.LOKI_TENANT
    })
    manager.addDrain(loki)
    logger.info('Loki log drain initialized', {}, { component: 'LOG_DRAIN' })
  }

  // Console drain for development
  if (process.env.NODE_ENV === 'development' && process.env.LOG_DRAIN_CONSOLE === 'true') {
    manager.addDrain(new ConsoleLogDrain())
    logger.info('Console log drain initialized', {}, { component: 'LOG_DRAIN' })
  }

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down log drains...', {}, { component: 'LOG_DRAIN' })
    await manager.shutdown()
    process.exit(0)
  }

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)

  return manager
}

// Global log drain manager instance
let globalLogDrainManager: LogDrainManager | null = null

/**
 * Get or create global log drain manager
 */
export function getLogDrainManager(): LogDrainManager {
  if (!globalLogDrainManager) {
    globalLogDrainManager = initializeLogDrains()
  }
  return globalLogDrainManager
}

/**
 * Send log to all configured drains
 */
export function drainLog(entry: LogEntry): void {
  const manager = getLogDrainManager()
  manager.log(entry)
}
