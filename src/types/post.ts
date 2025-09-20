// Post and content-related types
import type { User } from './user'

export interface Post {
  id: string
  authorId: string
  author?: User
  content: string
  images?: string[]
  mediaUrls: string[]
  visibility: Visibility
  contentType: string
  isPinned: boolean
  isPromoted: boolean
  likesCount: number
  commentsCount: number
  sharesCount: number
  createdAt: Date
  updatedAt: Date
  comments?: Comment[]
  likes?: Like[]
  shares?: Share[]
}

export interface Comment {
  id: string
  userId: string
  user?: User
  postId?: string
  post?: Post
  content: string
  createdAt: Date
  updatedAt: Date
  parentId?: string
  replies?: Comment[]
  likesCount: number
  isEdited: boolean
}

export interface Like {
  id: string
  userId: string
  user?: User
  postId?: string
  post?: Post
  commentId?: string
  comment?: Comment
  createdAt: Date
}

export interface Share {
  id: string
  userId: string
  user: User
  postId: string
  post: Post
  createdAt: Date
}

// Request/Response types for API
export interface PostCreateRequest {
  content: string
  mediaUrls?: string[]
  visibility?: Visibility
}

export interface PostInteractionRequest {
  type: 'like' | 'unlike' | 'share'
}

export interface CommentCreateRequest {
  content: string
  parentId?: string
}

// Enums and types
export type PostType = 'TEXT' | 'IMAGE' | 'VIDEO' | 'TIP_ANNOUNCEMENT' | 'PROFILE_UPDATE' | 'ACHIEVEMENT'
export type Visibility = 'PUBLIC' | 'FOLLOWERS_ONLY' | 'PRIVATE' | 'FRIENDS_ONLY' | 'COMMUNITY_ONLY'