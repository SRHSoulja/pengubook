/**
 * SECURITY: Enhanced Structured Logging with PII Redaction
 * Production-ready logging utility with security-first approach
 */

type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
  component?: string
  requestId?: string
  userId?: string
  ip?: string
}

/**
 * SECURITY: PII Redaction - List of sensitive field names to redact
 */
const SENSITIVE_FIELDS = [
  'password',
  'passwordHash',
  'secret',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'token',
  'bearerToken',
  'sessionToken',
  'session_token',
  'privateKey',
  'private_key',
  'walletPrivateKey',
  'mnemonic',
  'seed',
  'seedPhrase',
  'email', // Partial redaction
  'phoneNumber',
  'phone_number',
  'ssn',
  'creditCard',
  'credit_card',
  'cvv',
  'pin',
  'authorization',
  'cookie'
]

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'
  private isTest = process.env.NODE_ENV === 'test'
  private logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (this.isDevelopment ? 'debug' : 'info')

  /**
   * SECURITY: Redact sensitive information from log data
   * Prevents PII leakage in logs
   */
  private redactSensitiveData(data: any, depth: number = 0): any {
    // Prevent infinite recursion
    if (depth > 10) return '[Max Depth Reached]'
    if (data === null || data === undefined) return data
    if (typeof data !== 'object') return data

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map(item => this.redactSensitiveData(item, depth + 1))
    }

    // Handle objects
    const redacted: any = {}
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase()

      // Check if key matches sensitive field patterns
      if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field.toLowerCase()))) {
        // Special handling for email - show partial
        if (lowerKey.includes('email') && typeof value === 'string') {
          const [local, domain] = value.split('@')
          redacted[key] = local ? `${local.slice(0, 2)}***@${domain}` : '[REDACTED]'
        } else {
          redacted[key] = '[REDACTED]'
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively redact nested objects
        redacted[key] = this.redactSensitiveData(value, depth + 1)
      } else {
        redacted[key] = value
      }
    }

    return redacted
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    if (this.isTest) return false // Silent in tests

    const levels: LogLevel[] = ['trace', 'debug', 'info', 'warn', 'error', 'fatal']
    const currentIndex = levels.indexOf(this.logLevel)
    const messageIndex = levels.indexOf(level)

    return messageIndex >= currentIndex
  }

  /**
   * Format log entry with security enhancements
   */
  private formatLog(level: LogLevel, message: string, data?: any, context?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      data: data ? this.redactSensitiveData(data) : undefined,
      timestamp: new Date().toISOString(),
      component: context?.component,
      requestId: context?.requestId,
      userId: context?.userId?.slice(0, 8) + '...', // Partial user ID
      ip: context?.ip
    }
  }

  /**
   * Output log entry to console/stream and external drains
   */
  private output(logEntry: LogEntry) {
    if (this.isProduction) {
      // Production: Output structured JSON for log aggregators
      console.log(JSON.stringify(logEntry))
    } else {
      // Development: Pretty print for readability
      const prefix = `[${logEntry.level.toUpperCase()}]${logEntry.component ? `[${logEntry.component}]` : ''}`
      const contextStr = logEntry.requestId ? `[${logEntry.requestId}]` : ''

      switch (logEntry.level) {
        case 'trace':
        case 'debug':
          console.debug(`${prefix}${contextStr} ${logEntry.message}`, logEntry.data || '')
          break
        case 'info':
          console.info(`${prefix}${contextStr} ${logEntry.message}`, logEntry.data || '')
          break
        case 'warn':
          console.warn(`${prefix}${contextStr} ${logEntry.message}`, logEntry.data || '')
          break
        case 'error':
        case 'fatal':
          console.error(`${prefix}${contextStr} ${logEntry.message}`, logEntry.data || '')
          break
      }
    }

    // Send to external log drains (non-blocking)
    this.sendToLogDrains(logEntry)
  }

  /**
   * Send log entry to external log drains (Datadog, Axiom, Loki)
   * Non-blocking - failures don't affect application
   */
  private sendToLogDrains(logEntry: LogEntry) {
    // Only send in production or if explicitly enabled
    if (!this.isProduction && process.env.LOG_DRAIN_ENABLED !== 'true') {
      return
    }

    // Lazy load log-drain to avoid circular dependencies
    setImmediate(async () => {
      try {
        const { drainLog } = await import('@/lib/log-drain')
        drainLog({
          timestamp: logEntry.timestamp,
          level: logEntry.level,
          message: logEntry.message,
          data: logEntry.data,
          context: {
            component: logEntry.component,
            requestId: logEntry.requestId,
            userId: logEntry.userId,
            ip: logEntry.ip
          },
          metadata: {
            version: '2.7.4',
            environment: process.env.NODE_ENV || 'development',
            hostname: process.env.HOSTNAME
          }
        })
      } catch (error) {
        // Silently fail - log drain errors should not crash app
        // Only log to console in development
        if (!this.isProduction) {
          console.error('[LOG_DRAIN] Error:', error)
        }
      }
    })
  }

  /**
   * Log level methods
   */
  trace(message: string, data?: any, context?: Record<string, any>) {
    if (this.shouldLog('trace')) {
      const logEntry = this.formatLog('trace', message, data, context)
      this.output(logEntry)
    }
  }

  debug(message: string, data?: any, context?: Record<string, any>) {
    if (this.shouldLog('debug')) {
      const logEntry = this.formatLog('debug', message, data, context)
      this.output(logEntry)
    }
  }

  info(message: string, data?: any, context?: Record<string, any>) {
    if (this.shouldLog('info')) {
      const logEntry = this.formatLog('info', message, data, context)
      this.output(logEntry)
    }
  }

  warn(message: string, data?: any, context?: Record<string, any>) {
    if (this.shouldLog('warn')) {
      const logEntry = this.formatLog('warn', message, data, context)
      this.output(logEntry)
    }
  }

  error(message: string, data?: any, context?: Record<string, any>) {
    if (this.shouldLog('error')) {
      const logEntry = this.formatLog('error', message, data, context)
      this.output(logEntry)
    }
  }

  fatal(message: string, data?: any, context?: Record<string, any>) {
    if (this.shouldLog('fatal')) {
      const logEntry = this.formatLog('fatal', message, data, context)
      this.output(logEntry)
    }
  }

  /**
   * Create child logger with persistent context
   * Useful for request-scoped logging
   */
  child(context: Record<string, any>): ChildLogger {
    return new ChildLogger(this, context)
  }
}

