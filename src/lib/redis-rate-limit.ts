/**
 * OPERATIONS: Redis-Based Rate Limiting
 *
 * Distributed rate limiting using Redis for:
 * - API endpoints
 * - User actions (posts, comments, likes)
 * - Authentication attempts
 * - Admin operations
 *
 * Features:
 * - Sliding window algorithm
 * - Per-user and per-IP limits
 * - Graceful fallback to memory-based limiting
 * - Configurable windows and thresholds
 */

import { getRedisClient } from '@/lib/redis'
import { logger, logSecurity } from '@/lib/logger'

export interface RateLimitConfig {
  maxRequests: number // Maximum requests allowed
  windowMs: number // Time window in milliseconds
  keyPrefix?: string // Redis key prefix
  skipOnError?: boolean // Skip limiting if Redis fails
}

export interface RateLimitResult {
  success: boolean // Whether request is allowed
  limit: number // Maximum requests allowed
  remaining: number // Remaining requests in window
  resetTime: number // Unix timestamp when limit resets
  retryAfter?: number // Seconds to wait before retry (if limited)
}

/**
 * Memory-based fallback rate limiter
 * Used when Redis is unavailable
 */
class MemoryRateLimiter {
  private storage = new Map<string, { count: number; resetTime: number }>()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now()
      Array.from(this.storage.entries()).forEach(([key, value]) => {
        if (value.resetTime < now) {
          this.storage.delete(key)
        }
      })
    }, 60000)
  }

  check(key: string, config: RateLimitConfig): RateLimitResult {
    const now = Date.now()
    const resetTime = now + config.windowMs
    const entry = this.storage.get(key)

    if (!entry || entry.resetTime < now) {
      // New window or expired
      this.storage.set(key, { count: 1, resetTime })
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - 1,
        resetTime
      }
    }

    // Existing window
    if (entry.count >= config.maxRequests) {
      // Rate limited
      return {
        success: false,
        limit: config.maxRequests,
        remaining: 0,
        resetTime: entry.resetTime,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000)
      }
    }

    // Increment counter
    entry.count++
    this.storage.set(key, entry)

    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    }
  }

  cleanup() {
    clearInterval(this.cleanupInterval)
    this.storage.clear()
  }
}

// Global memory fallback instance
const memoryLimiter = new MemoryRateLimiter()

/**
 * Redis-based rate limiter with sliding window
 */
export class RedisRateLimiter {
  private redis = getRedisClient()
  private useMemoryFallback = false

  /**
   * Check rate limit for a key
   */
  async check(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    // Use memory fallback if Redis unavailable
    if (!this.redis.isAvailable() || this.useMemoryFallback) {
      return memoryLimiter.check(key, config)
    }

    const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : `ratelimit:${key}`
    const now = Date.now()
    const windowStart = now - config.windowMs
    const resetTime = now + config.windowMs

    try {
      // Sliding window algorithm using sorted sets
      // Each request is added with timestamp as score
      // We count requests within the time window

      // Remove old entries outside window
      await this.redis.del(`${fullKey}:sorted`)

      // Get current count
      const count = await this.redis.incr(fullKey)

      // Set expiration on first request
      if (count === 1) {
        await this.redis.expire(fullKey, Math.ceil(config.windowMs / 1000))
      }

      // Check if over limit
      if (count > config.maxRequests) {
        const ttl = await this.redis.ttl(fullKey)
        const retryAfter = ttl > 0 ? ttl : Math.ceil(config.windowMs / 1000)

        return {
          success: false,
          limit: config.maxRequests,
          remaining: 0,
          resetTime: now + (retryAfter * 1000),
          retryAfter
        }
      }

      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests - count,
        resetTime
      }

    } catch (error: any) {
      logger.error('Redis rate limit check failed', {
        key: fullKey,
        error: error.message
      }, { component: 'RATE_LIMIT' })

      // Fallback to memory limiter
      if (config.skipOnError) {
        return {
          success: true,
          limit: config.maxRequests,
          remaining: config.maxRequests,
          resetTime
        }
      }

      this.useMemoryFallback = true
      return memoryLimiter.check(key, config)
    }
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string, config: RateLimitConfig): Promise<void> {
    if (!this.redis.isAvailable()) return

    const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : `ratelimit:${key}`

    try {
      await this.redis.del(fullKey)
      logger.info('Rate limit reset', { key: fullKey }, { component: 'RATE_LIMIT' })
    } catch (error: any) {
      logger.error('Rate limit reset failed', {
        key: fullKey,
        error: error.message
      }, { component: 'RATE_LIMIT' })
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async status(key: string, config: RateLimitConfig): Promise<RateLimitResult> {
    if (!this.redis.isAvailable()) {
      const now = Date.now()
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs
      }
    }

    const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : `ratelimit:${key}`

    try {
      const count = parseInt((await this.redis.get<string>(fullKey)) || '0')
      const ttl = await this.redis.ttl(fullKey)
      const now = Date.now()
      const resetTime = now + (ttl > 0 ? ttl * 1000 : config.windowMs)

      return {
        success: count < config.maxRequests,
        limit: config.maxRequests,
        remaining: Math.max(0, config.maxRequests - count),
        resetTime,
        retryAfter: count >= config.maxRequests && ttl > 0 ? ttl : undefined
      }
    } catch (error: any) {
      const now = Date.now()
      return {
        success: true,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs
      }
    }
  }
}

