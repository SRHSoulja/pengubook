import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Check if OAuth providers are configured
    const discordConfigured = !!(
      process.env.DISCORD_CLIENT_ID &&
      process.env.DISCORD_CLIENT_SECRET
    )

    const twitterConfigured = !!(
      process.env.TWITTER_CLIENT_ID &&
      process.env.TWITTER_CLIENT_SECRET
    )

    const nextAuthConfigured = !!process.env.NEXTAUTH_SECRET
    const nextAuthUrl = process.env.NEXTAUTH_URL || 'not set'

    // Try to get current session
    let sessionStatus = 'unknown'
    let sessionData = null

    try {
      const session = await getServerSession()
      sessionStatus = session ? 'active' : 'none'
      if (session) {
        sessionData = {
          hasUser: !!session.user,
          userName: session.user?.name || 'none',
          userEmail: session.user?.email ? 'set' : 'none',
          provider: (session.user as any)?.provider || 'none',
          hasProviderAccountId: !!(session.user as any)?.providerAccountId
        }
      }
    } catch (error: any) {
      sessionStatus = 'error'
      console.error('[Health] Session check error:', error.message)
    }

    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      oauth: {
        discord: {
          configured: discordConfigured,
          clientId: discordConfigured ? process.env.DISCORD_CLIENT_ID?.slice(0, 10) + '...' : 'not set'
        },
        twitter: {
          configured: twitterConfigured,
          clientId: twitterConfigured ? process.env.TWITTER_CLIENT_ID?.slice(0, 10) + '...' : 'not set'
        },
        nextAuth: {
          configured: nextAuthConfigured,
          url: nextAuthUrl,
          secretSet: nextAuthConfigured
        },
        session: {
          status: sessionStatus,
          data: sessionData
        }
      },
      environment: process.env.NODE_ENV || 'unknown'
    }

    console.log('[Health] OAuth health check:', health)

    return NextResponse.json(health)
  } catch (error: any) {
    console.error('[Health] OAuth health check error:', {
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      {
        status: 'error',
        message: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}