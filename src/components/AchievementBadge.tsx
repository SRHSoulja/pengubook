'use client'

import { getRarityColor, getRarityBackground } from '@/lib/achievements'

interface Achievement {
  id: string
  name: string
  title: string
  description: string
  icon: string
  category: string
  rarity: string
  requirement: number
  earned: boolean
  progress: number
  currentValue: number
  unlockedAt: string | null
}

interface AchievementBadgeProps {
  achievement: Achievement
  size?: 'sm' | 'md' | 'lg'
  showProgress?: boolean
  onClick?: () => void
}

export default function AchievementBadge({
  achievement,
  size = 'md',
  showProgress = true,
  onClick
}: AchievementBadgeProps) {
  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-20 h-20',
    lg: 'w-24 h-24'
  }

  const iconSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl'
  }

  const rarityColor = getRarityColor(achievement.rarity)
  const rarityBg = getRarityBackground(achievement.rarity)

  return (
    <div
      className={`
        relative rounded-xl border-2 p-2 transition-all duration-300 cursor-pointer
        ${achievement.earned ? rarityColor : 'text-gray-500 border-gray-600/50'}
        ${achievement.earned ? rarityBg : 'bg-gray-800/30'}
        ${achievement.earned ? 'hover:scale-105' : 'hover:scale-102 opacity-60'}
        ${sizeClasses[size]}
      `}
      onClick={onClick}
      title={`${achievement.title} - ${achievement.description}`}
    >
      {/* Achievement Icon */}
      <div className="flex items-center justify-center h-full">
        <span className={`${iconSizes[size]} ${achievement.earned ? '' : 'grayscale'}`}>
          {achievement.earned ? achievement.icon : '🔒'}
        </span>
      </div>

      {/* Progress Ring (for unlocked achievements with partial progress) */}
      {showProgress && !achievement.earned && achievement.progress > 0 && (
        <div className="absolute inset-0 rounded-xl">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="opacity-20"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${achievement.progress * 2.83} 283`}
              className="opacity-60"
            />
          </svg>
        </div>
      )}

      {/* Rarity indicator */}
      {achievement.earned && (
        <div className="absolute -top-1 -right-1">
          <div className={`
            w-3 h-3 rounded-full border
            ${achievement.rarity === 'LEGENDARY' ? 'bg-yellow-400 border-yellow-500' : ''}
            ${achievement.rarity === 'EPIC' ? 'bg-purple-400 border-purple-500' : ''}
            ${achievement.rarity === 'RARE' ? 'bg-blue-400 border-blue-500' : ''}
            ${achievement.rarity === 'COMMON' ? 'bg-gray-400 border-gray-500' : ''}
          `} />
        </div>
      )}

      {/* New achievement glow effect */}
      {achievement.earned && achievement.unlockedAt && (
        <div className="absolute inset-0 rounded-xl animate-pulse">
          <div className="w-full h-full rounded-xl bg-gradient-to-r from-yellow-400/20 via-yellow-300/20 to-yellow-400/20" />
        </div>
      )}
    </div>
  )
}