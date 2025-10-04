import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth-session'
import { prisma } from '@/lib/prisma'

/**
 * Verify if user has a valid session via HTTP-only cookie
 * Used by client to check authentication status on page load
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request)

    if (!session || !session.userId) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }

    // Fetch user data from database
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        walletAddress: true,
        username: true,
        displayName: true,
        avatar: true,
        isAdmin: true,
        isBanned: true,
        level: true,
        xp: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      )
    }

    // Check if user is banned
    if (user.isBanned) {
      return NextResponse.json(
        { authenticated: false, error: 'Account banned' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isAdmin: user.isAdmin,
        level: user.level,
        xp: user.xp
      }
    })
  } catch (error: any) {
    console.error('[Verify Session] Error:', error)
    return NextResponse.json(
      { authenticated: false, error: 'Session verification failed' },
      { status: 500 }
    )
  }
}
