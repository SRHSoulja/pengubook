'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/providers/AuthProvider'

/**
 * Hook that periodically checks and updates login streaks for active users
 * This ensures users who stay logged in for extended periods still get their daily streak bonus
 */
export function useStreakChecker() {
  const { user, walletAddress } = useAuth()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckRef = useRef<number>(0)

  useEffect(() => {
    if (!user?.id || !walletAddress) {
      // Clear interval if user logs out
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    // Function to check streak
    const checkStreak = async () => {
      const now = Date.now()
      const today = new Date().toDateString()
      const lastStreakDate = sessionStorage.getItem('last-streak-date')
      const hoursSinceLastCheck = (now - lastCheckRef.current) / (1000 * 60 * 60)

      // Only check if:
      // 1. It's a new day, OR
      // 2. It's been at least 12 hours since last check
      const isNewDay = lastStreakDate !== today
      const enoughTimePassed = hoursSinceLastCheck >= 12

      if (!isNewDay && !enoughTimePassed) {
        return
      }

      try {
        const response = await fetch('/api/users/check-streak', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-wallet-address': walletAddress
          },
          body: JSON.stringify({ userId: user.id })
        })

        const data = await response.json()

        if (response.ok) {
          lastCheckRef.current = now
          // Update session storage
          sessionStorage.setItem('last-streak-update', now.toString())
          sessionStorage.setItem('last-streak-date', today)

          // If new achievements were unlocked, you could show a notification here
          if (data.newAchievements && data.newAchievements.length > 0) {
            console.log('🏆 New streak achievements unlocked:', data.newAchievements)
            // Optional: Trigger a toast notification or achievement popup
          }

          // Log streak update
          if (data.streak) {
            console.log(`✅ Login streak updated: ${data.streak.currentCount} days`)
          }
        }
      } catch (error) {
        console.error('Failed to check streak:', error)
      }
    }

    // Check streak immediately on mount (if enough time has passed)
    checkStreak()

    // Set up interval to check every hour
    intervalRef.current = setInterval(checkStreak, 60 * 60 * 1000) // Check every hour

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [user?.id, walletAddress])

  return null
}
