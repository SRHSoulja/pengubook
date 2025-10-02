import { prisma } from '@/lib/prisma'
import { logStreakAudit, detectSuspiciousStreakActivity } from './streak-audit'

export type StreakType = 'DAILY_LOGIN' | 'DAILY_POST' | 'DAILY_INTERACTION'

interface StreakUpdateResult {
  streakType: StreakType
  currentCount: number
  bestCount: number
  isActive: boolean
  wasExtended: boolean
  wasBroken: boolean
  isNew: boolean
}

interface StreakValidationResult {
  isValid: boolean
  reason?: string
}

/**
 * Rate limiting map to prevent rapid streak updates
 * Key: userId:streakType, Value: last update timestamp
 */
const streakUpdateCache = new Map<string, number>()

/**
 * Get server timestamp (cannot be manipulated by client)
 * SECURITY: Always use server time, never trust client-provided timestamps
 */
function getServerTime(): Date {
  return new Date()
}

/**
 * Check if two dates are the same day (ignoring time)
 * SECURITY: Uses server-side Date objects only
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Check if date2 is the day after date1
 * SECURITY: Server-side date calculation only
 */
function isConsecutiveDay(date1: Date, date2: Date): boolean {
  const nextDay = new Date(date1)
  nextDay.setDate(nextDay.getDate() + 1)
  return isSameDay(nextDay, date2)
}

/**
 * Validate streak update to prevent manipulation
 * SECURITY: Server-side validation checks
 */
async function validateStreakUpdate(
  userId: string,
  streakType: StreakType,
  lastDate: Date | null
): Promise<StreakValidationResult> {
  const cacheKey = `${userId}:${streakType}`
  const now = getServerTime()

  // 1. Rate limiting: Prevent rapid-fire updates
  const lastUpdate = streakUpdateCache.get(cacheKey)
  if (lastUpdate) {
    const timeSinceLastUpdate = now.getTime() - lastUpdate
    const MIN_UPDATE_INTERVAL = 10 * 60 * 1000 // 10 minutes

    if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL) {
      return {
        isValid: false,
        reason: 'Rate limit: Too many streak updates. Please wait 10 minutes.'
      }
    }
  }

  // 2. Time travel detection: Check if lastDate is in the future
  if (lastDate && lastDate.getTime() > now.getTime() + 60000) { // 1 minute tolerance for clock skew
    console.warn(`[SECURITY] Potential time manipulation detected for user ${userId}: lastDate is in the future`)
    return {
      isValid: false,
      reason: 'Invalid timestamp detected'
    }
  }

  // 3. Anomaly detection: Check if streak gap is too large (more than 365 days)
  if (lastDate) {
    const daysSinceLastUpdate = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceLastUpdate > 365) {
      console.warn(`[SECURITY] Suspicious streak gap detected for user ${userId}: ${daysSinceLastUpdate} days`)
      await logStreakAudit({
        userId,
        streakType,
        event: 'SUSPICIOUS_ACTIVITY',
        metadata: {
          reason: 'Large streak gap',
          daysSinceLastUpdate: Math.floor(daysSinceLastUpdate)
        }
      })
      // Allow it but log it - might be a legitimate long absence
    }
  }

  // 4. Pattern detection: Check for suspicious activity patterns
  const isSuspicious = await detectSuspiciousStreakActivity(userId, streakType)
  if (isSuspicious) {
    return {
      isValid: false,
      reason: 'Suspicious activity pattern detected. Please contact support if this is an error.'
    }
  }

  return { isValid: true }
}

/**
 * Update a user's streak based on activity
 * @param userId - User ID
 * @param streakType - Type of streak to update
 * @returns Updated streak information
 * SECURITY: All timestamps use server time, client input is never trusted
 */
