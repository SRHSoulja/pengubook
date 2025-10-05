import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateProfileCompletion } from '@/lib/profile-completion'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id')
    const walletAddress = request.headers.get('x-wallet-address')

    if (!userId && !walletAddress) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findFirst({
      where: userId ? { id: userId } : { walletAddress: walletAddress!.toLowerCase() },
      include: { profile: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const completion = calculateProfileCompletion(user)

    return NextResponse.json({
      success: true,
      completion
    })
  } catch (error) {
    console.error('Profile completion error:', error)
    return NextResponse.json(
      { error: 'Failed to calculate profile completion' },
      { status: 500 }
    )
  }
}
