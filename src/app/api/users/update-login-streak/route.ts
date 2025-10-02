import { NextRequest, NextResponse } from 'next/server'
import { updateLoginStreak } from '@/lib/streak-tracker'
import { checkAndAwardAchievements } from '@/lib/achievement-checker'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // Update login streak
    const streakResult = await updateLoginStreak(userId)

    // Check for streak-based achievements if streak was extended or is new
    if (streakResult.wasExtended || streakResult.isNew) {
      try {
        const achievementResult = await checkAndAwardAchievements(userId, 'streak')
        if (achievementResult.newAchievements.length > 0) {
          console.log(`[Login Streak] User ${userId} unlocked achievements: ${achievementResult.newAchievements.join(', ')}`)
        }
      } catch (error) {
        console.error('[Login Streak] Failed to check achievements:', error)
      }
    }

    return NextResponse.json({
      success: true,
      streak: streakResult
    })
  } catch (error) {
    console.error('Failed to update login streak:', error)
    return NextResponse.json(
      { error: 'Failed to update login streak' },
      { status: 500 }
    )
  }
}
