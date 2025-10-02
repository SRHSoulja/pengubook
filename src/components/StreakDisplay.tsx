'use client'

import { useState, useEffect } from 'react'

interface StreakInfo {
  streakType: string
  currentCount: number
  bestCount: number
  isActive: boolean
}

interface StreakDisplayProps {
  userId: string
  compact?: boolean
}

export default function StreakDisplay({ userId, compact = false }: StreakDisplayProps) {
  const [streaks, setStreaks] = useState<{
    dailyLogin: StreakInfo | null
    dailyPost: StreakInfo | null
    dailyInteraction: StreakInfo | null
  }>({
    dailyLogin: null,
    dailyPost: null,
    dailyInteraction: null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStreaks()
  }, [userId])

  const fetchStreaks = async () => {
    try {
      const response = await fetch(`/api/users/${userId}/streaks`)
      const data = await response.json()

      if (response.ok) {
        setStreaks(data.streaks)
      }
    } catch (error) {
      console.error('Failed to fetch streaks:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-20 bg-white/5 rounded-xl"></div>
      </div>
    )
  }

  const streakData = [
    {
      name: 'Login Streak',
      icon: '📅',
      color: 'from-blue-500 to-cyan-500',
      current: streaks.dailyLogin?.currentCount || 0,
      best: streaks.dailyLogin?.bestCount || 0,
      isActive: streaks.dailyLogin?.isActive || false
    },
    {
      name: 'Post Streak',
      icon: '✍️',
      color: 'from-purple-500 to-pink-500',
      current: streaks.dailyPost?.currentCount || 0,
      best: streaks.dailyPost?.bestCount || 0,
      isActive: streaks.dailyPost?.isActive || false
    },
    {
      name: 'Interaction Streak',
      icon: '💬',
      color: 'from-green-500 to-emerald-500',
      current: streaks.dailyInteraction?.currentCount || 0,
      best: streaks.dailyInteraction?.bestCount || 0,
      isActive: streaks.dailyInteraction?.isActive || false
    }
  ]

  if (compact) {
    // Compact view - single row with icons
    return (
      <div className="flex gap-3">
        {streakData.map((streak) => (
          <div
            key={streak.name}
            className={`flex items-center gap-2 bg-gradient-to-r ${streak.color} px-4 py-2 rounded-lg`}
            title={`${streak.name}: ${streak.current} days (Best: ${streak.best})`}
          >
            <span className="text-2xl">{streak.icon}</span>
            <div className="flex flex-col">
              <span className="text-white font-bold text-lg">{streak.current}</span>
              <span className="text-white/80 text-xs">days</span>
            </div>
            {!streak.isActive && streak.current > 0 && (
              <span className="text-white/60 text-xs">❄️</span>
            )}
          </div>
        ))}
      </div>
    )
  }

  // Full view - detailed cards
  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white flex items-center gap-2">
        <span>🔥</span>
        Your Streaks
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {streakData.map((streak) => (
          <div
            key={streak.name}
            className="relative bg-white/5 backdrop-blur-lg border border-white/20 rounded-xl p-4 overflow-hidden"
          >
            {/* Gradient background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${streak.color} opacity-10`}></div>

            {/* Content */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{streak.icon}</span>
                {!streak.isActive && streak.current > 0 && (
                  <span className="text-2xl" title="Streak frozen">❄️</span>
                )}
                {streak.isActive && streak.current > 0 && (
                  <span className="text-2xl animate-pulse">🔥</span>
                )}
              </div>

              <h4 className="text-white font-semibold mb-2">{streak.name}</h4>

              <div className="space-y-2">
                <div>
                  <div className="text-gray-400 text-sm">Current</div>
                  <div className={`text-3xl font-bold bg-gradient-to-r ${streak.color} bg-clip-text text-transparent`}>
                    {streak.current} {streak.current === 1 ? 'day' : 'days'}
                  </div>
                </div>

                {streak.best > streak.current && (
                  <div>
                    <div className="text-gray-400 text-sm">Personal Best</div>
                    <div className="text-yellow-400 text-xl font-semibold">
                      {streak.best} {streak.best === 1 ? 'day' : 'days'}
                    </div>
                  </div>
                )}
              </div>

              {/* Status indicator */}
              {streak.isActive && streak.current > 0 ? (
                <div className="mt-3 flex items-center gap-2 text-green-400 text-sm">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Active</span>
                </div>
              ) : streak.current > 0 ? (
                <div className="mt-3 flex items-center gap-2 text-blue-400 text-sm">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span>Frozen</span>
                </div>
              ) : (
                <div className="mt-3 text-gray-500 text-sm">
                  Start your streak today!
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Motivational message */}
      {streakData.some(s => s.isActive && s.current >= 7) && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 rounded-xl p-4 text-center">
          <p className="text-yellow-300 font-semibold">
            🎉 Amazing! You're on fire with your streaks! Keep it up!
          </p>
        </div>
      )}
    </div>
  )
}