/**
 * Child logger with inherited context
 */
class ChildLogger {
  constructor(
    private parent: Logger,
    private context: Record<string, any>
  ) {}

  private mergeContext(additionalContext?: Record<string, any>) {
    return { ...this.context, ...additionalContext }
  }

  trace(message: string, data?: any, context?: Record<string, any>) {
    this.parent.trace(message, data, this.mergeContext(context))
  }

  debug(message: string, data?: any, context?: Record<string, any>) {
    this.parent.debug(message, data, this.mergeContext(context))
  }

  info(message: string, data?: any, context?: Record<string, any>) {
    this.parent.info(message, data, this.mergeContext(context))
  }

  warn(message: string, data?: any, context?: Record<string, any>) {
    this.parent.warn(message, data, this.mergeContext(context))
  }

  error(message: string, data?: any, context?: Record<string, any>) {
    this.parent.error(message, data, this.mergeContext(context))
  }

  fatal(message: string, data?: any, context?: Record<string, any>) {
    this.parent.fatal(message, data, this.mergeContext(context))
  }
}

export const logger = new Logger()

/**
 * SECURITY: Enhanced convenience functions for common logging patterns
 * All functions include automatic PII redaction
 */

export const logAPI = {
  request: (endpoint: string, data?: any, context?: Record<string, any>) => {
    logger.debug(`API Request: ${endpoint}`, data, { ...context, component: 'API' })
  },

  response: (endpoint: string, status: number, data?: any, context?: Record<string, any>) => {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'debug'
    logger[level](`API Response: ${endpoint} [${status}]`, data, { ...context, component: 'API' })
  },

  error: (endpoint: string, error: any, context?: Record<string, any>) => {
    logger.error(`API Error: ${endpoint}`, {
      error: error.message || error,
      stack: error.stack
    }, { ...context, component: 'API' })
  }
}

