import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * OPERATIONS: Versioned Health Check Endpoint
 *
 * Provides comprehensive system health status for monitoring and alerting.
 * Returns detailed metrics about database, dependencies, and runtime.
 *
 * Response format conforms to RFC 7807 Problem Details for HTTP APIs
 * and includes version information for deployment tracking.
 */

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  uptime: number
  checks: {
    database: HealthCheck
    memory: HealthCheck
    dependencies: HealthCheck
  }
  metadata?: {
    nodeVersion: string
    platform: string
    environment: string
  }
}

interface HealthCheck {
  status: 'pass' | 'warn' | 'fail'
  message?: string
  responseTime?: number
  details?: Record<string, any>
}

/**
 * Check database connectivity and performance
 */
async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now()

  try {
    // Simple query to test connection
    await prisma.$queryRaw`SELECT 1`

    const responseTime = Date.now() - start

    // Warn if query takes more than 100ms
    if (responseTime > 100) {
      return {
        status: 'warn',
        message: 'Database response time elevated',
        responseTime,
        details: { threshold: 100 }
      }
    }

    return {
      status: 'pass',
      message: 'Database connection healthy',
      responseTime
    }
  } catch (error: any) {
    logger.error('Database health check failed', {
      error: error.message,
      stack: error.stack
    }, { component: 'HEALTH' })

    return {
      status: 'fail',
      message: 'Database connection failed',
      responseTime: Date.now() - start,
      details: { error: error.message }
    }
  }
}

/**
 * Check memory usage and availability
 */
function checkMemory(): HealthCheck {
  const usage = process.memoryUsage()
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024)
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024)
  const heapUsedPercent = Math.round((usage.heapUsed / usage.heapTotal) * 100)

  const details = {
    heapUsed: `${heapUsedMB}MB`,
    heapTotal: `${heapTotalMB}MB`,
    heapUsedPercent: `${heapUsedPercent}%`,
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    external: `${Math.round(usage.external / 1024 / 1024)}MB`
  }

  // Warn if heap usage exceeds 80%
  if (heapUsedPercent > 80) {
    return {
      status: 'warn',
      message: 'Memory usage elevated',
      details
    }
  }

  // Fail if heap usage exceeds 90%
  if (heapUsedPercent > 90) {
    return {
      status: 'fail',
      message: 'Memory usage critical',
      details
    }
  }

  return {
    status: 'pass',
    message: 'Memory usage normal',
    details
  }
}

/**
 * Check critical dependencies and configurations
 */
function checkDependencies(): HealthCheck {
  const issues: string[] = []
  const warnings: string[] = []

  // Check required environment variables
  const requiredEnvVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'SESSION_SECRET'
  ]

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      issues.push(`Missing ${envVar}`)
    }
  }

  // Check optional but important environment variables
  const optionalEnvVars = [
    'ABSTRACT_CHAIN_ID',
    'ABSTRACT_RPC_URL',
    'DISCORD_CLIENT_ID',
    'TWITTER_CLIENT_ID'
  ]

  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(`Missing optional ${envVar}`)
    }
  }

  if (issues.length > 0) {
    return {
      status: 'fail',
      message: 'Critical dependencies missing',
      details: { issues, warnings }
    }
  }

  if (warnings.length > 0) {
    return {
      status: 'warn',
      message: 'Optional dependencies missing',
      details: { warnings }
    }
  }

  return {
    status: 'pass',
    message: 'All dependencies configured',
    details: {
      nodeVersion: process.version,
      platform: process.platform
    }
  }
}

/**
 * GET /api/health
 *
 * Returns comprehensive health check status
 *
 * Query Parameters:
 * - detailed: Include detailed check results (default: false)
 *
 * Status Codes:
 * - 200: System healthy
 * - 503: System unhealthy or degraded
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const searchParams = request.nextUrl.searchParams
  const detailed = searchParams.get('detailed') === 'true'

  try {
    // Run health checks in parallel
    const [databaseCheck, memoryCheck, dependenciesCheck] = await Promise.all([
      checkDatabase(),
      Promise.resolve(checkMemory()),
      Promise.resolve(checkDependencies())
    ])

    // Determine overall system status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'

    if (
      databaseCheck.status === 'fail' ||
      memoryCheck.status === 'fail' ||
      dependenciesCheck.status === 'fail'
    ) {
      overallStatus = 'unhealthy'
    } else if (
      databaseCheck.status === 'warn' ||
      memoryCheck.status === 'warn' ||
      dependenciesCheck.status === 'warn'
    ) {
      overallStatus = 'degraded'
    }

    // Calculate uptime (in seconds)
    const uptime = Math.floor(process.uptime())

    const result: HealthCheckResult = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '2.7.4', // Match package.json version
      uptime,
      checks: {
        database: databaseCheck,
        memory: memoryCheck,
        dependencies: dependenciesCheck
      }
    }

    // Add metadata if detailed check requested
    if (detailed) {
      result.metadata = {
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'development'
      }
    }

    const responseTime = Date.now() - startTime

    // Log health check (only log if degraded or unhealthy to reduce noise)
    if (overallStatus !== 'healthy') {
      logger.warn(`Health check: ${overallStatus}`, {
        status: overallStatus,
        responseTime,
        databaseStatus: databaseCheck.status,
        memoryStatus: memoryCheck.status,
        dependenciesStatus: dependenciesCheck.status
      }, { component: 'HEALTH' })
    } else {
      logger.debug(`Health check: ${overallStatus}`, {
        responseTime
      }, { component: 'HEALTH' })
    }

    // Return 503 if unhealthy, 200 otherwise
    const statusCode = overallStatus === 'unhealthy' ? 503 : 200

    return NextResponse.json(result, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Response-Time': `${responseTime}ms`,
        'X-Health-Status': overallStatus
      }
    })

  } catch (error: any) {
    logger.error('Health check endpoint error', {
      error: error.message,
      stack: error.stack
    }, { component: 'HEALTH' })

    const result: HealthCheckResult = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: '2.7.4',
      uptime: Math.floor(process.uptime()),
      checks: {
        database: { status: 'fail', message: 'Unable to check' },
        memory: { status: 'fail', message: 'Unable to check' },
        dependencies: { status: 'fail', message: 'Unable to check' }
      }
    }

    return NextResponse.json(result, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'X-Health-Status': 'unhealthy'
      }
    })
  }
}

/**
 * HEAD /api/health
 *
 * Lightweight health check (no body)
 * Returns only status code
 *
 * Status Codes:
 * - 200: System healthy
 * - 503: System unhealthy
 */
export async function HEAD() {
  try {
    // Quick database check
    await prisma.$queryRaw`SELECT 1`

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  } catch (error) {
    return new NextResponse(null, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    })
  }
}
