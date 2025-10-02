import { NextRequest, NextResponse } from 'next/server'
import { getAllStreaks } from '@/lib/streak-tracker'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id

    const streaks = await getAllStreaks(userId)

    return NextResponse.json({
      success: true,
      streaks
    })
  } catch (error) {
    console.error('Failed to fetch streaks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch streaks' },
      { status: 500 }
    )
  }
}
