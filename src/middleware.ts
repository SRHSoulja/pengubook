import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // For now, disable middleware admin checks since admin status is handled in the page component
  // The admin page itself will check the user's admin status from the database
  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*'
}