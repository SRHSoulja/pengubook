import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession()

    // Get headers for debugging
    const headersList = headers()
    const cookie = headersList.get('cookie') || 'none'

    // Parse URL params
    const url = new URL(request.url)
    const params = Object.fromEntries(url.searchParams.entries())

    const debugInfo = {
      timestamp: new Date().toISOString(),
      session: {
        exists: !!session,
        user: session?.user ? {
          name: session.user.name || null,
          email: session.user.email || null,
          image: session.user.image || null,
          provider: (session.user as any)?.provider || null,
          providerAccountId: (session.user as any)?.providerAccountId?.slice(0, 10) + '...' || null,
          hasAccessToken: !!(session.user as any)?.accessToken
        } : null,
        expires: session?.expires || null
      },
      cookies: {
        hasCookies: !!cookie,
        sessionTokenPresent: cookie.includes('next-auth.session-token') || cookie.includes('__Secure-next-auth.session-token'),
        callbackCsrfPresent: cookie.includes('next-auth.callback-url') || cookie.includes('next-auth.csrf-token')
      },
      url: {
        params: params,
        hasLinkedParam: !!params.linked,
        pathname: url.pathname
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        nextAuthUrl: process.env.NEXTAUTH_URL || 'not set',
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET
      }
    }

    console.log('[Debug] Session debug info:', JSON.stringify(debugInfo, null, 2))

    return NextResponse.json(debugInfo)
  } catch (error: any) {
    console.error('[Debug] Session debug error:', {
      error: error.message,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
      timestamp: new Date().toISOString()
    })

    return NextResponse.json(
      {
        error: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}