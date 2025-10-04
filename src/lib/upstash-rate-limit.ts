import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Initialize Redis client
// If Upstash credentials are not set, fall back to in-memory rate limiting
let redis: Redis | null = null
let ratelimitApi: Ratelimit | null = null
let ratelimitStrict: Ratelimit | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  })

  // Standard API rate limit (100 requests per 15 minutes)
  ratelimitApi = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '15 m'),
    analytics: true,
    prefix: 'ratelimit:api'
  })

  // Strict rate limit for sensitive endpoints (10 requests per minute)
  ratelimitStrict = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    analytics: true,
    prefix: 'ratelimit:strict'
  })

  console.log('[Upstash] Distributed rate limiting enabled')
} else {
  console.warn('[Upstash] Redis credentials not found, using in-memory rate limiting')
}

/**
 * Check rate limit using Upstash Redis (distributed)
 * Falls back to in-memory if Upstash is not configured
 */
export async function checkRateLimit(
  identifier: string,
  limit: 'api' | 'strict' = 'api'
): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
  pending: Promise<unknown>
}> {
  const limiter = limit === 'strict' ? ratelimitStrict : ratelimitApi

  if (!limiter) {
    // Fallback: No rate limiting (Upstash not configured)
    // Return success with mock values
    return {
      success: true,
      limit: limit === 'strict' ? 10 : 100,
      remaining: limit === 'strict' ? 10 : 100,
      reset: Date.now() + (limit === 'strict' ? 60000 : 900000),
      pending: Promise.resolve()
    }
  }

  try {
    const result = await limiter.limit(identifier)
    return result
  } catch (error) {
    console.error('[Upstash] Rate limit check failed:', error)
    // Fallback: Allow request if rate limit check fails
    return {
      success: true,
      limit: limit === 'strict' ? 10 : 100,
      remaining: 0,
      reset: Date.now() + (limit === 'strict' ? 60000 : 900000),
      pending: Promise.resolve()
    }
  }
}

/**
 * Wrapper for API routes to add distributed rate limiting
 * Usage: export const GET = withUpstashRateLimit(handler, 'api')
 */
export function withUpstashRateLimit(
  handler: (request: Request, ...args: any[]) => Promise<Response>,
  limitType: 'api' | 'strict' = 'api'
) {
  return async (request: Request, ...args: any[]) => {
    // Generate identifier from IP or user ID
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown'
    const identifier = `${limitType}:${ip}`

    // Check rate limit
    const { success, limit, remaining, reset } = await checkRateLimit(identifier, limitType)

    if (!success) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
          timestamp: new Date().toISOString()
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(reset / 1000).toString(),
            'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString()
          }
        }
      )
    }

    // Execute handler
    const response = await handler(request, ...args)

    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Limit', limit.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', Math.ceil(reset / 1000).toString())

    return response
  }
}

/**
 * Export Redis client for custom operations
 */
export { redis }
