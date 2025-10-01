export interface AchievementDefinition {
  name: string
  title: string
  description: string
  icon: string
  category: 'ENGAGEMENT' | 'SOCIAL' | 'CONTENT' | 'MILESTONE' | 'SPECIAL'
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  requirement: number
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  // ENGAGEMENT Achievements
  {
    name: 'first_post',
    title: 'First Post',
    description: 'Share your first post with the community',
    icon: '🎊',
    category: 'ENGAGEMENT',
    rarity: 'COMMON',
    requirement: 1
  },
  {
    name: 'prolific_poster',
    title: 'Prolific Poster',
    description: 'Share 10 posts',
    icon: '📝',
    category: 'ENGAGEMENT',
    rarity: 'COMMON',
    requirement: 10
  },
  {
    name: 'content_creator',
    title: 'Content Creator',
    description: 'Share 50 posts',
    icon: '🎥',
    category: 'ENGAGEMENT',
    rarity: 'RARE',
    requirement: 50
  },
  {
    name: 'posting_legend',
    title: 'Posting Legend',
    description: 'Share 100 posts',
    icon: '👑',
    category: 'ENGAGEMENT',
    rarity: 'EPIC',
    requirement: 100
  },

  // SOCIAL Achievements
  {
    name: 'first_friend',
    title: 'First Friend',
    description: 'Make your first connection',
    icon: '👋',
    category: 'SOCIAL',
    rarity: 'COMMON',
    requirement: 1
  },
  {
    name: 'social_butterfly',
    title: 'Social Butterfly',
    description: 'Have 10 followers',
    icon: '🦋',
    category: 'SOCIAL',
    rarity: 'COMMON',
    requirement: 10
  },
  {
    name: 'influencer',
    title: 'Influencer',
    description: 'Have 50 followers',
    icon: '⭐',
    category: 'SOCIAL',
    rarity: 'RARE',
    requirement: 50
  },
  {
    name: 'celebrity',
    title: 'Celebrity',
    description: 'Have 100 followers',
    icon: '🌟',
    category: 'SOCIAL',
    rarity: 'EPIC',
    requirement: 100
  },
  {
    name: 'megastar',
    title: 'Megastar',
    description: 'Have 500 followers',
    icon: '💫',
    category: 'SOCIAL',
    rarity: 'LEGENDARY',
    requirement: 500
  },

  // CONTENT Achievements
  {
    name: 'first_like',
    title: 'First Like',
    description: 'Receive your first like',
    icon: '❤️',
    category: 'CONTENT',
    rarity: 'COMMON',
    requirement: 1
  },
  {
    name: 'crowd_pleaser',
    title: 'Crowd Pleaser',
    description: 'Receive 100 total likes',
    icon: '👏',
    category: 'CONTENT',
    rarity: 'COMMON',
    requirement: 100
  },
  {
    name: 'viral_sensation',
    title: 'Viral Sensation',
    description: 'Receive 500 total likes',
    icon: '🔥',
    category: 'CONTENT',
    rarity: 'RARE',
    requirement: 500
  },
  {
    name: 'like_magnet',
    title: 'Like Magnet',
    description: 'Receive 1000 total likes',
    icon: '🧲',
    category: 'CONTENT',
    rarity: 'EPIC',
    requirement: 1000
  },

  // MILESTONE Achievements
  {
    name: 'early_adopter',
    title: 'Early Adopter',
    description: 'Join PenguBook in its early days',
    icon: '🐧',
    category: 'MILESTONE',
    rarity: 'RARE',
    requirement: 1
  },
  {
    name: 'one_week_strong',
    title: 'One Week Strong',
    description: 'Be active for 7 days',
    icon: '📅',
    category: 'MILESTONE',
    rarity: 'COMMON',
    requirement: 7
  },
  {
    name: 'monthly_regular',
    title: 'Monthly Regular',
    description: 'Be active for 30 days',
    icon: '🗓️',
    category: 'MILESTONE',
    rarity: 'RARE',
    requirement: 30
  },
  {
    name: 'loyal_penguin',
    title: 'Loyal Penguin',
    description: 'Be active for 100 days',
    icon: '🏆',
    category: 'MILESTONE',
    rarity: 'EPIC',
    requirement: 100
  },

  // SPECIAL Achievements
  {
    name: 'first_tip',
    title: 'Generous Spirit',
    description: 'Send your first tip',
    icon: '💝',
    category: 'SPECIAL',
    rarity: 'COMMON',
    requirement: 1
  },
  {
    name: 'crypto_whale',
    title: 'Crypto Whale',
    description: 'Send 10 tips',
    icon: '🐋',
    category: 'SPECIAL',
    rarity: 'RARE',
    requirement: 10
  },
  {
    name: 'social_connector',
    title: 'Social Connector',
    description: 'Link all your social accounts',
    icon: '🔗',
    category: 'SPECIAL',
    rarity: 'RARE',
    requirement: 2 // Discord + Twitter
  },
  {
    name: 'profile_perfectionist',
    title: 'Profile Perfectionist',
    description: 'Complete your profile 100%',
    icon: '✨',
    category: 'SPECIAL',
    rarity: 'RARE',
    requirement: 100
  }
]

export function checkAchievementProgress(
  achievementName: string,
  currentValue: number
): { earned: boolean; progress: number } {
  const achievement = ACHIEVEMENT_DEFINITIONS.find(a => a.name === achievementName)
  if (!achievement) {
    return { earned: false, progress: 0 }
  }

  const progress = Math.min(100, Math.floor((currentValue / achievement.requirement) * 100))
  const earned = currentValue >= achievement.requirement

  return { earned, progress }
}

export function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'COMMON':
      return 'text-gray-400 border-gray-500/50'
    case 'RARE':
      return 'text-blue-400 border-blue-500/50'
    case 'EPIC':
      return 'text-purple-400 border-purple-500/50'
    case 'LEGENDARY':
      return 'text-yellow-400 border-yellow-500/50'
    default:
      return 'text-gray-400 border-gray-500/50'
  }
}

export function getRarityBackground(rarity: string): string {
  switch (rarity) {
    case 'COMMON':
      return 'bg-gray-500/10'
    case 'RARE':
      return 'bg-blue-500/10'
    case 'EPIC':
      return 'bg-purple-500/10'
    case 'LEGENDARY':
      return 'bg-yellow-500/10'
    default:
      return 'bg-gray-500/10'
  }
}