import { prisma } from '@/lib/prisma'
import { checkAchievementProgress } from './achievements'
import { getAllStreaks } from './streak-tracker'
import { getProfileCompletionPercentage } from './profile-completion'

export interface AchievementCheckResult {
  newAchievements: string[]
  totalEarned: number
}

// Helper function to detect trigger type from legacy achievement names
function detectTriggerFromName(name: string): string {
  if (name.includes('post')) return 'post'
  if (name.includes('like') || name.includes('crowd') || name.includes('viral')) return 'like'
  if (name.includes('friend') || name.includes('social_butterfly') || name.includes('influencer') || name.includes('celebrity') || name.includes('megastar')) return 'follow'
  if (name.includes('tip') || name.includes('whale')) return 'tip'
  if (name.includes('profile') || name.includes('social_connector')) return 'profile'
  if (name.includes('streak') || name.includes('daily') || name.includes('consecutive')) return 'streak'
  if (name.includes('loyal') || name.includes('week') || name.includes('month')) return 'loyalty'
  return 'post' // default
}

// Helper function to detect metric type from legacy achievement names
function detectMetricFromName(name: string): string {
  if (name.includes('post')) return 'post_count'
  if (name.includes('friend') || name.includes('follower') || name.includes('social_butterfly') || name.includes('influencer') || name.includes('celebrity') || name.includes('megastar')) return 'follower_count'
  if (name.includes('like') || name.includes('crowd') || name.includes('viral')) return 'likes_received'
  if (name.includes('tip') || name.includes('whale')) return 'tips_given'
  if (name === 'profile_perfectionist') return 'profile_completion'
  if (name === 'social_connector') return 'linked_accounts'
  if (name.includes('login_streak')) return 'login_streak'
  if (name.includes('post_streak')) return 'post_streak'
  if (name.includes('interaction_streak')) return 'interaction_streak'
  if (name.includes('loyal') || name.includes('week') || name.includes('month')) return 'days_since_join'
  return 'post_count' // default
}

// Helper function to get metric value from user data
function getMetricValue(user: any, metricType: string, streaks: any): number | null {
  switch (metricType) {
    case 'post_count':
      return user.posts?.length || 0

    case 'follower_count':
      return user.followers?.length || 0

    case 'likes_received':
      return user.profile?.likesReceived || 0

    case 'tips_given':
      return user.tipsGiven?.length || 0

    case 'profile_completion':
      return getProfileCompletionPercentage(user)

    case 'linked_accounts':
      let count = 0
      if (user.discordId) count++
      if (user.twitterId) count++
      return count

    case 'login_streak':
      return streaks.dailyLogin?.currentCount || 0

    case 'post_streak':
      return streaks.dailyPost?.currentCount || 0

    case 'interaction_streak':
      return streaks.dailyInteraction?.currentCount || 0

    case 'days_since_join':
      return Math.floor(
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      )

    default:
      return null
  }
}

export async function checkAndAwardAchievements(
  userId: string,
  triggerType?: 'post' | 'like' | 'follow' | 'tip' | 'profile' | 'streak' | 'all'
): Promise<AchievementCheckResult> {

  const newAchievements: string[] = []

  try {
    // Get user data for calculations
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        posts: { select: { id: true } },
        followers: { select: { id: true } },
        tipsGiven: { select: { id: true } },
        userAchievements: {
          include: { achievement: true }
        }
      }
    })

    if (!user) {
      return { newAchievements: [], totalEarned: 0 }
    }

    // Get streak data
    const streaks = await getAllStreaks(userId)

    // Get all active achievements
    const allAchievements = await prisma.achievement.findMany({
      where: { isActive: true }
    })

    // Check each achievement
    for (const achievement of allAchievements) {
      // Skip if user already has this achievement
      const hasAchievement = user.userAchievements.some(
        ua => ua.achievementId === achievement.id
      )
      if (hasAchievement) continue

      // Get trigger and metric types from database (fallback to name-based detection for legacy achievements)
      const achTriggerType = (achievement as any).triggerType || detectTriggerFromName(achievement.name)
      const achMetricType = (achievement as any).metricType || detectMetricFromName(achievement.name)

      // Skip if trigger type doesn't match (optimization)
      if (triggerType && triggerType !== 'all' && achTriggerType !== triggerType) {
        continue
      }

      // Calculate current value based on metric type
      const currentValue = getMetricValue(user, achMetricType, streaks)

      if (currentValue === null) {
        continue // Skip if we can't calculate this metric
      }

      // Check if achievement is earned
      if (currentValue >= achievement.requirement) {
        // Award the achievement
        await prisma.userAchievement.create({
          data: {
            userId,
            achievementId: achievement.id,
            progress: 100
          }
        })

        newAchievements.push(achievement.name)

        console.log(`🏆 Achievement unlocked for user ${userId}: ${achievement.title}`)
      }
    }

    // Get total earned achievements count
    const totalEarned = user.userAchievements.length + newAchievements.length


    return {
      newAchievements,
      totalEarned
    }

  } catch (error) {
    console.error('Error checking achievements:', error)
    return { newAchievements: [], totalEarned: 0 }
  }
}

// Helper function to update user's likes count in profile (for achievement tracking)
export async function updateUserLikesCount(userId: string): Promise<void> {
  

  try {
    // Count total likes received on user's posts
    const likesCount = await prisma.like.count({
      where: {
        post: {
          authorId: userId
        }
      }
    })

    // Update user's profile with the count
    await prisma.profile.upsert({
      where: { userId },
      update: { likesReceived: likesCount },
      create: {
        userId,
        likesReceived: likesCount,
        socialLinks: '[]',
        interests: '[]',
        languages: '[]',
        skills: '[]'
      }
    })

  } catch (error) {
    console.error('Error updating user likes count:', error)
  }
}