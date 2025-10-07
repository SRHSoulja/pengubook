import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getTrendingHashtags } from '@/lib/hashtag-processor'
import { withRateLimit } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// SECURITY: Rate limited to prevent expensive trending calculations
export const GET = withRateLimit(200, 60000)( // 200 requests per minute
  async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const rawTimeframe = searchParams.get('timeframe') || 'day'
    const rawLimit = searchParams.get('limit') || '20'

    // SECURITY: Validate timeframe input
    const validTimeframes = ['hour', 'day', 'week', 'month']
    if (!validTimeframes.includes(rawTimeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe. Must be: hour, day, week, or month' },
        { status: 400 }
      )
    }
    const timeframe = rawTimeframe as 'hour' | 'day' | 'week' | 'month'

    // SECURITY: Validate limit
    const limit = Math.min(Math.max(parseInt(rawLimit) || 20, 1), 50) // Between 1-50

    const trendingHashtags = await getTrendingHashtags(timeframe, limit, prisma)


    return NextResponse.json({
      success: true,
      hashtags: trendingHashtags,
      timeframe,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[Hashtags] Trending error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trending hashtags', details: error.message },
      { status: 500 }
    )
  }
  }
)