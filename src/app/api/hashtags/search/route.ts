import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { searchHashtags } from '@/lib/hashtag-processor'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20)

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      )
    }

    

    const hashtags = await searchHashtags(query.trim(), limit, prisma)


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