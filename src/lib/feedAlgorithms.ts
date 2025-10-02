import { prisma } from '@/lib/prisma'
import { FeedAlgorithmOptions, TrendingScore, Post } from '@/types'

// Chronological feed algorithm
export async function getChronologicalFeed(options: FeedAlgorithmOptions): Promise<Post[]> {
  const { userId, limit = 20, offset = 0, includeFollowingOnly = false } = options

  let whereClause: any = {
    OR: [
      { visibility: 'PUBLIC' },
      { authorId: userId }
    ]
  }

  if (includeFollowingOnly) {
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true }
    })

    const followingIds = following.map(f => f.followingId)
    followingIds.push(userId) // Include user's own posts

    whereClause = {
      authorId: { in: followingIds },
      OR: [
        { visibility: 'PUBLIC' },
        { visibility: 'FOLLOWERS_ONLY' },
        { authorId: userId }
      ]
    }
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
    include: {
      author: {
        include: {
          profile: true
        }
      },
      likes: {
        include: {
          user: true
        }
      },
      comments: {
        include: {
          user: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 3
      },
      shares: {
        include: {
          user: true
        }
      },
      _count: {
        select: {
          likes: true,
          comments: true,
          shares: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    },
    skip: offset,
    take: limit
  })

  return posts.map(post => ({
    ...post,
    mediaUrls: JSON.parse(post.mediaUrls || '[]'),
    images: JSON.parse(post.mediaUrls || '[]'), // Legacy field
    isPinned: false,
    likesCount: post._count.likes,
    commentsCount: post._count.comments,
    sharesCount: post._count.shares
  })) as unknown as Post[]
}

// Trending feed algorithm - posts with high engagement in the last 24-48 hours
export async function getTrendingFeed(options: FeedAlgorithmOptions): Promise<Post[]> {
  const { userId, limit = 20, offset = 0 } = options

  // Get posts from the last 2 days for trending calculation
  const twoDaysAgo = new Date()
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)

  const posts = await prisma.post.findMany({
    where: {
      createdAt: {
        gte: twoDaysAgo
      },
      OR: [
        { visibility: 'PUBLIC' },
        { authorId: userId }
      ]
    },
    include: {
      author: {
        include: {
          profile: true
        }
      },
      likes: {
        include: {
          user: true
        }
      },
      comments: {
        include: {
          user: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 3
      },
      shares: {
        include: {
          user: true
        }
      },
      _count: {
        select: {
          likes: true,
          comments: true,
          shares: true
        }
      }
    }
  })

  // Calculate trending scores
  const postsWithScores = posts.map(post => {
    const score = calculateTrendingScore(post as any)
    return {
      post: {
        ...post,
        mediaUrls: JSON.parse(post.mediaUrls || '[]')
      },
      score
    }
  })

  // Sort by trending score and apply pagination
  const sortedPosts = postsWithScores
    .sort((a, b) => b.score.score - a.score.score)
    .slice(offset, offset + limit)
    .map(item => item.post)

  return sortedPosts as unknown as Post[]
}

