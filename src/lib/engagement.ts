import { prisma } from '@/lib/prisma'
import { EngagementType } from '@/types'

// Track user engagement with posts
export async function trackEngagement(
  userId: string,
  postId: string,
  actionType: EngagementType,
  duration?: number
) {
  try {
    await prisma.engagement.create({
      data: {
        userId,
        postId,
        actionType,
        duration
      }
    })
  } catch (error) {
    console.error('Error tracking engagement:', error)
    // Don't throw - engagement tracking should not break the app
  }
}

// Get engagement analytics for a post
export async function getPostEngagementStats(postId: string) {
  try {
    const engagements = await prisma.engagement.findMany({
      where: { postId },
      orderBy: { createdAt: 'desc' }
    })

    const stats = {
      totalViews: engagements.filter(e => e.actionType === 'VIEW').length,
      totalLikes: engagements.filter(e => e.actionType === 'LIKE').length,
      totalComments: engagements.filter(e => e.actionType === 'COMMENT').length,
      totalShares: engagements.filter(e => e.actionType === 'SHARE').length,
      totalTips: engagements.filter(e => e.actionType === 'TIP').length,
      totalClicks: engagements.filter(e => e.actionType === 'CLICK').length,
      averageViewTime: 0,
      uniqueUsers: new Set(engagements.map(e => e.userId)).size,
      engagementRate: 0
    }

    // Calculate average view time
    const viewEngagements = engagements.filter(e => e.actionType === 'VIEW' && e.duration)
    if (viewEngagements.length > 0) {
      const totalViewTime = viewEngagements.reduce((sum, e) => sum + (e.duration || 0), 0)
      stats.averageViewTime = totalViewTime / viewEngagements.length
    }

    // Calculate engagement rate (interactions / views)
    if (stats.totalViews > 0) {
      const totalInteractions = stats.totalLikes + stats.totalComments + stats.totalShares + stats.totalClicks
      stats.engagementRate = (totalInteractions / stats.totalViews) * 100
    }

    return stats
  } catch (error) {
    console.error('Error getting engagement stats:', error)
    return null
  }
}

// Get user engagement patterns
export async function getUserEngagementPattern(userId: string, days: number = 30) {
  try {
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const engagements = await prisma.engagement.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Group by action type
    const actionCounts = engagements.reduce((acc, engagement) => {
      const actionType = engagement.actionType as EngagementType
      acc[actionType] = (acc[actionType] || 0) + 1
      return acc
    }, {} as Record<EngagementType, number>)

    // Group by day
    const dailyActivity = engagements.reduce((acc, engagement) => {
      const date = engagement.createdAt.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Get most engaged posts
    const postEngagements = engagements.reduce((acc, engagement) => {
      acc[engagement.postId] = (acc[engagement.postId] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostEngagedPosts = Object.entries(postEngagements)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([postId, count]) => ({ postId, engagementCount: count }))

    return {
      totalEngagements: engagements.length,
      actionCounts,
      dailyActivity,
      mostEngagedPosts,
      averageDaily: engagements.length / days
    }
  } catch (error) {
    console.error('Error getting user engagement pattern:', error)
    return null
  }
}

// Get trending posts based on recent engagement
export async function getTrendingPostsFromEngagement(hours: number = 24, limit: number = 10) {
  try {
    const startDate = new Date()
    startDate.setHours(startDate.getHours() - hours)

    const engagements = await prisma.engagement.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      }
    })

    // Score posts based on engagement
    const postScores = engagements.reduce((acc, engagement) => {
      if (!acc[engagement.postId]) {
        acc[engagement.postId] = { score: 0, views: 0, likes: 0, comments: 0, shares: 0, tips: 0 }
      }

      const weights = {
        VIEW: 1,
        LIKE: 3,
        COMMENT: 5,
        SHARE: 4,
        TIP: 10,
        CLICK: 2,
        SCROLL_PAST: 0.5
      }

      acc[engagement.postId].score += weights[engagement.actionType as keyof typeof weights] || 1

      // Track specific engagement types
      switch (engagement.actionType) {
        case 'VIEW':
          acc[engagement.postId].views++
          break
        case 'LIKE':
          acc[engagement.postId].likes++
          break
        case 'COMMENT':
          acc[engagement.postId].comments++
          break
        case 'SHARE':
          acc[engagement.postId].shares++
          break
        case 'TIP':
          acc[engagement.postId].tips++
          break
      }

      return acc
    }, {} as Record<string, { score: number, views: number, likes: number, comments: number, shares: number, tips: number }>)

    // Sort by score and return top posts
    const trendingPosts = Object.entries(postScores)
      .map(([postId, stats]) => ({ postId, ...stats }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)

    return trendingPosts
  } catch (error) {
    console.error('Error getting trending posts from engagement:', error)
    return []
  }
}

// Real-time engagement tracking for views
export function trackPostView(postId: string, userId: string, startTime: number) {
  let viewStartTime = startTime

  // Return cleanup function
  return () => {
    const viewDuration = Math.floor((Date.now() - viewStartTime) / 1000)

    // Only track if user viewed for at least 3 seconds
    if (viewDuration >= 3) {
      trackEngagement(userId, postId, 'VIEW', viewDuration)
    }
  }
}

// Batch engagement tracking (for better performance)
let engagementQueue: Array<{
  userId: string
  postId: string
  actionType: EngagementType
  duration?: number
}> = []

export function queueEngagement(
  userId: string,
  postId: string,
  actionType: EngagementType,
  duration?: number
) {
  engagementQueue.push({ userId, postId, actionType, duration })

  // Flush queue every 10 items or 5 seconds
  if (engagementQueue.length >= 10) {
    flushEngagementQueue()
  }
}

export async function flushEngagementQueue() {
  if (engagementQueue.length === 0) return

  const items = [...engagementQueue]
  engagementQueue = []

  try {
    await prisma.engagement.createMany({
      data: items.map(item => ({
        userId: item.userId,
        postId: item.postId,
        actionType: item.actionType,
        duration: item.duration,
        createdAt: new Date()
      }))
    })
  } catch (error) {
    console.error('Error flushing engagement queue:', error)
  }
}

// Auto-flush engagement queue every 5 seconds
if (typeof window === 'undefined') { // Only run on server
  setInterval(flushEngagementQueue, 5000)
}