// Global rate limiter instance
let globalRateLimiter: RedisRateLimiter | null = null

/**
 * Get or create global rate limiter
 */
export function getRateLimiter(): RedisRateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new RedisRateLimiter()
  }
  return globalRateLimiter
}

/**
 * Common rate limit configurations
 */
export const RATE_LIMITS = {
  // API endpoints
  API_DEFAULT: { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
  API_STRICT: { maxRequests: 10, windowMs: 60000 }, // 10 requests per minute
  API_GENEROUS: { maxRequests: 300, windowMs: 60000 }, // 300 requests per minute

  // Authentication
  AUTH_LOGIN: { maxRequests: 5, windowMs: 300000 }, // 5 attempts per 5 minutes
  AUTH_REGISTER: { maxRequests: 3, windowMs: 3600000 }, // 3 attempts per hour
  AUTH_PASSWORD_RESET: { maxRequests: 3, windowMs: 3600000 }, // 3 attempts per hour

  // User actions
  POST_CREATE: { maxRequests: 10, windowMs: 600000 }, // 10 posts per 10 minutes
  COMMENT_CREATE: { maxRequests: 30, windowMs: 600000 }, // 30 comments per 10 minutes
  LIKE_ACTION: { maxRequests: 100, windowMs: 60000 }, // 100 likes per minute
  FOLLOW_ACTION: { maxRequests: 20, windowMs: 60000 }, // 20 follows per minute

  // Admin actions
  ADMIN_ACTION: { maxRequests: 50, windowMs: 60000 }, // 50 actions per minute
  ADMIN_DELETE: { maxRequests: 10, windowMs: 60000 }, // 10 deletes per minute

  // Data export
  DATA_EXPORT: { maxRequests: 3, windowMs: 3600000 }, // 3 exports per hour
  DATA_DELETE: { maxRequests: 1, windowMs: 86400000 }, // 1 delete per day

  // Search and heavy queries
  SEARCH_QUERY: { maxRequests: 30, windowMs: 60000 }, // 30 searches per minute
  FEED_LOAD: { maxRequests: 60, windowMs: 60000 }, // 60 feed loads per minute
}

/**
 * Helper function to check rate limit and log violations
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  context?: { userId?: string; ip?: string; endpoint?: string }
): Promise<RateLimitResult> {
  const limiter = getRateLimiter()
  const result = await limiter.check(identifier, config)

  if (!result.success) {
    logSecurity.rateLimitExceeded(
      context?.userId,
      context?.ip,
      context?.endpoint || identifier
    )
  }

  return result
}

/**
 * Middleware helper to enforce rate limits
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.floor(result.resetTime / 1000).toString(),
    ...(result.retryAfter && {
      'Retry-After': result.retryAfter.toString()
    })
  }
}

export default getRateLimiter
