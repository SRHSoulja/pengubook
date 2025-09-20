'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Post } from '@/types'

interface UseRealtimeFeedProps {
  userId?: string
  algorithm: 'chronological' | 'trending' | 'personalized'
  followingOnly: boolean
  walletAddress?: string
  enabled?: boolean
  pollingInterval?: number // in milliseconds
}

export function useRealtimeFeed({
  userId,
  algorithm,
  followingOnly,
  walletAddress,
  enabled = true,
  pollingInterval = 30000 // 30 seconds
}: UseRealtimeFeedProps) {
  const [hasNewPosts, setHasNewPosts] = useState(false)
  const [lastCheckTime, setLastCheckTime] = useState<Date>(new Date())
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPostId = useRef<string | null>(null)

  // Check for new posts
  const checkForNewPosts = useCallback(async () => {
    if (!enabled || !walletAddress || !userId) return

    try {
      const params = new URLSearchParams({
        userId,
        algorithm,
        limit: '1', // Only get the latest post
        offset: '0',
        followingOnly: followingOnly.toString()
      })

      const response = await fetch(`/api/posts?${params}`, {
        headers: {
          'x-wallet-address': walletAddress
        }
      })

      const result = await response.json()

      if (result.success && result.data.posts.length > 0) {
        const latestPost = result.data.posts[0]
        const latestPostTime = new Date(latestPost.createdAt)

        // Check if there's a newer post than what we've seen
        if (latestPostTime > lastCheckTime && latestPost.id !== lastPostId.current) {
          setHasNewPosts(true)
          lastPostId.current = latestPost.id
        }
      }
    } catch (error) {
      console.error('Error checking for new posts:', error)
    }
  }, [enabled, walletAddress, userId, algorithm, followingOnly, lastCheckTime])

  // Start polling
  useEffect(() => {
    if (!enabled) return

    // Check immediately
    checkForNewPosts()

    // Set up interval
    intervalRef.current = setInterval(checkForNewPosts, pollingInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [checkForNewPosts, enabled, pollingInterval])

  // Reset new posts flag and update last check time
  const markAsChecked = useCallback(() => {
    setHasNewPosts(false)
    setLastCheckTime(new Date())
  }, [])

  // Manually trigger check
  const refreshCheck = useCallback(() => {
    checkForNewPosts()
  }, [checkForNewPosts])

  return {
    hasNewPosts,
    markAsChecked,
    refreshCheck,
    lastCheckTime
  }
}

// Hook for tracking user engagement with posts
export function usePostEngagement(walletAddress?: string) {
  const activeViews = useRef<Map<string, { startTime: number; trackingId?: NodeJS.Timeout }>>(new Map())

  // Track when a user starts viewing a post
  const startViewTracking = useCallback((postId: string, userId: string) => {
    if (!walletAddress || !userId) return

    const startTime = Date.now()

    // Clear any existing tracking for this post
    const existing = activeViews.current.get(postId)
    if (existing?.trackingId) {
      clearTimeout(existing.trackingId)
    }

    // Set up tracking
    const trackingId = setTimeout(() => {
      // Track view after 3 seconds
      trackEngagement(userId, postId, 'VIEW', 3)
    }, 3000)

    activeViews.current.set(postId, { startTime, trackingId })
  }, [walletAddress])

  // Track when user stops viewing a post
  const stopViewTracking = useCallback((postId: string, userId: string) => {
    if (!walletAddress || !userId) return

    const tracking = activeViews.current.get(postId)
    if (tracking) {
      if (tracking.trackingId) {
        clearTimeout(tracking.trackingId)
      }

      const duration = Math.floor((Date.now() - tracking.startTime) / 1000)

      // Only track if viewed for at least 1 second
      if (duration >= 1) {
        trackEngagement(userId, postId, 'VIEW', duration)
      }

      activeViews.current.delete(postId)
    }
  }, [walletAddress])

  // Track other engagement types
  const trackEngagement = useCallback(async (
    userId: string,
    postId: string,
    actionType: 'VIEW' | 'LIKE' | 'COMMENT' | 'SHARE' | 'TIP' | 'CLICK' | 'SCROLL_PAST',
    duration?: number
  ) => {
    if (!walletAddress) return

    try {
      // For now, we'll track engagement client-side
      // In a production app, you might want a dedicated endpoint
      console.log('Tracking engagement:', { userId, postId, actionType, duration })

      // You could send this to an analytics endpoint
      // await fetch('/api/engagement', {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'x-wallet-address': walletAddress
      //   },
      //   body: JSON.stringify({ userId, postId, actionType, duration })
      // })
    } catch (error) {
      console.error('Error tracking engagement:', error)
    }
  }, [walletAddress])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      activeViews.current.forEach(({ trackingId }) => {
        if (trackingId) clearTimeout(trackingId)
      })
      activeViews.current.clear()
    }
  }, [])

  return {
    startViewTracking,
    stopViewTracking,
    trackEngagement
  }
}

// Hook for managing feed refresh state
export function useFeedRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date())

  const refresh = useCallback(async (refreshFn: () => Promise<void>) => {
    if (isRefreshing) return

    setIsRefreshing(true)
    try {
      await refreshFn()
      setLastRefreshTime(new Date())
    } finally {
      setIsRefreshing(false)
    }
  }, [isRefreshing])

  return {
    isRefreshing,
    lastRefreshTime,
    refresh
  }
}