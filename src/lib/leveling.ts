import { prisma } from '@/lib/prisma'
import { PrismaClient } from '@prisma/client'

// XP requirements for each level
export const LEVEL_REQUIREMENTS = {
  1: 0,
  2: 100,
  3: 250,
  4: 500,
  5: 1000,
  6: 1500,
  7: 2500,
  8: 4000,
  9: 6000,
  10: 10000,
  // Continue pattern: each level requires significantly more XP
  11: 15000,
  12: 22000,
  13: 32000,
  14: 45000,
  15: 65000,
  16: 90000,
  17: 125000,
  18: 175000,
  19: 250000,
  20: 350000
}

// XP earning configuration interface
export interface XPEarningConfig {
  createPost: number
  createComment: number
  receiveReaction: number
  giveReaction: number
  postShared: number
  sharePost: number
  dailyLogin: number
  profileComplete: number
  receiveTip: number
  sendTip: number
}

// Default XP rewards
const DEFAULT_XP_CONFIG: XPEarningConfig = {
  createPost: 10,
  createComment: 5,
  receiveReaction: 2,
  giveReaction: 1,
  postShared: 5,
  sharePost: 3,
  dailyLogin: 10,
  profileComplete: 50,
  receiveTip: 20,
  sendTip: 5
}

// Load XP earning configuration from file (server-side only)
async function loadXPConfig(): Promise<XPEarningConfig> {
  // Only import fs on server-side
  if (typeof window === 'undefined') {
    try {
      const { promises: fs } = await import('fs')
      const path = await import('path')
      const configPath = path.join(process.cwd(), 'data', 'xp-earning.json')
      const data = await fs.readFile(configPath, 'utf-8')
      return JSON.parse(data)
    } catch (error) {
      // If file doesn't exist or can't be read, return default config
      return DEFAULT_XP_CONFIG
    }
  }
  return DEFAULT_XP_CONFIG
}

// Legacy XP rewards mapping (for backwards compatibility)
export const XP_REWARDS = {
  POST_CREATED: 10,
  COMMENT_POSTED: 5,
  POST_LIKED: 2,
  COMMENT_LIKED: 1,
  FOLLOWED: 3,
  COMMUNITY_JOINED: 15,
  DAILY_LOGIN: 5,
  PROFILE_COMPLETED: 50,
  FIRST_POST: 25,
  SOCIAL_LINK_ADDED: 20,
  TIP_SENT: 5,
  TIP_RECEIVED: 10
}

// Calculate level from XP
export function calculateLevel(xp: number): number {
  let level = 1
  for (const [lvl, requirement] of Object.entries(LEVEL_REQUIREMENTS)) {
    if (xp >= requirement) {
      level = parseInt(lvl)
    } else {
      break
    }
  }
  return Math.min(level, 20) // Cap at level 20
}

// Get XP needed for next level
export function getXpForNextLevel(currentLevel: number): number {
  const nextLevel = Math.min(currentLevel + 1, 20)
  return LEVEL_REQUIREMENTS[nextLevel as keyof typeof LEVEL_REQUIREMENTS] || LEVEL_REQUIREMENTS[20]
}

// Get progress to next level (0-100%)
export function getLevelProgress(xp: number, currentLevel: number): number {
  if (currentLevel >= 20) return 100

  const currentLevelXp = LEVEL_REQUIREMENTS[currentLevel as keyof typeof LEVEL_REQUIREMENTS] || 0
  const nextLevelXp = getXpForNextLevel(currentLevel)
  const progressXp = xp - currentLevelXp
  const requiredXp = nextLevelXp - currentLevelXp

  return Math.floor((progressXp / requiredXp) * 100)
}

// Award XP to a user with custom amount
export async function awardXPAmount(userId: string, xpAmount: number, prisma?: PrismaClient): Promise<{
  xpGained: number
  newXp: number
  oldLevel: number
  newLevel: number
  leveledUp: boolean
}> {
  const db = prisma || new PrismaClient()
  const shouldDisconnect = !prisma

  try {
    // Get current user data
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { xp: true, level: true }
    })

    if (!user) {
      throw new Error('User not found')
    }

    const oldLevel = user.level
    const newXp = user.xp + xpAmount
    const newLevel = calculateLevel(newXp)
    const leveledUp = newLevel > oldLevel

    // Update user XP and level
    await db.user.update({
      where: { id: userId },
      data: {
        xp: newXp,
        level: newLevel
      }
    })

    return {
      xpGained: xpAmount,
      newXp,
      oldLevel,
      newLevel,
      leveledUp
    }
  } finally {
    if (shouldDisconnect) {
      await db.$disconnect()
    }
  }
}

