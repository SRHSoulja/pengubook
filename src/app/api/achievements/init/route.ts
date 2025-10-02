import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth-middleware'
import { ACHIEVEMENT_DEFINITIONS } from '@/lib/achievements'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Initialize achievements in database (admin only)
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    // Only allow admins to initialize achievements
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    

    let created = 0
    let updated = 0

    for (const achievementDef of ACHIEVEMENT_DEFINITIONS) {
      const existing = await prisma.achievement.findUnique({
        where: { name: achievementDef.name }
      })

      if (existing) {
        // Update existing achievement
        await prisma.achievement.update({
          where: { name: achievementDef.name },
          data: {
            title: achievementDef.title,
            description: achievementDef.description,
            icon: achievementDef.icon,
            category: achievementDef.category,
            rarity: achievementDef.rarity,
            requirement: achievementDef.requirement
          }
        })
        updated++
      } else {
        // Create new achievement
        await prisma.achievement.create({
          data: {
            name: achievementDef.name,
            title: achievementDef.title,
            description: achievementDef.description,
            icon: achievementDef.icon,
            category: achievementDef.category,
            rarity: achievementDef.rarity,
            requirement: achievementDef.requirement
          }
        })
        created++
      }
    }


    logger.info('Achievements initialized', {
      adminId: user.id,
      created,
      updated,
      total: ACHIEVEMENT_DEFINITIONS.length
    }, 'Achievements')

    return NextResponse.json({
      success: true,
      content: `Achievements initialized successfully`,
      stats: {
        created,
        updated,
        total: ACHIEVEMENT_DEFINITIONS.length
      }
    })

  } catch (error: any) {
    console.error('[Achievements Init] Error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize achievements', details: error.message },
      { status: 500 }
    )
  }
})