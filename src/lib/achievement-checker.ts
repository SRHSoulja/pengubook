import { prisma } from '@/lib/prisma'
import { checkAchievementProgress } from './achievements'
import { getAllStreaks } from './streak-tracker'

export interface AchievementCheckResult {
  newAchievements: string[]
  totalEarned: number
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

      // Skip if trigger type doesn't match (optimization)
      if (triggerType && triggerType !== 'all') {
        const relevantAchievements = {
          post: ['first_post', 'prolific_poster', 'content_creator', 'posting_legend'],
          like: ['first_like', 'crowd_pleaser', 'viral_sensation', 'like_magnet'],
          follow: ['first_friend', 'social_butterfly', 'influencer', 'celebrity', 'megastar'],
          tip: ['first_tip', 'crypto_whale'],
          profile: ['social_connector', 'profile_perfectionist'],
          streak: [] // Streak achievements will be checked by name pattern
        }

        // Check if achievement name contains streak-related keywords when trigger is 'streak'
        if (triggerType === 'streak') {
          const isStreakAchievement = achievement.name.includes('streak') ||
                                       achievement.name.includes('consecutive') ||
                                       achievement.name.includes('daily')
          if (!isStreakAchievement) {
            continue
          }
        } else if (!relevantAchievements[triggerType]?.includes(achievement.name)) {
          continue
        }
      }

      let currentValue = 0

      // Calculate current value based on achievement type
      switch (achievement.name) {
        case 'first_post':
        case 'prolific_poster':
        case 'content_creator':
        case 'posting_legend':
          currentValue = user.posts.length
          break

        case 'first_friend':
        case 'social_butterfly':
        case 'influencer':
        case 'celebrity':
        case 'megastar':
          currentValue = user.followers.length
          break

        case 'first_like':
        case 'crowd_pleaser':
        case 'viral_sensation':
        case 'like_magnet':
          currentValue = user.profile?.likesReceived || 0
          break

        case 'first_tip':
        case 'crypto_whale':
          currentValue = user.tipsGiven.length
          break

        case 'one_week_strong':
        case 'monthly_regular':
        case 'loyal_penguin':
          const daysSinceJoining = Math.floor(
            (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          )
          currentValue = daysSinceJoining
          break

        case 'social_connector':
          let linkedAccounts = 0
          if (user.discordId) linkedAccounts++
          if (user.twitterId) linkedAccounts++
          currentValue = linkedAccounts
          break

        case 'profile_perfectionist':
          let completionScore = 0
          if (user.username) completionScore += 20
          if (user.displayName) completionScore += 20
          if (user.bio) completionScore += 20
          if (user.avatar) completionScore += 20
          if (user.discordId || user.twitterId) completionScore += 20
          currentValue = completionScore
          break

        default:
          // Handle streak-based achievements
          if (achievement.name.includes('login_streak')) {
            currentValue = streaks.dailyLogin?.currentCount || 0
          } else if (achievement.name.includes('post_streak')) {
            currentValue = streaks.dailyPost?.currentCount || 0
          } else if (achievement.name.includes('interaction_streak')) {
            currentValue = streaks.dailyInteraction?.currentCount || 0
          } else if (achievement.name.includes('streak')) {
            // Generic streak - check best across all streak types
            currentValue = Math.max(
              streaks.dailyLogin?.currentCount || 0,
              streaks.dailyPost?.currentCount || 0,
              streaks.dailyInteraction?.currentCount || 0
            )
          } else {
            continue
          }
      }

      // Check if achievement is earned
      const progress = checkAchievementProgress(achievement.name, currentValue)

      if (progress.earned) {
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