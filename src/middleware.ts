import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ADMIN_WALLET = process.env.ADMIN_WALLET_ADDRESS

export async function middleware(request: NextRequest) {
  // Check if the request is for the admin page
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Get the wallet address from the session/cookie
    const authCookie = request.cookies.get('pengubook-auth')

    if (!authCookie) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    try {
      const authData = JSON.parse(authCookie.value)
      const walletAddress = authData?.walletAddress

      // Check if the wallet address matches the admin wallet
      if (!walletAddress || !ADMIN_WALLET || walletAddress.toLowerCase() !== ADMIN_WALLET.toLowerCase()) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }
    } catch (error) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*'
}