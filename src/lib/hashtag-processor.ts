import { PrismaClient } from '@prisma/client'

export function extractHashtags(content: string): string[] {
  // Match hashtags: # followed by alphanumeric characters, underscores, or hyphens
  // Must be at least 2 characters after the #
  const hashtagRegex = /#([a-zA-Z0-9_-]{2,50})/g
  const matches = content.match(hashtagRegex)

  if (!matches) return []

  // Remove # and convert to lowercase, remove duplicates
  const hashtags = matches
    .map(tag => tag.slice(1).toLowerCase())
    .filter(tag => tag.length >= 2 && tag.length <= 50)

  // Remove duplicates
  return [...new Set(hashtags)]
}

export async function processHashtagsForPost(
  postId: string,
  content: string,
  prisma: PrismaClient
): Promise<void> {
  const hashtags = extractHashtags(content)

  if (hashtags.length === 0) return

  // Process each hashtag
  for (const tag of hashtags) {
    try {
      // Find or create hashtag
      const hashtag = await prisma.hashtag.upsert({
        where: { tag },
        update: {
          usageCount: { increment: 1 },
          lastUsed: new Date()
        },
        create: {
          tag,
          usageCount: 1,
          lastUsed: new Date()
        }
      })

      // Create post-hashtag relationship
      await prisma.postHashtag.upsert({
        where: {
          postId_hashtagId: {
            postId,
            hashtagId: hashtag.id
          }
        },
        update: {},
        create: {
          postId,
          hashtagId: hashtag.id
        }
      })
    } catch (error) {
      console.error(`Error processing hashtag "${tag}":`, error)
      // Continue processing other hashtags even if one fails
    }
  }
}

export async function getTrendingHashtags(
  timeframe: 'hour' | 'day' | 'week' | 'month' = 'day',
  limit: number = 20,
  prisma: PrismaClient
): Promise<Array<{
  tag: string
  usageCount: number
  recentPosts: number
  growth: number
}>> {
  // Calculate time boundaries
  const now = new Date()
  let timeAgo: Date

  switch (timeframe) {
    case 'hour':
      timeAgo = new Date(now.getTime() - 60 * 60 * 1000)
      break
    case 'day':
      timeAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case 'week':
      timeAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      timeAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
  }

  // Get hashtags with their recent usage
  const hashtags = await prisma.hashtag.findMany({
    where: {
      isBlocked: false,
      lastUsed: { gte: timeAgo }
    },
    include: {
      posts: {
        where: {
          createdAt: { gte: timeAgo },
          post: {
            visibility: 'PUBLIC'
          }
        },
        select: { createdAt: true }
      }
    },
    orderBy: { usageCount: 'desc' }
  })

  // Calculate trending metrics
  const trendingData = hashtags.map(hashtag => {
    const recentPosts = hashtag.posts.length

    // Calculate growth rate (posts in recent period vs historical average)
    const totalUsage = hashtag.usageCount
    const daysSinceCreated = Math.max(1,
      (now.getTime() - hashtag.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    )
    const historicalDailyAverage = totalUsage / daysSinceCreated

    let timeframeDays = 1
    switch (timeframe) {
      case 'hour': timeframeDays = 1/24; break
      case 'day': timeframeDays = 1; break
      case 'week': timeframeDays = 7; break
      case 'month': timeframeDays = 30; break
    }

    const expectedForTimeframe = historicalDailyAverage * timeframeDays
    const growth = expectedForTimeframe > 0 ?
      ((recentPosts - expectedForTimeframe) / expectedForTimeframe) * 100 :
      recentPosts > 0 ? 100 : 0

    return {
      tag: hashtag.tag,
      usageCount: hashtag.usageCount,
      recentPosts,
      growth: Math.round(growth * 100) / 100 // Round to 2 decimal places
    }
  })

  // Sort by a combination of recent activity and growth
  trendingData.sort((a, b) => {
    // Weight recent posts heavily, but also consider growth
    const scoreA = a.recentPosts * 2 + Math.max(0, a.growth / 10)
    const scoreB = b.recentPosts * 2 + Math.max(0, b.growth / 10)
    return scoreB - scoreA
  })

  return trendingData.slice(0, limit)
}

export function formatHashtagsInContent(content: string): string {
  // Replace hashtags with clickable links (for display purposes)
  return content.replace(
    /#([a-zA-Z0-9_-]{2,50})/g,
    '<span class="text-cyan-400 hover:text-cyan-300 cursor-pointer">#$1</span>'
  )
}

export async function searchHashtags(
  query: string,
  limit: number = 10,
  prisma: PrismaClient
): Promise<Array<{
  tag: string
  usageCount: number
  lastUsed: Date
}>> {
  const searchTerm = query.toLowerCase().replace(/^#/, '') // Remove # if present

  const hashtags = await prisma.hashtag.findMany({
    where: {
      tag: {
        contains: searchTerm,
        mode: 'insensitive'
      },
      isBlocked: false
    },
    orderBy: [
      { usageCount: 'desc' },
      { lastUsed: 'desc' }
    ],
    take: limit,
    select: {
      tag: true,
      usageCount: true,
      lastUsed: true
    }
  })

  return hashtags
}