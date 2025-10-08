/**
 * OPERATIONS: Redis Cache Client
 *
 * Provides caching layer for:
 * - Feed data (reduce database queries)
 * - Rate limiting (distributed rate limits)
 * - Session data (future enhancement)
 *
 * Supports:
 * - Upstash Redis (serverless-friendly)
 * - Standard Redis (self-hosted or cloud)
 * - Graceful degradation (fallback to memory or no cache)
 */

import { logger } from '@/lib/logger'

export interface RedisConfig {
  url?: string
  token?: string // Upstash only
  maxRetries?: number
  retryDelay?: number
}

export interface CacheOptions {
  ttl?: number // Time to live in seconds
  prefix?: string // Key prefix for namespacing
}

/**
 * Redis Client Wrapper
 * Abstracts Redis operations with error handling and fallback
 */
class RedisClient {
  private client: any = null
  private isUpstash: boolean = false
  private isConnected: boolean = false
  private isEnabled: boolean = false

  constructor(config: RedisConfig = {}) {
    const url = config.url || process.env.REDIS_URL
    const token = config.token || process.env.UPSTASH_REDIS_REST_TOKEN

    if (!url) {
      logger.warn('Redis not configured, caching disabled', {}, { component: 'REDIS' })
      return
    }

    this.isEnabled = true

    // Check if Upstash (REST API based)
    if (url.includes('upstash') || token) {
      this.isUpstash = true
      this.initializeUpstash(url, token)
    } else {
      this.initializeStandard(url)
    }
  }

  /**
   * Initialize Upstash Redis (serverless-friendly REST API)
   */
  private async initializeUpstash(url: string, token?: string) {
    try {
      // Dynamic import to avoid bundling if not used
      const { Redis } = await import('@upstash/redis')

      if (token) {
        // Upstash with REST token
        this.client = new Redis({
          url,
          token
        })
      } else {
        // Upstash with URL only - use fromEnv() or extract token from URL
        // When token is in URL format: https://xxx.upstash.io?token=xxx
        const urlObj = new URL(url)
        const urlToken = urlObj.searchParams.get('token')

        if (urlToken) {
          // Token is in URL query params
          this.client = new Redis({
            url: url.split('?')[0], // Remove query params
            token: urlToken
          })
        } else {
          // Token must be in environment variable
          this.client = Redis.fromEnv()
        }
      }

      // Test connection
      await this.client.ping()
      this.isConnected = true

      logger.info('Upstash Redis connected', { url: url.split('@')[1] || 'configured' }, { component: 'REDIS' })
    } catch (error: any) {
      logger.error('Upstash Redis connection failed', {
        error: error.message
      }, { component: 'REDIS' })
      this.isEnabled = false
    }
  }