// Award XP for creating a post
export async function awardXPForPost(userId: string, prisma?: PrismaClient) {
  const config = await loadXPConfig()
  return awardXPAmount(userId, config.createPost, prisma)
}

// Award XP for creating a comment
export async function awardXPForComment(userId: string, prisma?: PrismaClient) {
  const config = await loadXPConfig()
  return awardXPAmount(userId, config.createComment, prisma)
}

// Award XP for receiving a reaction
export async function awardXPForReceivingReaction(userId: string, prisma?: PrismaClient) {
  const config = await loadXPConfig()
  return awardXPAmount(userId, config.receiveReaction, prisma)
}

// Award XP for giving a reaction
export async function awardXPForGivingReaction(userId: string, prisma?: PrismaClient) {
  const config = await loadXPConfig()
  return awardXPAmount(userId, config.giveReaction, prisma)
}

// Award XP for having post shared
export async function awardXPForPostShared(userId: string, prisma?: PrismaClient) {
  const config = await loadXPConfig()
  return awardXPAmount(userId, config.postShared, prisma)
}

// Award XP for sharing a post
export async function awardXPForSharing(userId: string, prisma?: PrismaClient) {
  const config = await loadXPConfig()
  return awardXPAmount(userId, config.sharePost, prisma)
}

// Award XP for daily login
export async function awardXPForDailyLogin(userId: string, prisma?: PrismaClient) {
  const config = await loadXPConfig()
  return awardXPAmount(userId, config.dailyLogin, prisma)
}

// Award XP for completing profile
export async function awardXPForProfileComplete(userId: string, prisma?: PrismaClient) {
  const config = await loadXPConfig()
  return awardXPAmount(userId, config.profileComplete, prisma)
}

// Award XP for receiving a tip
export async function awardXPForReceivingTip(userId: string, prisma?: PrismaClient) {
  const config = await loadXPConfig()
  return awardXPAmount(userId, config.receiveTip, prisma)
}

// Award XP for sending a tip
export async function awardXPForSendingTip(userId: string, prisma?: PrismaClient) {
  const config = await loadXPConfig()
  return awardXPAmount(userId, config.sendTip, prisma)
}

// Legacy function for backwards compatibility
export async function awardXP(userId: string, action: keyof typeof XP_REWARDS, prisma?: PrismaClient): Promise<{
  xpGained: number
  newXp: number
  oldLevel: number
  newLevel: number
  leveledUp: boolean
}> {
  const xpGained = XP_REWARDS[action]
  return awardXPAmount(userId, xpGained, prisma)
}

// Get level info for display
export function getLevelInfo(xp: number, level: number) {
  const nextLevel = Math.min(level + 1, 20)
  const currentLevelXp = LEVEL_REQUIREMENTS[level as keyof typeof LEVEL_REQUIREMENTS] || 0
  const nextLevelXp = LEVEL_REQUIREMENTS[nextLevel as keyof typeof LEVEL_REQUIREMENTS] || LEVEL_REQUIREMENTS[20]
  const progress = getLevelProgress(xp, level)

  return {
    currentLevel: level,
    nextLevel,
    currentXp: xp,
    currentLevelXp,
    nextLevelXp,
    xpToNextLevel: nextLevelXp - xp,
    progress,
    isMaxLevel: level >= 20
  }
}

// Get level benefits/requirements
export function getLevelBenefits(level: number): string[] {
  const benefits: string[] = []

  if (level >= 2) benefits.push('Can like posts and comments')
  if (level >= 3) benefits.push('Can send friend requests')
  if (level >= 4) benefits.push('Can send tips to other users')
  if (level >= 5) benefits.push('Can create communities')
  if (level >= 7) benefits.push('Can moderate discussions')
  if (level >= 10) benefits.push('Can create advertisements')
  if (level >= 15) benefits.push('Trusted community member status')
  if (level >= 20) benefits.push('Max level - Community Elder')

  return benefits
}

// Get level title/badge
export function getLevelTitle(level: number): string {
  if (level >= 20) return 'Community Elder'
  if (level >= 15) return 'Trusted Member'
  if (level >= 10) return 'Active Member'
  if (level >= 7) return 'Community Helper'
  if (level >= 5) return 'Community Builder'
  if (level >= 3) return 'Social Penguin'
  if (level >= 2) return 'Active Penguin'
  return 'New Penguin'
}