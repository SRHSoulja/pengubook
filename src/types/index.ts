export interface User {
  id: string
  walletAddress: string
  username: string
  displayName: string
  bio?: string
  avatar?: string
  discordId?: string
  discordName?: string
  twitterId?: string
  twitterHandle?: string
  isAdmin: boolean
  isBanned: boolean
  isOnline: boolean
  lastSeen: Date
  level: number
  xp: number
  createdAt: Date
  updatedAt: Date
  profile?: Profile
}

export interface Profile {
  id: string
  userId: string
  user?: User
  socialLinks: string[]
  interests: string[]
  location?: string
  website?: string
  company?: string
  timezone?: string
  languages: string[]
  skills: string[]
  // Social metrics
  tipCount: number
  totalTipsReceived: number
  followersCount: number
  followingCount: number
  postsCount: number
  likesReceived: number
  // Privacy settings
  isPrivate: boolean
  showActivity: boolean
  showTips: boolean
  allowDirectMessages: boolean
  // Profile customization
  theme: string
  bannerImage?: string
  profileVerified: boolean
}

export interface Token {
  id: string
  name: string
  symbol: string
  contractAddress: string
  decimals: number
  isEnabled: boolean
  logoUrl?: string
}

export interface Tip {
  id: string
  fromUserId: string
  toUserId: string
  tokenId: string
  amount: string
  transactionHash: string
  createdAt: Date
  fromUser: User
  toUser: User
  token: Token
}

// Social relationship types
export interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: Date
  follower: User
  following: User
}

export interface Friendship {
  id: string
  initiatorId: string
  receiverId: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'BLOCKED'
  createdAt: Date
  updatedAt: Date
  initiator: User
  receiver: User
}

// Content types
export interface Post {
  id: string
  authorId: string
  title?: string
  content: string
  contentType?: PostType
  images: string[]
  mediaUrls?: string[]
  visibility: 'PUBLIC' | 'FOLLOWERS_ONLY' | 'FRIENDS_ONLY' | 'COMMUNITY_ONLY' | 'PRIVATE'
  isPinned: boolean
  likesCount: number
  commentsCount: number
  sharesCount?: number
  isPromoted?: boolean
  createdAt: Date
  updatedAt: Date
  author: User
  comments?: Comment[]
  likes?: Like[]
  shares?: Share[]
  communityId?: string
  community?: Community
  _count?: {
    likes: number
    comments: number
    shares: number
  }
  contentFilter?: {
    shouldHide: boolean
    shouldWarn: boolean
    matchedPhrases: string[]
  }
}

export interface Comment {
  id: string
  authorId: string
  postId?: string
  parentId?: string
  content: string
  likesCount: number
  createdAt: Date
  updatedAt: Date
  author: User
  user?: User  // Alias for author
  post?: Post
  parent?: Comment
  replies?: Comment[]
  likes?: Like[]
  contentFilter?: {
    shouldHide: boolean
    shouldWarn: boolean
    matchedPhrases: string[]
  }
}

export interface Like {
  id: string
  userId: string
  postId?: string
  commentId?: string
  createdAt: Date
  user: User
  post?: Post
  comment?: Comment
}

// Community types
export interface Community {
  id: string
  name: string
  displayName: string
  description: string
  avatar?: string
  banner?: string
  theme: string
  visibility: 'PUBLIC' | 'INVITE_ONLY' | 'PRIVATE'
  category: string
  tags: string[]
  rules: string[]
  isOfficial: boolean
  membersCount: number
  postsCount: number
  createdAt: Date
  updatedAt: Date
  members?: CommunityMember[]
  moderators?: CommunityModerator[]
  posts?: Post[]
}

export interface CommunityMember {
  id: string
  userId: string
  communityId: string
  role: 'MEMBER' | 'CONTRIBUTOR' | 'MODERATOR' | 'ADMIN'
  joinedAt: Date
  isActive: boolean
  user: User
  community: Community
}

export interface CommunityModerator {
  id: string
  userId: string
  communityId: string
  permissions: string[]
  assignedAt: Date
  user: User
  community: Community
}

// Activity and notification types
export interface Activity {
  id: string
  userId: string
  type: 'POST_CREATED' | 'POST_LIKED' | 'POST_COMMENTED' | 'USER_FOLLOWED' | 'FRIEND_REQUEST_SENT' | 'FRIEND_REQUEST_ACCEPTED' | 'COMMUNITY_JOINED' | 'COMMUNITY_POST_CREATED' | 'TIP_SENT' | 'TIP_RECEIVED' | 'ACHIEVEMENT_EARNED' | 'LEVEL_UP'
  entityType: string
  entityId: string
  metadata: Record<string, any>
  createdAt: Date
  user: User
}

