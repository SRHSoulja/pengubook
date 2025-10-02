import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    // Check for wallet authentication via bearer token
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.replace('Bearer ', '')

    // Check for NextAuth OAuth session
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })

    let walletAddress: string | null = null
    let isAdmin = false

    // Check wallet auth
    if (bearerToken && bearerToken.startsWith('0x') && bearerToken.length === 42) {
      walletAddress = bearerToken

      // Query database for admin status
      try {
        const { prisma } = await import('@/lib/prisma')
        const user = await prisma.user.findUnique({
          where: { walletAddress },
          select: { isAdmin: true }
        })
        isAdmin = user?.isAdmin || false
      } catch (error) {
        console.error('[Middleware] Database error checking admin status:', error)
      }
    }

    // Check OAuth auth
    if (!isAdmin && token?.sub) {
      try {
        const { prisma } = await import('@/lib/prisma')
        const user = await prisma.user.findFirst({
          where: { id: token.sub },
          select: { isAdmin: true }
        })
        isAdmin = user?.isAdmin || false
      } catch (error) {
        console.error('[Middleware] Database error checking OAuth admin status:', error)
      }
    }

    // Also check env var admin wallet as fallback
    const adminWalletAddress = process.env.ADMIN_WALLET_ADDRESS
    if (adminWalletAddress && walletAddress?.toLowerCase() === adminWalletAddress.toLowerCase()) {
      isAdmin = true
    }

    // Block if not admin
    if (!isAdmin) {
      console.warn('[Middleware] Unauthorized admin access attempt:', {
        pathname,
        walletAddress: walletAddress?.slice(0, 10) + '...',
        hasOAuthSession: !!token,
        timestamp: new Date().toISOString()
      })

      // Redirect to home with error
      const url = request.nextUrl.clone()
      url.pathname = '/'
      url.searchParams.set('error', 'unauthorized')
      return NextResponse.redirect(url)
    }

    console.log('[Middleware] Admin access granted:', {
      pathname,
      walletAddress: walletAddress?.slice(0, 10) + '...',
      timestamp: new Date().toISOString()
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*'
}
