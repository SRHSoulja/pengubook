import { NextRequest, NextResponse } from 'next/server'
import { clearSessionCookie, getSession, revokeSession } from '@/lib/auth-session'

/**
 * Logout endpoint - clears session cookie and revokes session
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession(request)
    const token = request.cookies.get('pengubook-session')?.value

    // Revoke the session if it exists
    if (session && token) {
      await revokeSession(token, 'user_logout')
      console.log('[Logout] Session revoked for user:', session.userId.slice(0, 8) + '...')
    }

    // Create response and clear the session cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    clearSessionCookie(response)

    return response
  } catch (error) {
    console.error('[Logout] Error:', error)

    // Even if there's an error, still clear the cookie
    const response = NextResponse.json({
      success: true,
      message: 'Logged out'
    })

    clearSessionCookie(response)

    return response
  }
}
