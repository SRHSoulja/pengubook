// Re-export all types from modular files for backward compatibility

// User types
export type {
  User,
  Profile,
  ExtendedUser,
  UserSuggestion
} from './user'

// Post and content types
export type {
  Post,
  Comment,
  Like,
  Share,
  PostCreateRequest,
  PostInteractionRequest,
  CommentCreateRequest,
  PostType,
  Visibility
} from './post'

// Social interaction types
export type {
  Token,
  Tip,
  Follow,
  Friendship,
  AGWConnection
} from './social'

// Community types
export type {
  Community,
  CommunityMember,
  CommunityModerator,
  CommunityRecommendation
} from './community'

// Activity and notification types
export type {
  Activity,
  Notification,
  Engagement,
  ActivityType,
  NotificationType,
  EngagementType
} from './activity'

// Gamification types
export type {
  Achievement,
  UserAchievement,
  Streak
} from './gamification'

// Feed types
export type {
  FeedItem,
  FeedResponse,
  FeedAlgorithmOptions,
  TrendingScore,
  FeedItemType
} from './feed'

// API types
export type {
  ApiResponse,
  PaginationParams,
  PaginationResponse,
  SearchParams,
  UploadResponse,
  ErrorResponse
} from './api'