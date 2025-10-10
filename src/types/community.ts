// Community-related types
import type { User } from './user'

export interface Community {
  id: string
  name: string
  displayName: string
  description: string
  avatar?: string
  banner?: string
  category: string
  tags: string[]
  rules: string[]
  visibility: 'PUBLIC' | 'PRIVATE' | 'INVITE_ONLY'
  isOfficial: boolean
  membersCount: number
  creatorId: string
  creator?: User
  createdAt: Date
  updatedAt: Date
  // Token gating
  isTokenGated?: boolean
  tokenGateType?: string
  tokenContractAddress?: string
  tokenMinAmount?: string
  tokenIds?: string
  tokenSymbol?: string
  tokenDecimals?: number
  // Relations
  members?: CommunityMember[]
  moderators?: CommunityModerator[]
}

export interface CommunityMember {
  id: string
  userId: string
  user?: User
  communityId: string
  community?: Community
  role: 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'
  joinedAt: Date
  permissions?: string[]
}

export interface CommunityModerator {
  id: string
  userId: string
  user?: User
  communityId: string
  community?: Community
  permissions: string[]
  assignedAt: Date
  assignedBy: string
}

export interface CommunityRecommendation {
  community: Community
  reason: string
  mutualMembers: number
  score: number
  tags: string[]
}