import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// Default moderation rules based on AWS Rekognition labels
const DEFAULT_MODERATION_RULES = [
  // REJECT - Don't allow these at all (Cloudinary ToS violations)
  {
    labelName: 'Explicit Nudity',
    action: 'REJECT',
    minConfidence: 80,
    requiresReview: false,
    isEnabled: true,
    displayName: 'Explicit Nudity',
    description: 'Pornographic content - violates Cloudinary ToS'
  },
  {
    labelName: 'Graphic Male Nudity',
    action: 'REJECT',
    minConfidence: 80,
    requiresReview: false,
    isEnabled: true,
    displayName: 'Graphic Male Nudity',
    description: 'Pornographic content - violates Cloudinary ToS'
  },
  {
    labelName: 'Graphic Female Nudity',
    action: 'REJECT',
    minConfidence: 80,
    requiresReview: false,
    isEnabled: true,
    displayName: 'Graphic Female Nudity',
    description: 'Pornographic content - violates Cloudinary ToS'
  },
  {
    labelName: 'Sexual Activity',
    action: 'REJECT',
    minConfidence: 85,
    requiresReview: false,
    isEnabled: true,
    displayName: 'Sexual Activity',
    description: 'Pornographic content - violates Cloudinary ToS'
  },
  {
    labelName: 'Illustrated Explicit Nudity',
    action: 'REJECT',
    minConfidence: 80,
    requiresReview: false,
    isEnabled: true,
    displayName: 'Illustrated Explicit Content',
    description: 'Illustrated pornographic content'
  },
  {
    labelName: 'Adult Toys',
    action: 'REJECT',
    minConfidence: 80,
    requiresReview: false,
    isEnabled: true,
    displayName: 'Adult Toys',
    description: 'Sexually explicit items'
  },
  {
    labelName: 'Graphic Violence Or Gore',
    action: 'REJECT',
    minConfidence: 85,
    requiresReview: false,
    isEnabled: true,
    displayName: 'Graphic Violence/Gore',
    description: 'Extremely violent content - violates Cloudinary ToS'
  },

  // FLAG - Require user acknowledgment and blur
  {
    labelName: 'Nudity',
    action: 'FLAG',
    minConfidence: 70,
    requiresReview: true,
    isEnabled: true,
    displayName: 'Nudity',
    description: 'May contain nudity - requires review'
  },
  {
    labelName: 'Partial Nudity',
    action: 'FLAG',
    minConfidence: 60,
    requiresReview: false,
    isEnabled: true,
    displayName: 'Partial Nudity',
    description: 'Partial nudity - show with warning'
  },
  {
    labelName: 'Suggestive',
    action: 'FLAG',
    minConfidence: 65,
    requiresReview: false,
    isEnabled: true,
    displayName: 'Suggestive Content',
    description: 'Suggestive but not explicit'
  },
  {
    labelName: 'Physical Violence',
    action: 'FLAG',
    minConfidence: 70,
    requiresReview: true,
    isEnabled: true,
    displayName: 'Physical Violence',
    description: 'Contains violence - requires review'
  },
  {
    labelName: 'Weapon Violence',
    action: 'FLAG',
    minConfidence: 75,
    requiresReview: true,
    isEnabled: true,
    displayName: 'Weapon Violence',
    description: 'Contains weapons or violence'
  },
  {
    labelName: 'Visually Disturbing',
    action: 'FLAG',
    minConfidence: 70,
    requiresReview: false,
    isEnabled: true,
    displayName: 'Visually Disturbing',
    description: 'May be disturbing to some viewers'
  },
  {
    labelName: 'Self Injury',
    action: 'FLAG',
    minConfidence: 80,
    requiresReview: true,
    isEnabled: true,
    displayName: 'Self Injury',
    description: 'Contains self-harm imagery - requires review'
  },
  {
    labelName: 'Emaciated Bodies',
    action: 'FLAG',
    minConfidence: 75,
    requiresReview: true,
    isEnabled: true,
    displayName: 'Emaciated Bodies',
    description: 'May contain eating disorder content'
  },
  {
    labelName: 'Corpses',
    action: 'FLAG',
    minConfidence: 80,
    requiresReview: true,
    isEnabled: true,
    displayName: 'Corpses',
    description: 'Contains deceased bodies'
  },

  // ALLOW - Generally acceptable with blur warning
  {
    labelName: 'Female Swimwear Or Underwear',
    action: 'ALLOW',
    minConfidence: 60,
    requiresReview: false,
    isEnabled: true,
    displayName: 'Swimwear/Underwear',
    description: 'Swimwear or underwear - generally acceptable'
  },
  {
    labelName: 'Male Swimwear Or Underwear',
    action: 'ALLOW',
    minConfidence: 60,
    requiresReview: false,
    isEnabled: true,
    displayName: 'Swimwear/Underwear',
    description: 'Swimwear or underwear - generally acceptable'
  },
  {
    labelName: 'Revealing Clothes',
    action: 'ALLOW',
    minConfidence: 65,
    requiresReview: false,
    isEnabled: true,
    displayName: 'Revealing Clothing',
    description: 'Revealing but not explicit'
  }
]

// POST: Seed default moderation settings
export const POST = withAuth(async (request: NextRequest, user: any) => {
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    // Create all default settings
    const results = await Promise.all(
      DEFAULT_MODERATION_RULES.map(rule =>
        prisma.moderationSettings.upsert({
          where: { labelName: rule.labelName },
          update: rule,
          create: rule
        })
      )
    )

    console.log('[Admin] Moderation settings seeded:', {
      count: results.length,
      adminId: user.id
    })

    return NextResponse.json({
      success: true,
      message: `Seeded ${results.length} default moderation rules`,
      settings: results
    })
  } catch (error: any) {
    console.error('[Admin] Moderation settings seed error:', error)
    return NextResponse.json(
      { error: 'Failed to seed moderation settings', details: error.message },
      { status: 500 }
    )
  }
})