// Personalized feed algorithm - based on user's interactions and interests
export async function getPersonalizedFeed(options: FeedAlgorithmOptions): Promise<Post[]> {
  const { userId, limit = 20, offset = 0 } = options

  // Get user's engagement patterns
  const userEngagements = await prisma.engagement.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 100 // Recent engagements to understand preferences
  })

  // Get posts from users the current user frequently interacts with
  const engagedUserIds = Array.from(new Set(
    await Promise.all(
      userEngagements.map(async (engagement) => {
        const post = await prisma.post.findUnique({
          where: { id: engagement.postId },
          select: { authorId: true }
        })
        return post?.authorId
      })
    )
  )).filter(Boolean) as string[]

  // Get following list
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true }
  })
  const followingIds = following.map(f => f.followingId)

  // Combine frequently interacted users with following list
  const relevantUserIds = Array.from(new Set([...engagedUserIds, ...followingIds, userId]))

  // Weight posts based on various factors
  let whereClause: any = {
    OR: [
      { visibility: 'PUBLIC' },
      { authorId: userId }
    ]
  }

  // Prioritize posts from relevant users
  if (relevantUserIds.length > 0) {
    whereClause = {
      OR: [
        {
          authorId: { in: relevantUserIds },
          visibility: { in: ['PUBLIC', 'FOLLOWERS_ONLY'] }
        },
        {
          visibility: 'PUBLIC',
          authorId: { notIn: relevantUserIds }
        }
      ]
    }
  }

  const posts = await prisma.post.findMany({
    where: whereClause,
    include: {
      author: {
        include: {
          profile: true
        }
      },
      likes: {
        include: {
          user: true
        }
      },
      comments: {
        include: {
          user: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 3
      },
      shares: {
        include: {
          user: true
        }
      },
      _count: {
        select: {
          likes: true,
          comments: true,
          shares: true
        }
      }
    },
    orderBy: [
      // First prioritize posts from relevant users
      {
        authorId: 'asc'
      },
      // Then by recency
      {
        createdAt: 'desc'
      }
    ],
    take: limit * 2 // Get more posts to allow for better personalization
  })

  // Score posts based on personalization factors
  const scoredPosts = posts.map(post => {
    let personalizedScore = 1

    // Boost posts from followed users
    if (followingIds.includes(post.authorId)) {
      personalizedScore += 2
    }

    // Boost posts from frequently interacted users
    if (engagedUserIds.includes(post.authorId)) {
      personalizedScore += 1.5
    }

    // Boost posts with high engagement
    const engagementScore = (post._count.likes * 1) + (post._count.comments * 2) + (post._count.shares * 1.5)
    personalizedScore += Math.log(engagementScore + 1) * 0.5

    // Penalize older posts slightly
    const hoursOld = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60)
    personalizedScore *= Math.exp(-hoursOld / 48) // Decay over 48 hours

    return {
      post: {
        ...post,
        mediaUrls: JSON.parse(post.mediaUrls || '[]')
      },
      personalizedScore
    }
  })

  // Sort by personalized score and apply pagination
  const finalPosts = scoredPosts
    .sort((a, b) => b.personalizedScore - a.personalizedScore)
    .slice(offset, offset + limit)
    .map(item => item.post)

  return finalPosts as unknown as Post[]
}

// Calculate trending score for a post
export function calculateTrendingScore(post: any): TrendingScore {
  const now = new Date()
  const postAge = (now.getTime() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60) // hours

  // Engagement factors
  const likes = post._count?.likes || 0
  const comments = post._count?.comments || 0
  const shares = post._count?.shares || 0

  // Weight different types of engagement
  const engagementScore = (likes * 1) + (comments * 2) + (shares * 1.5)

  // Recency factor - newer posts get higher scores
  const recencyScore = Math.max(0, (48 - postAge) / 48) // Peaks at 48 hours, then declines

  // Velocity factor - engagement rate over time
  const velocityScore = postAge > 0 ? engagementScore / Math.max(1, postAge) : engagementScore

  // Combined score
  const totalScore = (engagementScore * 0.4) + (recencyScore * 0.3) + (velocityScore * 0.3)

  return {
    postId: post.id,
    score: totalScore,
    factors: {
      likes,
      comments,
      shares,
      recency: recencyScore,
      engagement: engagementScore
    }
  }
}

// Main feed generation function
export async function generateFeed(options: FeedAlgorithmOptions): Promise<Post[]> {
  switch (options.algorithm) {
    case 'trending':
      return getTrendingFeed(options)
    case 'personalized':
      return getPersonalizedFeed(options)
    case 'chronological':
    default:
      return getChronologicalFeed(options)
  }
}

// Helper function to create feed items for users
export async function populateUserFeed(userId: string, algorithm: 'chronological' | 'trending' | 'personalized' = 'chronological') {
  const posts = await generateFeed({
    algorithm,
    userId,
    limit: 50,
    offset: 0
  })

  // Clear existing feed items for this user
  await prisma.feedItem.deleteMany({
    where: { userId }
  })

  // Create new feed items
  const feedItems = posts.map((post, index) => ({
    userId,
    postId: post.id,
    itemType: 'POST' as const,
    priority: posts.length - index, // Higher priority for posts at the top
  }))

  await prisma.feedItem.createMany({
    data: feedItems
  })

  return feedItems.length
}