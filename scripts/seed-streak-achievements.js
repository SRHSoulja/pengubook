const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const streakAchievements = [
  // Login Streak Achievements
  {
    name: 'login_streak_3',
    title: 'Three Days Strong',
    description: 'Login for 3 consecutive days',
    icon: '📅',
    category: 'MILESTONE',
    rarity: 'COMMON',
    requirement: 3,
    xpReward: 25,
    isActive: true
  },
  {
    name: 'login_streak_7',
    title: 'Week Warrior',
    description: 'Login for 7 consecutive days',
    icon: '🔥',
    category: 'MILESTONE',
    rarity: 'COMMON',
    requirement: 7,
    xpReward: 50,
    isActive: true
  },
  {
    name: 'login_streak_14',
    title: 'Two Week Champion',
    description: 'Login for 14 consecutive days',
    icon: '🌟',
    category: 'MILESTONE',
    rarity: 'RARE',
    requirement: 14,
    xpReward: 100,
    isActive: true
  },
  {
    name: 'login_streak_30',
    title: 'Monthly Dedication',
    description: 'Login for 30 consecutive days',
    icon: '👑',
    category: 'MILESTONE',
    rarity: 'EPIC',
    requirement: 30,
    xpReward: 250,
    isActive: true
  },
  {
    name: 'login_streak_100',
    title: 'Century of Commitment',
    description: 'Login for 100 consecutive days',
    icon: '💎',
    category: 'MILESTONE',
    rarity: 'LEGENDARY',
    requirement: 100,
    xpReward: 1000,
    isActive: true
  },

  // Post Streak Achievements
  {
    name: 'post_streak_3',
    title: 'Content Starter',
    description: 'Post for 3 consecutive days',
    icon: '✍️',
    category: 'ENGAGEMENT',
    rarity: 'COMMON',
    requirement: 3,
    xpReward: 30,
    isActive: true
  },
  {
    name: 'post_streak_7',
    title: 'Daily Creator',
    description: 'Post for 7 consecutive days',
    icon: '📝',
    category: 'ENGAGEMENT',
    rarity: 'RARE',
    requirement: 7,
    xpReward: 75,
    isActive: true
  },
  {
    name: 'post_streak_14',
    title: 'Consistent Creator',
    description: 'Post for 14 consecutive days',
    icon: '🎨',
    category: 'ENGAGEMENT',
    rarity: 'EPIC',
    requirement: 14,
    xpReward: 150,
    isActive: true
  },
  {
    name: 'post_streak_30',
    title: 'Content Machine',
    description: 'Post for 30 consecutive days',
    icon: '🚀',
    category: 'ENGAGEMENT',
    rarity: 'LEGENDARY',
    requirement: 30,
    xpReward: 500,
    isActive: true
  },

  // Interaction Streak Achievements
  {
    name: 'interaction_streak_3',
    title: 'Social Starter',
    description: 'Interact (like/comment) for 3 consecutive days',
    icon: '💬',
    category: 'SOCIAL',
    rarity: 'COMMON',
    requirement: 3,
    xpReward: 20,
    isActive: true
  },
  {
    name: 'interaction_streak_7',
    title: 'Engaged Member',
    description: 'Interact for 7 consecutive days',
    icon: '🤝',
    category: 'SOCIAL',
    rarity: 'RARE',
    requirement: 7,
    xpReward: 60,
    isActive: true
  },
  {
    name: 'interaction_streak_14',
    title: 'Community Champion',
    description: 'Interact for 14 consecutive days',
    icon: '🎯',
    category: 'SOCIAL',
    rarity: 'EPIC',
    requirement: 14,
    xpReward: 125,
    isActive: true
  },
  {
    name: 'interaction_streak_30',
    title: 'Super Socializer',
    description: 'Interact for 30 consecutive days',
    icon: '⭐',
    category: 'SOCIAL',
    rarity: 'LEGENDARY',
    requirement: 30,
    xpReward: 400,
    isActive: true
  }
]

async function main() {
  console.log('🌱 Seeding streak achievements...')

  for (const achievement of streakAchievements) {
    try {
      const created = await prisma.achievement.upsert({
        where: { name: achievement.name },
        update: achievement,
        create: achievement
      })
      console.log(`✅ Created/Updated: ${created.title}`)
    } catch (error) {
      console.error(`❌ Failed to create ${achievement.name}:`, error.message)
    }
  }

  console.log('✨ Streak achievements seeded successfully!')
}

main()
  .catch((e) => {
    console.error('Error seeding achievements:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
