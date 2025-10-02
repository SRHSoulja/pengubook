import { NextRequest, NextResponse } from 'next/server'
import { updateLoginStreak } from '@/lib/streak-tracker'
import { checkAndAwardAchievements } from '@/lib/achievement-checker'

export const dynamic = 'force-dynamic'

/**
 * This endpoint can be called periodically (e.g., via a heartbeat)
 * to update login streaks for users who remain logged in
 */
export async function POST(req: NextRequest) {
  try {
    const walletAddress = req.headers.get('x-wallet-address')
    const { userId } = await req.json()

    if (!userId || !walletAddress) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Update login streak
    const streakResult = await updateLoginStreak(userId)

    // If this is a new streak or was extended, check for achievements
    if (streakResult.wasExtended || streakResult.isNew) {
      try {
        const achievementResult = await checkAndAwardAchievements(userId, 'streak')
        if (achievementResult.newAchievements.length > 0) {
          console.log(`[Check Streak] User ${userId} unlocked achievements: ${achievementResult.newAchievements.join(', ')}`)

          return NextResponse.json({
            success: true,
            streak: streakResult,
            newAchievements: achievementResult.newAchievements
          })
        }
      } catch (error) {
        console.error('[Check Streak] Failed to check achievements:', error)
      }
    }

    return NextResponse.json({
      success: true,
      streak: streakResult,
      newAchievements: []
    })
  } catch (error) {
    console.error('Failed to check streak:', error)
    return NextResponse.json(
      { error: 'Failed to check streak' },
      { status: 500 }
    )
  }
}