export async function updateStreak(
  userId: string,
  streakType: StreakType
): Promise<StreakUpdateResult> {
  try {
    // SECURITY: Always use server time
    const now = getServerTime()
    const cacheKey = `${userId}:${streakType}`

    // Get or create the streak record
    let streak = await prisma.streak.findUnique({
      where: {
        userId_streakType: {
          userId,
          streakType
        }
      }
    })

    // SECURITY: Validate before updating
    const validation = await validateStreakUpdate(
      userId,
      streakType,
      streak?.lastDate || null
    )

    if (!validation.isValid) {
      console.warn(`[SECURITY] Streak update blocked for user ${userId}: ${validation.reason}`)
      await logStreakAudit({
        userId,
        streakType,
        event: 'STREAK_UPDATE_BLOCKED',
        metadata: { reason: validation.reason }
      })
      throw new Error(validation.reason || 'Invalid streak update')
    }

    // Update rate limit cache
    streakUpdateCache.set(cacheKey, now.getTime())

    // If no streak exists, create a new one
    if (!streak) {
      streak = await prisma.streak.create({
        data: {
          userId,
          streakType,
          currentCount: 1,
          bestCount: 1,
          lastDate: now,
          isActive: true
        }
      })

      await logStreakAudit({
        userId,
        streakType,
        event: 'STREAK_CREATED',
        metadata: { currentCount: 1 }
      })

      return {
        streakType,
        currentCount: 1,
        bestCount: 1,
        isActive: true,
        wasExtended: false,
        wasBroken: false,
        isNew: true
      }
    }

    const lastDate = new Date(streak.lastDate)
    const today = getServerTime() // SECURITY: Use server time

    // Case 1: Activity already recorded today - no change
    if (isSameDay(lastDate, today)) {
      return {
        streakType,
        currentCount: streak.currentCount,
        bestCount: streak.bestCount,
        isActive: streak.isActive,
        wasExtended: false,
        wasBroken: false,
        isNew: false
      }
    }

    // Case 2: Activity is consecutive (yesterday -> today)
    if (isConsecutiveDay(lastDate, today)) {
      const newCount = streak.currentCount + 1
      const newBest = Math.max(newCount, streak.bestCount)

      await prisma.streak.update({
        where: {
          userId_streakType: {
            userId,
            streakType
          }
        },
        data: {
          currentCount: newCount,
          bestCount: newBest,
          lastDate: now,
          isActive: true
        }
      })

      await logStreakAudit({
        userId,
        streakType,
        event: 'STREAK_EXTENDED',
        metadata: {
          previousCount: streak.currentCount,
          newCount,
          bestCount: newBest
        }
      })

      return {
        streakType,
        currentCount: newCount,
        bestCount: newBest,
        isActive: true,
        wasExtended: true,
        wasBroken: false,
        isNew: false
      }
    }

    // Case 3: Streak was broken (more than 1 day gap)
    const daysSinceLast = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))

    await prisma.streak.update({
      where: {
        userId_streakType: {
          userId,
          streakType
        }
      },
      data: {
        currentCount: 1,
        lastDate: now,
        isActive: true
      }
    })

    await logStreakAudit({
      userId,
      streakType,
      event: 'STREAK_BROKEN',
      metadata: {
        previousCount: streak.currentCount,
        daysSinceLast,
        bestCount: streak.bestCount
      }
    })

    return {
      streakType,
      currentCount: 1,
      bestCount: streak.bestCount,
      isActive: true,
      wasExtended: false,
      wasBroken: true,
      isNew: false
    }

  } catch (error) {
    console.error('Error updating streak:', error)
    throw error
  }
}

/**
 * Get a user's current streak information
 */
export async function getStreak(
  userId: string,
  streakType: StreakType
): Promise<StreakUpdateResult | null> {
  try {
    const streak = await prisma.streak.findUnique({
      where: {
        userId_streakType: {
          userId,
          streakType
        }
      }
    })

    if (!streak) {
      return null
    }

    // Check if streak is still active (within last 24 hours)
    const now = new Date()
    const lastDate = new Date(streak.lastDate)
    const hoursSinceActivity = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60)

    // If more than 48 hours, streak is definitely broken but not yet updated
    const isActive = hoursSinceActivity < 48

    return {
      streakType,
      currentCount: streak.currentCount,
      bestCount: streak.bestCount,
      isActive,
      wasExtended: false,
      wasBroken: false,
      isNew: false
    }

  } catch (error) {
    console.error('Error getting streak:', error)
    return null
  }
}

/**
 * Get all streaks for a user
 */
export async function getAllStreaks(userId: string): Promise<{
  dailyLogin: StreakUpdateResult | null
  dailyPost: StreakUpdateResult | null
  dailyInteraction: StreakUpdateResult | null
}> {
  try {
    const [dailyLogin, dailyPost, dailyInteraction] = await Promise.all([
      getStreak(userId, 'DAILY_LOGIN'),
      getStreak(userId, 'DAILY_POST'),
      getStreak(userId, 'DAILY_INTERACTION')
    ])

    return {
      dailyLogin,
      dailyPost,
      dailyInteraction
    }
  } catch (error) {
    console.error('Error getting all streaks:', error)
    return {
      dailyLogin: null,
      dailyPost: null,
      dailyInteraction: null
    }
  }
}

/**
 * Update login streak (called when user authenticates)
 */
export async function updateLoginStreak(userId: string): Promise<StreakUpdateResult> {
  return updateStreak(userId, 'DAILY_LOGIN')
}

/**
 * Update post streak (called when user creates a post)
 */
export async function updatePostStreak(userId: string): Promise<StreakUpdateResult> {
  return updateStreak(userId, 'DAILY_POST')
}

/**
 * Update interaction streak (called when user likes, comments, etc.)
 */
export async function updateInteractionStreak(userId: string): Promise<StreakUpdateResult> {
  return updateStreak(userId, 'DAILY_INTERACTION')
}

/**
 * Check if a streak milestone was reached (for achievements)
 */
export function checkStreakMilestone(
  currentCount: number,
  previousCount: number,
  milestones: number[]
): number | null {
  // Check if we crossed any milestone thresholds
  for (const milestone of milestones.sort((a, b) => a - b)) {
    if (previousCount < milestone && currentCount >= milestone) {
      return milestone
    }
  }
  return null
}