export interface Notification {
  id: string
  fromUserId?: string
  toUserId: string
  type: NotificationType
  title: string
  message: string
  entityType?: string
  entityId?: string
  isRead: boolean
  createdAt: Date
  fromUser?: User
  toUser: User
}

// Gamification types
export interface Achievement {
  id: string
  name: string
  displayName: string
  description: string
  icon: string
  category: string
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | 'DIAMOND'
  xpReward: number
  isHidden: boolean
  conditions: Record<string, any>
}

export interface UserAchievement {
  id: string
  userId: string
  achievementId: string
  earnedAt: Date
  progress: number
  user: User
  achievement: Achievement
}

export interface Streak {
  id: string
  userId: string
  type: 'LOGIN' | 'POSTING' | 'TIPPING' | 'COMMENTING' | 'COMMUNITY_ENGAGEMENT'
  currentDays: number
  longestDays: number
  lastUpdate: Date
  isActive: boolean
  user: User
}

export interface AGWConnection {
  address: string
  isConnected: boolean
  balance?: string
}

// Social Feed Types - using the Post interface defined above

export interface Like {
  id: string
  userId: string
  postId?: string
  createdAt: Date
  user: User
  post?: Post
}

// Comment interface is defined above

export interface Share {
  id: string
  userId: string
  postId?: string
  createdAt: Date
  user: User
  post?: Post
}

export interface Follow {
  id: string
  followerId: string
  followingId: string
  createdAt: Date
  follower: User
  following: User
}

export interface FeedItem {
  id: string
  userId: string
  postId?: string
  itemType: FeedItemType
  priority: number
  createdAt: Date
  post?: Post
}

export interface Engagement {
  id: string
  userId: string
  postId: string
  actionType: EngagementType
  duration?: number
  createdAt: Date
}

export interface Activity {
  id: string
  userId: string
  activityType: ActivityType
  content?: string
  targetId?: string
  targetType?: string
  createdAt: Date
  user: User
}


// Extended User interface with social relations
export interface ExtendedUser extends User {
  posts?: Post[]
  likes?: Like[]
  comments?: Comment[]
  shares?: Share[]
  followers?: Follow[]
  following?: Follow[]
  activities?: Activity[]
  notificationsSent?: Notification[]
  notificationsReceived?: Notification[]
  _count?: {
    posts: number
    followers: number
    following: number
    likes: number
  }
}

// Type enums (using string literals for SQLite compatibility)
export type PostType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'TIP_ANNOUNCEMENT' | 'PROFILE_UPDATE' | 'ACHIEVEMENT'

export type Visibility = 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE'

export type FeedItemType = 'POST' | 'TIP' | 'ACHIEVEMENT' | 'SOCIAL_CONNECTION'

export type EngagementType = 'VIEW' | 'LIKE' | 'COMMENT' | 'SHARE' | 'TIP' | 'CLICK' | 'SCROLL_PAST'

export type ActivityType = 'POST_CREATED' | 'POST_LIKED' | 'POST_COMMENTED' | 'POST_SHARED' | 'USER_FOLLOWED' | 'TIP_SENT' | 'TIP_RECEIVED' | 'ACHIEVEMENT_UNLOCKED' | 'STREAK_MILESTONE' | 'PROFILE_UPDATED'

export type NotificationType = 'LIKE' | 'COMMENT' | 'FOLLOW' | 'TIP' | 'ACHIEVEMENT' | 'MENTION' | 'SYSTEM'

// Feed Algorithm Types
export interface FeedAlgorithmOptions {
  algorithm: 'chronological' | 'trending' | 'personalized'
  userId: string
  limit?: number
  offset?: number
  includeFollowingOnly?: boolean
}

export interface TrendingScore {
  postId: string
  score: number
  factors: {
    likes: number
    comments: number
    shares: number
    recency: number
    engagement: number
  }
}

// API Response Types
export interface FeedResponse {
  posts: Post[]
  hasMore: boolean
  nextCursor?: string
}

export interface PostCreateRequest {
  content: string
  contentType: PostType
  mediaUrls?: string[]
  visibility: Visibility
}

export interface PostInteractionRequest {
  postId: string
  action: 'like' | 'unlike' | 'share'
}

export interface CommentCreateRequest {
  postId: string
  content: string
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Social discovery types
export interface UserSuggestion {
  user: User
  reason: string
  mutualConnections: number
  commonInterests: string[]
  score: number
}

export interface CommunityRecommendation {
  community: Community
  reason: string
  matchingInterests: string[]
  memberFriends: User[]
  score: number
}

// Feed types
export interface FeedItem {
  id: string
  type: 'POST' | 'TIP' | 'ACHIEVEMENT' | 'FOLLOW' | 'COMMUNITY_JOIN'
  content: Post | Activity | any
  timestamp: Date
  priority: number
}