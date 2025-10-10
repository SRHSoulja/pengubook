// Feed and algorithm types
import type { User } from './user'
import type { Post } from './post'
import type { Tip } from './social'
import type { Achievement } from './gamification'

export interface FeedItem {
  id: string
  type: FeedItemType
  content: Post | Tip | Achievement | any
  author?: User
  timestamp: Date
  score?: number
  metadata?: any
}

export interface FeedResponse {
  items: FeedItem[]
  hasMore: boolean
  nextCursor?: string
}

export interface FeedAlgorithmOptions {
  userId: string
  limit: number
  cursor?: string
  includeFollowing: boolean
  includeTrending: boolean
  personalizedWeight: number
}

export interface TrendingScore {
  postId: string
  score: number
  views: number
  likes: number
  comments: number
  shares: number
  velocity: number
  ageDecay: number
  authorWeight: number
}

export type FeedItemType = 'POST' | 'TIP' | 'ACHIEVEMENT' | 'SOCIAL_CONNECTION'