  /**
   * Initialize standard Redis (ioredis)
   * NOTE: ioredis package must be installed separately if using standard Redis
   */
  private async initializeStandard(url: string) {
    try {
      // Dynamic import - will fail gracefully if ioredis not installed
      let Redis: any
      try {
        Redis = (await import('ioredis')).default
      } catch (importError) {
        logger.warn('ioredis package not installed, standard Redis unavailable. Use Upstash Redis instead.', {}, { component: 'REDIS' })
        this.isEnabled = false
        return
      }

      this.client = new Redis(url, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        retryStrategy: (times: number) => {
          if (times > 3) return null
          return Math.min(times * 200, 2000)
        }
      })

      // Test connection
      await this.client.ping()
      this.isConnected = true

      logger.info('Redis connected', { url: url.split('@')[1] || 'configured' }, { component: 'REDIS' })
    } catch (error: any) {
      logger.error('Redis connection failed', {
        error: error.message
      }, { component: 'REDIS' })
      this.isEnabled = false
    }
  }

  /**
   * Get value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isEnabled || !this.isConnected) return null

    try {
      const value = await this.client.get(key)
      if (!value) return null

      // Upstash returns parsed JSON, ioredis returns string
      if (typeof value === 'string') {
        try {
          return JSON.parse(value) as T
        } catch {
          return value as T
        }
      }

      return value as T
    } catch (error: any) {
      logger.error('Redis get failed', {
        key,
        error: error.message
      }, { component: 'REDIS' })
      return null
    }
  }

  /**
   * Set value in cache with optional TTL
   */
  async set(key: string, value: any, options: CacheOptions = {}): Promise<boolean> {
    if (!this.isEnabled || !this.isConnected) return false

    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value)

      if (options.ttl) {
        // Set with expiration
        await this.client.setex(key, options.ttl, serialized)
      } else {
        // Set without expiration
        await this.client.set(key, serialized)
      }

      return true
    } catch (error: any) {
      logger.error('Redis set failed', {
        key,
        error: error.message
      }, { component: 'REDIS' })
      return false
    }
  }

  /**
   * Delete key from cache
   */
  async del(key: string): Promise<boolean> {
    if (!this.isEnabled || !this.isConnected) return false

    try {
      await this.client.del(key)
      return true
    } catch (error: any) {
      logger.error('Redis del failed', {
        key,
        error: error.message
      }, { component: 'REDIS' })
      return false
    }
  }

  /**
   * Increment counter (for rate limiting)
   */
  async incr(key: string): Promise<number> {
    if (!this.isEnabled || !this.isConnected) return 0

    try {
      const value = await this.client.incr(key)
      return value
    } catch (error: any) {
      logger.error('Redis incr failed', {
        key,
        error: error.message
      }, { component: 'REDIS' })
      return 0
    }
  }

  /**
   * Set expiration on key
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    if (!this.isEnabled || !this.isConnected) return false

    try {
      await this.client.expire(key, seconds)
      return true
    } catch (error: any) {
      logger.error('Redis expire failed', {
        key,
        error: error.message
      }, { component: 'REDIS' })
      return false
    }
  }

  /**
   * Get multiple keys at once
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isEnabled || !this.isConnected) return keys.map(() => null)

    try {
      const values = await this.client.mget(...keys)
      return values.map((value: any) => {
        if (!value) return null
        if (typeof value === 'string') {
          try {
            return JSON.parse(value) as T
          } catch {
            return value as T
          }
        }
        return value as T
      })
    } catch (error: any) {
      logger.error('Redis mget failed', {
        keysCount: keys.length,
        error: error.message
      }, { component: 'REDIS' })
      return keys.map(() => null)
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (!this.isEnabled || !this.isConnected) return false

    try {
      const result = await this.client.exists(key)
      return result === 1
    } catch (error: any) {
      logger.error('Redis exists failed', {
        key,
        error: error.message
      }, { component: 'REDIS' })
      return false
    }
  }

  /**
   * Get TTL of key
   */
  async ttl(key: string): Promise<number> {
    if (!this.isEnabled || !this.isConnected) return -1

    try {
      const ttl = await this.client.ttl(key)
      return ttl
    } catch (error: any) {
      logger.error('Redis ttl failed', {
        key,
        error: error.message
      }, { component: 'REDIS' })
      return -1
    }
  }

  /**
   * Flush all keys (use with caution!)
   */
  async flushAll(): Promise<boolean> {
    if (!this.isEnabled || !this.isConnected) return false

    try {
      await this.client.flushall()
      logger.warn('Redis flushed all keys', {}, { component: 'REDIS' })
      return true
    } catch (error: any) {
      logger.error('Redis flushall failed', {
        error: error.message
      }, { component: 'REDIS' })
      return false
    }
  }

  /**
   * Check if Redis is enabled and connected
   */
  isAvailable(): boolean {
    return this.isEnabled && this.isConnected
  }

  /**
   * Close connection
   */
  async disconnect(): Promise<void> {
    if (!this.client) return

    try {
      if (this.isUpstash) {
        // Upstash doesn't need explicit disconnect (REST API)
        this.isConnected = false
      } else {
        await this.client.quit()
        this.isConnected = false
      }
      logger.info('Redis disconnected', {}, { component: 'REDIS' })
    } catch (error: any) {
      logger.error('Redis disconnect failed', {
        error: error.message
      }, { component: 'REDIS' })
    }
  }
}

// Global Redis client instance
let globalRedisClient: RedisClient | null = null

/**
 * Get or create global Redis client
 */
export function getRedisClient(): RedisClient {
  if (!globalRedisClient) {
    globalRedisClient = new RedisClient()
  }
  return globalRedisClient
}

/**
 * Helper functions for common caching patterns
 */

/**
 * Cache-aside pattern: Get from cache or fetch from source
 */
export async function cacheAside<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const redis = getRedisClient()

  // Try cache first
  const cached = await redis.get<T>(key)
  if (cached !== null) {
    return cached
  }

  // Cache miss - fetch from source
  const value = await fetcher()

  // Store in cache (fire and forget)
  redis.set(key, value, options).catch((error) => {
    logger.warn('Cache set failed (non-blocking)', {
      key,
      error: error.message
    }, { component: 'CACHE' })
  })

  return value
}

/**
 * Invalidate cache keys by pattern
 */
export async function invalidatePattern(pattern: string): Promise<number> {
  const redis = getRedisClient()
  if (!redis.isAvailable()) return 0

  try {
    // Note: This requires SCAN command which may not be available in all Redis setups
    // For Upstash, use explicit key lists instead
    logger.info('Cache invalidation requested', { pattern }, { component: 'CACHE' })
    // Implementation depends on Redis setup
    return 0
  } catch (error: any) {
    logger.error('Cache invalidation failed', {
      pattern,
      error: error.message
    }, { component: 'CACHE' })
    return 0
  }
}

export { RedisClient }
export default getRedisClient
