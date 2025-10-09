/**
 * OPERATIONS: Feed Caching System
 *
 * Redis-based caching for social feed data to reduce database load:
 * - User feeds (personalized timeline)
 * - Global feed (public posts)
 * - User profiles
 * - Post metadata
 *
 * Features:
 * - Smart cache invalidation
 * - Prefetching strategies
 * - Cache warming for popular content
 * - TTL-based expiration
 */

import { getRedisClient, cacheAside } from '@/lib/redis'
import { logger } from '@/lib/logger'

export interface FeedCacheConfig {
  ttl: number // Time to live in seconds
  keyPrefix: string
}

/**
 * Feed Cache Manager
 */
export class FeedCache {
  private redis = getRedisClient()

  /**
   * Cache user feed
   */
  async cacheUserFeed(
    userId: string,
    feed: any[],
    options: { ttl?: number } = {}
  ): Promise<boolean> {
    const key = `feed:user:${userId}`
    const ttl = options.ttl || 300 // 5 minutes default

    const success = await this.redis.set(key, feed, { ttl })

    if (success) {
      logger.debug('User feed cached', {
        userId: userId.slice(0, 8) + '...',
        postsCount: feed.length,
        ttl
      }, { component: 'FEED_CACHE' })
    }

    return success
  }

  /**
   * Get cached user feed
   */
  async getUserFeed(userId: string): Promise<any[] | null> {
    const key = `feed:user:${userId}`
    const feed = await this.redis.get<any[]>(key)

    if (feed) {
      logger.debug('User feed cache hit', {
        userId: userId.slice(0, 8) + '...',
        postsCount: feed.length
      }, { component: 'FEED_CACHE' })
    }

    return feed
  }

  /**
   * Invalidate user feed (after post creation, follow, etc.)
   */
  async invalidateUserFeed(userId: string): Promise<boolean> {
    const key = `feed:user:${userId}`
    const success = await this.redis.del(key)

    if (success) {
      logger.debug('User feed invalidated', {
        userId: userId.slice(0, 8) + '...'
      }, { component: 'FEED_CACHE' })
    }

    return success
  }

  /**
   * Cache global feed
   */
  async cacheGlobalFeed(
    feed: any[],
    options: { ttl?: number; page?: number } = {}
  ): Promise<boolean> {
    const page = options.page || 1
    const key = `feed:global:page:${page}`
    const ttl = options.ttl || 60 // 1 minute default (global feed changes frequently)

    const success = await this.redis.set(key, feed, { ttl })

    if (success) {
      logger.debug('Global feed cached', {
        page,
        postsCount: feed.length,
        ttl
      }, { component: 'FEED_CACHE' })
    }

    return success
  }

  /**
   * Get cached global feed
   */
  async getGlobalFeed(page: number = 1): Promise<any[] | null> {
    const key = `feed:global:page:${page}`
    const feed = await this.redis.get<any[]>(key)

    if (feed) {
      logger.debug('Global feed cache hit', {
        page,
        postsCount: feed.length
      }, { component: 'FEED_CACHE' })
    }

    return feed
  }

  /**
   * Invalidate global feed (after new post)
   */
  async invalidateGlobalFeed(pages: number = 5): Promise<number> {
    let invalidated = 0

    for (let page = 1; page <= pages; page++) {
      const key = `feed:global:page:${page}`
      const success = await this.redis.del(key)
      if (success) invalidated++
    }

    if (invalidated > 0) {
      logger.debug('Global feed invalidated', {
        pagesInvalidated: invalidated
      }, { component: 'FEED_CACHE' })
    }

    return invalidated
  }

  /**
   * Cache user profile
   */
  async cacheUserProfile(
    userId: string,
    profile: any,
    options: { ttl?: number } = {}
  ): Promise<boolean> {
    const key = `profile:${userId}`
    const ttl = options.ttl || 600 // 10 minutes default

    const success = await this.redis.set(key, profile, { ttl })

    if (success) {
      logger.debug('User profile cached', {
        userId: userId.slice(0, 8) + '...',
        ttl
      }, { component: 'FEED_CACHE' })
    }

    return success
  }

  /**
   * Get cached user profile
   */
  async getUserProfile(userId: string): Promise<any | null> {
    const key = `profile:${userId}`
    const profile = await this.redis.get<any>(key)

    if (profile) {
      logger.debug('User profile cache hit', {
        userId: userId.slice(0, 8) + '...'
      }, { component: 'FEED_CACHE' })
    }

    return profile
  }

  /**
   * Invalidate user profile (after profile update)
   */
  async invalidateUserProfile(userId: string): Promise<boolean> {
    const key = `profile:${userId}`
    const success = await this.redis.del(key)

    if (success) {
      logger.debug('User profile invalidated', {
        userId: userId.slice(0, 8) + '...'
      }, { component: 'FEED_CACHE' })
    }

    return success
  }

