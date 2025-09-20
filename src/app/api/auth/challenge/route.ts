import { NextRequest, NextResponse } from 'next/server'
import { generateAuthChallenge } from '@/lib/auth/secure'
import { rateLimiters, RateLimitError } from '@/lib/rateLimit'
import { withEnhancedCSRFProtection } from '@/lib/csrf'

// GET - Generate authentication challenge
const getHandler = async (request: NextRequest) => {
  try {
    // Apply specific rate limiting for challenge generation
    rateLimiters.authChallenge(request)

    // Generate challenge for wallet signature
    const challenge = generateAuthChallenge()

    return NextResponse.json({
      success: true,
      data: challenge
    })
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

    console.error('Error generating auth challenge:', error)
    return NextResponse.json(
      { error: 'Failed to generate authentication challenge' },
      { status: 500 }
    )
  }
}

export const GET = withEnhancedCSRFProtection(getHandler)