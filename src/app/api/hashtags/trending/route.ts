import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getTrendingHashtags } from '@/lib/hashtag-processor'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeframe = (searchParams.get('timeframe') as 'hour' | 'day' | 'week' | 'month') || 'day'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)

    const prisma = new PrismaClient()

    const trendingHashtags = await getTrendingHashtags(timeframe, limit, prisma)

    await prisma.$disconnect()

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