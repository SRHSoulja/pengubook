import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { searchHashtags } from '@/lib/hashtag-processor'
import { withRateLimit } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// SECURITY: Rate limited to prevent hashtag database scraping
export const GET = withRateLimit(100, 60000)( // 100 requests per minute
  async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const rawQuery = searchParams.get('q')
    const rawLimit = searchParams.get('limit') || '10'

    // SECURITY: Validate query exists
    if (!rawQuery || rawQuery.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    // SECURITY: Sanitize and validate query input
    const query = rawQuery.trim().slice(0, 100) // Max 100 chars

    // SECURITY: Validate limit is reasonable
    const limit = Math.min(Math.max(parseInt(rawLimit) || 10, 1), 20) // Between 1-20

    // SECURITY: Prevent SQL injection by checking for dangerous chars
    if (/[<>;"'`]/.test(query)) {
      return NextResponse.json(
        { error: 'Invalid characters in search query' },
        { status: 400 }
      )
    }

    const hashtags = await searchHashtags(query, limit, prisma)


    return NextResponse.json({
      success: true,
      hashtags,
      query: query.trim(),
      count: hashtags.length
    })

  } catch (error: any) {
    console.error('[Hashtags] Search error:', error)
    return NextResponse.json(
      { error: 'Failed to search hashtags', details: error.message },
      { status: 500 }
    )
  }
  }
)