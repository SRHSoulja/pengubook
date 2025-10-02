import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GIPHY_API_KEY = process.env.GIPHY_API_KEY || 'FANQbMithW6QAdeWId55qXyZjIfdZkug'
const GIPHY_API_BASE = 'https://api.giphy.com/v1'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || 'trending'
    const limit = parseInt(searchParams.get('limit') || '25')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Use trending endpoint if no query, search endpoint if query provided
    const endpoint = query === 'trending'
      ? `${GIPHY_API_BASE}/gifs/trending`
      : `${GIPHY_API_BASE}/gifs/search`

    const params = new URLSearchParams({
      api_key: GIPHY_API_KEY,
      limit: limit.toString(),
      offset: offset.toString(),
      rating: 'pg-13'
    })

    if (query !== 'trending') {
      params.append('q', query)
    }

    const response = await fetch(`${endpoint}?${params}`)

    if (!response.ok) {
      throw new Error(`Giphy API error: ${response.statusText}`)
    }

    const data = await response.json()

    // Transform the response to include only what we need
    const gifs = data.data.map((gif: any) => ({
      id: gif.id,
      title: gif.title,
      url: gif.url,
      images: {
        preview: gif.images.fixed_height_small.url,
        original: gif.images.original.url,
        fixed_height: gif.images.fixed_height.url
      },
      embed_url: `https://giphy.com/embed/${gif.id}`
    }))

    return NextResponse.json({
      success: true,
      gifs,
      pagination: data.pagination
    })

  } catch (error) {
    console.error('Giphy search error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to search Giphy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}