// Activity and notification types
import type { User } from './user'

export interface Activity {
  id: string
  userId: string
  user?: User
  activityType: ActivityType
  targetId?: string
  targetType?: string
  content?: string
  metadata?: string
  createdAt: Date
}

export interface Notification {
  id: string
  fromUserId?: string
  fromUser?: User
  toUserId: string
  toUser?: User
  type: NotificationType
  title: string
  content: string
  read: boolean
  actionUrl?: string
  metadata?: string
  createdAt: Date
  readAt?: Date
}

export interface Engagement {
  id: string
  userId: string
  postId: string
  actionType: EngagementType
  duration?: number
  metadata?: string
  createdAt: Date
}

// Activity and notification types
export type ActivityType =
  | 'POST_CREATED'
  | 'POST_LIKED'
  | 'POST_COMMENTED'
  | 'POST_SHARED'
  | 'USER_FOLLOWED'
  | 'TIP_SENT'
  | 'TIP_RECEIVED'
  | 'ACHIEVEMENT_UNLOCKED'
  | 'STREAK_MILESTONE'
  | 'PROFILE_UPDATED'
  | 'POST_COMMENTED'

export type NotificationType =
  | 'SYSTEM'
  | 'TIP_RECEIVED'
  | 'FOLLOW'
  | 'FRIEND_REQUEST'
  | 'FRIEND_ACCEPTED'
  | 'POST_LIKE'
  | 'POST_COMMENT'
  | 'COMMENT_REPLY'
  | 'COMMUNITY_INVITE'
  | 'ACHIEVEMENT'

export type EngagementType =
  | 'VIEW'
  | 'LIKE'
  | 'COMMENT'
  | 'SHARE'
  | 'TIP'
  | 'CLICK'
  | 'SCROLL_PAST'