  /**
   * Cache post metadata (likes, comments count, etc.)
   */
  async cachePostMetadata(
    postId: string,
    metadata: any,
    options: { ttl?: number } = {}
  ): Promise<boolean> {
    const key = `post:meta:${postId}`
    const ttl = options.ttl || 300 // 5 minutes default

    const success = await this.redis.set(key, metadata, { ttl })

    if (success) {
      logger.debug('Post metadata cached', {
        postId: postId.slice(0, 8) + '...',
        ttl
      }, { component: 'FEED_CACHE' })
    }

    return success
  }

  /**
   * Get cached post metadata
   */
  async getPostMetadata(postId: string): Promise<any | null> {
    const key = `post:meta:${postId}`
    const metadata = await this.redis.get<any>(key)

    if (metadata) {
      logger.debug('Post metadata cache hit', {
        postId: postId.slice(0, 8) + '...'
      }, { component: 'FEED_CACHE' })
    }

    return metadata
  }

  /**
   * Invalidate post metadata (after like, comment, etc.)
   */
  async invalidatePostMetadata(postId: string): Promise<boolean> {
    const key = `post:meta:${postId}`
    const success = await this.redis.del(key)

    if (success) {
      logger.debug('Post metadata invalidated', {
        postId: postId.slice(0, 8) + '...'
      }, { component: 'FEED_CACHE' })
    }

    return success
  }

  /**
   * Batch get post metadata
   */
  async getBatchPostMetadata(postIds: string[]): Promise<Map<string, any>> {
    const keys = postIds.map(id => `post:meta:${id}`)
    const values = await this.redis.mget<any>(keys)

    const result = new Map<string, any>()
    postIds.forEach((postId, index) => {
      if (values[index]) {
        result.set(postId, values[index])
      }
    })

    logger.debug('Batch post metadata retrieved', {
      requested: postIds.length,
      hits: result.size
    }, { component: 'FEED_CACHE' })

    return result
  }

  /**
   * Cache trending posts
   */
  async cacheTrendingPosts(
    posts: any[],
    options: { ttl?: number } = {}
  ): Promise<boolean> {
    const key = 'feed:trending'
    const ttl = options.ttl || 300 // 5 minutes default

    const success = await this.redis.set(key, posts, { ttl })

    if (success) {
      logger.debug('Trending posts cached', {
        postsCount: posts.length,
        ttl
      }, { component: 'FEED_CACHE' })
    }

    return success
  }

  /**
   * Get cached trending posts
   */
  async getTrendingPosts(): Promise<any[] | null> {
    const key = 'feed:trending'
    const posts = await this.redis.get<any[]>(key)

    if (posts) {
      logger.debug('Trending posts cache hit', {
        postsCount: posts.length
      }, { component: 'FEED_CACHE' })
    }

    return posts
  }

  /**
   * Warm cache for popular users (prefetch)
   */
  async warmPopularUserCaches(
    userIds: string[],
    fetcher: (userId: string) => Promise<any>
  ): Promise<number> {
    let warmed = 0

    for (const userId of userIds) {
      try {
        const key = `profile:${userId}`
        const exists = await this.redis.exists(key)

        if (!exists) {
          // Cache miss - fetch and cache
          const profile = await fetcher(userId)
          await this.cacheUserProfile(userId, profile)
          warmed++
        }
      } catch (error: any) {
        logger.warn('Cache warming failed for user', {
          userId: userId.slice(0, 8) + '...',
          error: error.message
        }, { component: 'FEED_CACHE' })
      }
    }

    logger.info('Cache warming completed', {
      total: userIds.length,
      warmed
    }, { component: 'FEED_CACHE' })

    return warmed
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    available: boolean
    cachedFeeds: number
    cachedProfiles: number
    cachedPosts: number
  }> {
    return {
      available: this.redis.isAvailable(),
      cachedFeeds: 0, // Would need SCAN to count
      cachedProfiles: 0,
      cachedPosts: 0
    }
  }
}

// Global feed cache instance
let globalFeedCache: FeedCache | null = null

/**
 * Get or create global feed cache
 */
export function getFeedCache(): FeedCache {
  if (!globalFeedCache) {
    globalFeedCache = new FeedCache()
  }
  return globalFeedCache
}

/**
 * Helper: Get or fetch user feed with caching
 */
export async function getCachedUserFeed(
  userId: string,
  fetcher: () => Promise<any[]>,
  options: { ttl?: number } = {}
): Promise<any[]> {
  const cache = getFeedCache()
  const cached = await cache.getUserFeed(userId)

  if (cached) {
    return cached
  }

  // Cache miss - fetch and cache
  const feed = await fetcher()
  await cache.cacheUserFeed(userId, feed, options)

  return feed
}

/**
 * Helper: Get or fetch global feed with caching
 */
export async function getCachedGlobalFeed(
  page: number,
  fetcher: () => Promise<any[]>,
  options: { ttl?: number } = {}
): Promise<any[]> {
  const cache = getFeedCache()
  const cached = await cache.getGlobalFeed(page)

  if (cached) {
    return cached
  }

  // Cache miss - fetch and cache
  const feed = await fetcher()
  await cache.cacheGlobalFeed(feed, { ...options, page })

  return feed
}

export default getFeedCache
