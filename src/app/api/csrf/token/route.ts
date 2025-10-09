import { NextRequest, NextResponse } from 'next/server'
import { generateCSRFToken, storeCsrfTokenInDB, setCSRFTokenCookie, addCSRFTokenToResponse } from '@/lib/csrf'
import { withRateLimit } from '@/lib/auth-middleware'
import { getSession } from '@/lib/auth-session'

export const dynamic = 'force-dynamic'

/**
 * SECURITY: CSRF Token Generation Endpoint
 * Generates a fresh CSRF token for the client
 * Rate limited to prevent token generation abuse
 *
 * Usage from client:
 * const response = await fetch('/api/csrf/token')
 * const { token } = await response.json()
 * // Use token in subsequent POST/PUT/PATCH/DELETE requests
 */
export const GET = withRateLimit(60, 60000)( // 60 requests per minute
  async (request: NextRequest) => {
    try {
      // Generate new CSRF token
      const token = generateCSRFToken()

      // Get current session if available
      let userId: string | undefined
      let sessionId: string | undefined

      try {
        const session = await getSession(request)
        userId = session?.userId
        sessionId = session?.jti // JWT ID serves as session identifier
      } catch (error) {
        // Session not required for CSRF token generation
        // Tokens can be issued to unauthenticated users
      }

      // Store token in database for validation
      await storeCsrfTokenInDB(token, userId, sessionId)

      // Create response with token
      let response: NextResponse = NextResponse.json({
        success: true,
        token,
        expiresIn: 3600, // 1 hour in seconds
        timestamp: new Date().toISOString()
      })

      // Set CSRF token in cookie (double-submit pattern)
      response = setCSRFTokenCookie(response, token)

      // Also add to response header for convenience
      response = addCSRFTokenToResponse(response, token)

      console.log('[CSRF] Token generated:', {
        tokenHash: token.slice(0, 8) + '...',
        userId: userId?.slice(0, 8) + '...',
        sessionId: sessionId?.slice(0, 8) + '...'
      })

      return response

    } catch (error) {
      console.error('[CSRF] Token generation error:', error)
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to generate CSRF token',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      )
    }
  }
)
