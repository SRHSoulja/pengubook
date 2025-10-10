// Gamification and achievement types
import type { User } from './user'

export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  category: string
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  xpReward: number
  requirements: string
  isSecret: boolean
  createdAt: Date
}

export interface UserAchievement {
  id: string
  userId: string
  user?: User
  achievementId: string
  achievement?: Achievement
  progress: number
  completed: boolean
  completedAt?: Date
  createdAt: Date
}

export interface Streak {
  id: string
  userId: string
  user?: User
  streakType: 'DAILY_LOGIN' | 'DAILY_TIP' | 'DAILY_POST' | 'WEEKLY_ACTIVE'
  currentStreak: number
  longestStreak: number
  lastActivityDate: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}