export const logAuth = {
  login: (userId: string, method: string, ip?: string) => {
    logger.info(`User login: ${method}`, { userId: userId.slice(0, 8) + '...' }, { component: 'AUTH', ip })
  },

  logout: (userId: string, ip?: string) => {
    logger.info(`User logout`, { userId: userId.slice(0, 8) + '...' }, { component: 'AUTH', ip })
  },

  register: (userId: string, method: string, ip?: string) => {
    logger.info(`User registered: ${method}`, { userId: userId.slice(0, 8) + '...' }, { component: 'AUTH', ip })
  },

  failed: (reason: string, data?: any, ip?: string) => {
    logger.warn(`Authentication failed: ${reason}`, data, { component: 'AUTH', ip })
  },

  tokenRefresh: (userId: string, success: boolean, ip?: string) => {
    logger.info(`Token refresh: ${success ? 'success' : 'failed'}`, {
      userId: userId.slice(0, 8) + '...',
      success
    }, { component: 'AUTH', ip })
  }
}

/**
 * SECURITY: Security event logging
 * Track all security-related events for monitoring
 */
export const logSecurity = {
  csrfViolation: (userId?: string, ip?: string, requestId?: string) => {
    logger.warn('CSRF token validation failed', { userId: userId?.slice(0, 8) + '...' }, {
      component: 'SECURITY',
      ip,
      requestId
    })
  },

  rateLimitExceeded: (userId?: string, ip?: string, endpoint?: string) => {
    logger.warn('Rate limit exceeded', {
      userId: userId?.slice(0, 8) + '...',
      endpoint
    }, { component: 'SECURITY', ip })
  },

  unauthorizedAccess: (resource: string, userId?: string, ip?: string) => {
    logger.warn('Unauthorized access attempt', {
      userId: userId?.slice(0, 8) + '...',
      resource
    }, { component: 'SECURITY', ip })
  },

  replayAttack: (tokenHash: string, userId?: string, ip?: string) => {
    logger.error('Replay attack detected', {
      tokenHash: tokenHash.slice(0, 8) + '...',
      userId: userId?.slice(0, 8) + '...'
    }, { component: 'SECURITY', ip })
  },

  suspiciousActivity: (description: string, userId?: string, ip?: string, data?: any) => {
    logger.warn(`Suspicious activity: ${description}`, {
      userId: userId?.slice(0, 8) + '...',
      ...data
    }, { component: 'SECURITY', ip })
  }
}

/**
 * SECURITY: Admin action logging (complements database logging)
 */
export const logAdmin = {
  action: (adminId: string, adminName: string, action: string, targetId: string, success: boolean, error?: string) => {
    logger.info(`Admin action: ${action}`, {
      adminId: adminId.slice(0, 8) + '...',
      adminName,
      targetId: targetId.slice(0, 8) + '...',
      success,
      ...(error && { error })
    }, { component: 'ADMIN' })
  }
}

export const logDB = {
  query: (operation: string, table: string, data?: any, context?: Record<string, any>) => {
    logger.debug(`DB ${operation}: ${table}`, data, { ...context, component: 'DATABASE' })
  },

  slowQuery: (operation: string, table: string, duration: number, threshold: number) => {
    logger.warn(`Slow DB query: ${operation} on ${table}`, {
      duration: `${duration}ms`,
      threshold: `${threshold}ms`
    }, { component: 'DATABASE' })
  },

  error: (operation: string, table: string, error: any, context?: Record<string, any>) => {
    logger.error(`DB Error: ${operation} on ${table}`, {
      error: error.message || error,
      stack: error.stack
    }, { ...context, component: 'DATABASE' })
  }
}

/**
 * Create request-scoped logger with correlation ID
 * Use for tracking requests across microservices/functions
 */
export function createRequestLogger(requestId: string, context?: Record<string, any>) {
  return logger.child({
    requestId,
    ...context
  })
}

// Export default logger instance
export default logger