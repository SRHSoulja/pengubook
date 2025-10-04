import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Admin route protection
  if (pathname.startsWith('/admin')) {
    // Check for secure session cookie (HTTP-only, set by server)
    const sessionCookie = request.cookies.get('pengubook-session')?.value

    // Check for NextAuth OAuth session
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })

    let walletAddress: string | null = null
    let userId: string | null = null
    let isAdmin = false

    // Parse secure session cookie
    if (sessionCookie) {
      try {
        const session = JSON.parse(sessionCookie)
        walletAddress = session.walletAddress
        userId = session.userId

        // Verify session is not expired (24 hours)
        const sessionAge = Date.now() - (session.timestamp || 0)
        if (sessionAge > 60 * 60 * 24 * 1000) {
          console.warn('[Middleware] Session expired')
          walletAddress = null
          userId = null
        }
      } catch (error) {
        console.error('[Middleware] Invalid session cookie:', error)
      }
    }

    // Query database for admin status if we have a wallet
    if (walletAddress) {
      try {
        const { prisma } = await import('@/lib/prisma')
        const user = await prisma.user.findUnique({
          where: { walletAddress },
          select: { isAdmin: true }
        })
        isAdmin = user?.isAdmin || false

        console.log('[Middleware] Wallet auth check:', {
          walletAddress: walletAddress.slice(0, 10) + '...',
          isAdmin,
          timestamp: new Date().toISOString()
        })
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

        console.log('[Middleware] OAuth auth check:', {
          userId: token.sub.slice(0, 10) + '...',
          isAdmin,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        console.error('[Middleware] Database error checking OAuth admin status:', error)
      }
    }

    // Also check env var admin wallet as fallback
    const adminWalletAddress = process.env.ADMIN_WALLET_ADDRESS || process.env.NEXT_PUBLIC_ADMIN_WALLET_ADDRESS
    if (adminWalletAddress && walletAddress?.toLowerCase() === adminWalletAddress.toLowerCase()) {
      isAdmin = true
      console.log('[Middleware] Admin wallet match via env var')
    }

    // Block if not admin
    if (!isAdmin) {
      console.warn('[Middleware] Unauthorized admin access attempt:', {
        pathname,
        walletAddress: walletAddress?.slice(0, 10) + '...' || 'none',
        userId: userId?.slice(0, 10) + '...' || 'none',
        hasOAuthSession: !!token,
        hasSecureSession: !!sessionCookie,
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
