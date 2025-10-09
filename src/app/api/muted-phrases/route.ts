import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Get user's muted phrases
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    

    const mutedPhrases = await prisma.mutedPhrase.findMany({
      where: {
        userId: user.id,
        // Exclude expired phrases
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      orderBy: { createdAt: 'desc' }
    })


    return NextResponse.json({
      success: true,
      mutedPhrases
    })

  } catch (error: any) {
    logAPI.error('muted-phrases/get', error)
    return NextResponse.json(
      { error: 'Failed to fetch muted phrases', details: error.message },
      { status: 500 }
    )
  }
})

// Add a new muted phrase
export const POST = withRateLimit(20, 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { phrase, isRegex = false, muteType = 'HIDE', scope = 'ALL', expiresAt } = body

    // Validate input
    if (!phrase || typeof phrase !== 'string' || phrase.trim().length === 0) {
      return NextResponse.json(
        { error: 'Phrase is required and must not be empty' },
        { status: 400 }
      )
    }

    if (phrase.trim().length > 100) {
      return NextResponse.json(
        { error: 'Phrase must be 100 characters or less' },
        { status: 400 }
      )
    }

    const validMuteTypes = ['HIDE', 'WARN']
    if (!validMuteTypes.includes(muteType)) {
      return NextResponse.json(
        { error: 'Invalid muteType. Must be one of: ' + validMuteTypes.join(', ') },
        { status: 400 }
      )
    }

    const validScopes = ['ALL', 'POSTS', 'COMMENTS']
    if (!validScopes.includes(scope)) {
      return NextResponse.json(
        { error: 'Invalid scope. Must be one of: ' + validScopes.join(', ') },
        { status: 400 }
      )
    }

    // Validate regex if specified
    if (isRegex) {
      try {
        new RegExp(phrase.trim())
      } catch (regexError) {
        return NextResponse.json(
          { error: 'Invalid regex pattern' },
          { status: 400 }
        )
      }
    }

    // Validate expiration date if provided
    let expirationDate = null
    if (expiresAt) {
      expirationDate = new Date(expiresAt)
      if (isNaN(expirationDate.getTime()) || expirationDate <= new Date()) {
        return NextResponse.json(
          { error: 'Invalid expiration date. Must be a future date.' },
          { status: 400 }
        )
      }
    }

    logAPI.request('muted-phrases/add', {
      userId: user.id.slice(0, 8) + '...',
      phraseLength: phrase.trim().length,
      isRegex,
      muteType,
      scope
    })

    

    // Check if user already has too many muted phrases (limit to 100)
    const existingCount = await prisma.mutedPhrase.count({
      where: {
        userId: user.id,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    })

    if (existingCount >= 100) {
      return NextResponse.json(
        { error: 'Maximum limit of 100 muted phrases reached' },
        { status: 400 }
      )
    }

    // Check for duplicate phrase (case-insensitive)
    const existingPhrase = await prisma.mutedPhrase.findFirst({
      where: {
        userId: user.id,
        phrase: {
          equals: phrase.trim(),
          mode: 'insensitive'
        },
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    })

    if (existingPhrase) {
      return NextResponse.json(
        { error: 'This phrase is already muted' },
        { status: 409 }
      )
    }

    // Create the muted phrase
    const mutedPhrase = await prisma.mutedPhrase.create({
      data: {
        userId: user.id,
        phrase: phrase.trim(),
        isRegex,
        muteType,
        scope,
        expiresAt: expirationDate
      }
    })


    logger.info('Muted phrase added', {
      mutedPhraseId: mutedPhrase.id,
      userId: user.id,
      phraseLength: phrase.trim().length,
      isRegex,
      muteType,
      scope
    }, 'MutedPhrases')

    return NextResponse.json({
      success: true,
      mutedPhrase,
      content: 'Phrase muted successfully'
    })

  } catch (error: any) {
    logAPI.error('muted-phrases/add', error)
    return NextResponse.json(
      { error: 'Failed to add muted phrase', details: error.message },
      { status: 500 }
    )
  }
}))