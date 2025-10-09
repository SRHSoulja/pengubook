// Shared types across all services
export interface User {
  id: string
  walletAddress?: string | null
  username?: string | null
  displayName?: string | null
  avatar?: string | null
  isAdmin: boolean
  isBanned: boolean
  level: number
  xp: number
}

export interface Post {
  id: string
  authorId: string
  content: string
  mediaUrls: string[]
  isNSFW: boolean
  moderationStatus?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface JWTPayload {
  userId: string
  walletAddress?: string
  jti?: string
  iat: number
  exp: number
}

export interface UploadQuota {
  limit: number
  used: number
  remaining: number
  resetTime: string
}

export interface ModerationResult {
  status: 'approved' | 'rejected' | 'pending' | 'flagged'
  kind: 'aws_rekognition'
  isNSFW: boolean
  confidence: number
  labels: any[]
  contentWarnings: string[]
  response?: any
}
