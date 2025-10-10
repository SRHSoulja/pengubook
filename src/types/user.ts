// User-related types
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
  verificationBadges: string[]
  customFields: { [key: string]: string }
}

export interface ExtendedUser extends User {
  profile: Profile
  followerUsers: User[]
  followingUsers: User[]
  posts: Post[]
  tips: Tip[]
  activities: Activity[]
  achievements: UserAchievement[]
  streaks: Streak[]
  notifications: Notification[]
  sentFriendRequests: Friendship[]
  receivedFriendRequests: Friendship[]
  friends: User[]
  communities: CommunityMember[]
}

export interface UserSuggestion {
  user: User
  reason: string
  mutualFriends: number
  score: number
}

// Import other types that are referenced
import type { Post } from './post'
import type { Tip } from './social'
import type { Activity, Notification } from './activity'
import type { UserAchievement, Streak } from './gamification'
import type { Friendship } from './social'
import type { CommunityMember } from './community'