// Production-safe logging utility

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  data?: any
  timestamp: string
  component?: string
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'
  private isProduction = process.env.NODE_ENV === 'production'

  private formatLog(level: LogLevel, message: string, data?: any, component?: string): LogEntry {
    return {
      level,
      message,
      data,
      timestamp: new Date().toISOString(),
      component
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (this.isDevelopment) {
      return true // Log everything in development
    }

    if (this.isProduction) {
      // In production, only log info, warn, and error
      return ['info', 'warn', 'error'].includes(level)
    }

    return true // Default behavior
  }

  debug(message: string, data?: any, component?: string) {
    if (this.shouldLog('debug')) {
      const logEntry = this.formatLog('debug', message, data, component)
      console.debug(`[DEBUG${component ? `][${component}` : ''}] ${message}`, data || '')
    }
  }

  info(message: string, data?: any, component?: string) {
    if (this.shouldLog('info')) {
      const logEntry = this.formatLog('info', message, data, component)
      console.info(`[INFO${component ? `][${component}` : ''}] ${message}`, data || '')
    }
  }

  warn(message: string, data?: any, component?: string) {
    if (this.shouldLog('warn')) {
      const logEntry = this.formatLog('warn', message, data, component)
      console.warn(`[WARN${component ? `][${component}` : ''}] ${message}`, data || '')
    }
  }

  error(message: string, data?: any, component?: string) {
    if (this.shouldLog('error')) {
      const logEntry = this.formatLog('error', message, data, component)
      console.error(`[ERROR${component ? `][${component}` : ''}] ${message}`, data || '')
    }
  }

  // Structured logging for production monitoring
  structured(level: LogLevel, message: string, data?: any, component?: string) {
    if (this.shouldLog(level)) {
      const logEntry = this.formatLog(level, message, data, component)

      if (this.isProduction) {
        // In production, output structured JSON for log aggregation
        console.log(JSON.stringify(logEntry))
      } else {
        // In development, use regular console methods for better DX
        this[level](message, data, component)
      }
    }
  }
}

export const logger = new Logger()

// Convenience functions for common logging patterns
export const logAPI = {
  request: (endpoint: string, data?: any) => {
    logger.debug(`API Request: ${endpoint}`, data, 'API')
  },

  response: (endpoint: string, status: number, data?: any) => {
    if (status >= 400) {
      logger.warn(`API Response: ${endpoint} [${status}]`, data, 'API')
    } else {
      logger.debug(`API Response: ${endpoint} [${status}]`, data, 'API')
    }
  },

  error: (endpoint: string, error: any) => {
    logger.error(`API Error: ${endpoint}`, {
      error: error.message || error,
      stack: error.stack
    }, 'API')
  }
}

export const logAuth = {
  login: (userId: string, method: string) => {
    logger.info(`User login: ${method}`, { userId: userId.slice(0, 8) + '...' }, 'AUTH')
  },

  logout: (userId: string) => {
    logger.info(`User logout`, { userId: userId.slice(0, 8) + '...' }, 'AUTH')
  },

  failed: (reason: string, data?: any) => {
    logger.warn(`Authentication failed: ${reason}`, data, 'AUTH')
  }
}

export const logDB = {
  query: (operation: string, table: string, data?: any) => {
    logger.debug(`DB ${operation}: ${table}`, data, 'DATABASE')
  },

  error: (operation: string, table: string, error: any) => {
    logger.error(`DB Error: ${operation} on ${table}`, {
      error: error.message || error,
      stack: error.stack
    }, 'DATABASE')
  }
}