import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth-middleware'
import { checkAchievementProgress } from '@/lib/achievements'
import { logger, logAPI } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Get user's achievements and progress
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId') || user.id

    

    // Get target user's profile data for achievement calculations
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        profile: true,
        posts: {
          select: { id: true }
        },
        followers: {
          select: { id: true }
        },
        tipsGiven: {
          select: { id: true }
        },
        userAchievements: {
          include: {
            achievement: true
          },
          orderBy: {
            unlockedAt: 'desc'
          }
        }
      }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get all available achievements
    const allAchievements = await prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { rarity: 'asc' },
        { requirement: 'asc' }
      ]
    })

    // Calculate current progress for each achievement
    const achievementProgress = allAchievements.map(achievement => {
      const userAchievement = targetUser.userAchievements.find(
        ua => ua.achievementId === achievement.id
      )

      let currentValue = 0
      let earned = !!userAchievement

      // Calculate current value based on achievement type
      switch (achievement.name) {
        case 'first_post':
        case 'prolific_poster':
        case 'content_creator':
        case 'posting_legend':
          currentValue = targetUser.posts.length
          break

        case 'first_friend':
        case 'social_butterfly':
        case 'influencer':
        case 'celebrity':
        case 'megastar':
          currentValue = targetUser.followers.length
          break

        case 'first_like':
        case 'crowd_pleaser':
        case 'viral_sensation':
        case 'like_magnet':
          currentValue = targetUser.profile?.likesReceived || 0
          break

        case 'first_tip':
        case 'crypto_whale':
          currentValue = targetUser.tipsGiven.length
          break

        case 'early_adopter':
          // Special achievement - manually awarded
          currentValue = earned ? 1 : 0
          break

        case 'one_week_strong':
        case 'monthly_regular':
        case 'loyal_penguin':
          // Calculate days since joining
          const daysSinceJoining = Math.floor(
            (Date.now() - targetUser.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          )
          currentValue = daysSinceJoining
          break

        case 'social_connector':
          // Count linked social accounts
          let linkedAccounts = 0
          if (targetUser.discordId) linkedAccounts++
          if (targetUser.twitterId) linkedAccounts++
          currentValue = linkedAccounts
          break

        case 'profile_perfectionist':
          // Calculate profile completion percentage
          let completionScore = 0
          if (targetUser.username) completionScore += 20
          if (targetUser.displayName) completionScore += 20
          if (targetUser.bio) completionScore += 20
          if (targetUser.avatar) completionScore += 20
          if (targetUser.discordId || targetUser.twitterId) completionScore += 20
          currentValue = completionScore
          break

        default:
          currentValue = 0
      }

      const progress = checkAchievementProgress(achievement.name, currentValue)

      return {
        ...achievement,
        earned,
        progress: progress.progress,
        currentValue,
        unlockedAt: userAchievement?.unlockedAt || null
      }
    })

    // Group achievements by category
    const achievementsByCategory = achievementProgress.reduce((acc, achievement) => {
      if (!acc[achievement.category]) {
        acc[achievement.category] = []
      }
      acc[achievement.category].push(achievement)
      return acc
    }, {} as Record<string, typeof achievementProgress>)

    // Calculate statistics
    const totalAchievements = allAchievements.length
    const earnedAchievements = achievementProgress.filter(a => a.earned).length
    const completionPercentage = Math.floor((earnedAchievements / totalAchievements) * 100)


    return NextResponse.json({
      success: true,
      user: {
        id: targetUser.id,
        username: targetUser.username,
        displayName: targetUser.displayName,
        avatar: targetUser.avatar
      },
      achievements: achievementsByCategory,
      stats: {
        total: totalAchievements,
        earned: earnedAchievements,
        completion: completionPercentage
      }
    })

  } catch (error: any) {
    logAPI.error('achievements/get', error)
    return NextResponse.json(
      { error: 'Failed to fetch achievements', details: error.message },
      { status: 500 }
    )
  }
})