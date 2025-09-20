import { NextRequest, NextResponse } from 'next/server'
import { generateCSRFToken, setCSRFTokenCookie, addCSRFTokenToResponse } from '@/lib/csrf'
import { rateLimiters, RateLimitError } from '@/lib/rateLimit'

export async function GET(request: NextRequest) {
  try {
    // Apply session token rate limiting
    rateLimiters.sessionToken(request)

    // Generate a new CSRF token
    const token = generateCSRFToken()

    // Create response with token
    const response = NextResponse.json({
      success: true,
      data: { csrfToken: token }
    })

    // Set token in both cookie and header
    const responseWithCookie = setCSRFTokenCookie(response, token)
    const finalResponse = addCSRFTokenToResponse(responseWithCookie, token)

    return finalResponse
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': error.retryAfter.toString() }
        }
      )
    }

    console.error('Error generating CSRF token:', error)
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    )
  }
}