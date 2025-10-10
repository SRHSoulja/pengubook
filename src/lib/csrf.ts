import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

export class CSRFError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CSRFError'
  }
}

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Verify CSRF token from request
 */
export function verifyCSRFToken(request: NextRequest, expectedToken: string): boolean {
  // Check CSRF token in header first
  const headerToken = request.headers.get('x-csrf-token')
  if (headerToken && crypto.timingSafeEqual(Buffer.from(headerToken), Buffer.from(expectedToken))) {
    return true
  }

  // Fallback to form data for traditional forms
  const contentType = request.headers.get('content-type')
  if (contentType?.includes('application/x-www-form-urlencoded')) {
    // For form submissions, token should be in body
    // This would need to be handled in the API route
    return false
  }

  return false
}

/**
 * Middleware to add CSRF token to response headers
 */
export function addCSRFTokenToResponse(response: NextResponse, token: string): NextResponse {
  response.headers.set('X-CSRF-Token', token)
  return response
}

/**
 * Get CSRF token from session/cookie
 */
export function getCSRFTokenFromSession(request: NextRequest): string | null {
  // Check if we have a CSRF token in cookies
  const csrfCookie = request.cookies.get('pengu_csrf_token')
  return csrfCookie?.value || null
}

/**
 * Set CSRF token in cookie
 */
export function setCSRFTokenCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set('pengu_csrf_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/'
  })
  return response
}

/**
 * Validate CSRF token for state-changing operations
 */
export function validateCSRFForRequest(request: NextRequest): void {
  // Skip CSRF validation for GET, HEAD, OPTIONS requests
  const method = request.method.toUpperCase()
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return
  }

  // Get expected token from session
  const expectedToken = getCSRFTokenFromSession(request)
  if (!expectedToken) {
    throw new CSRFError('CSRF token not found in session')
  }

  // Verify the token
  const isValid = verifyCSRFToken(request, expectedToken)
  if (!isValid) {
    throw new CSRFError('Invalid or missing CSRF token')
  }
}

/**
 * Generate and set CSRF token for a new session
 */
export function initializeCSRFToken(response: NextResponse): { response: NextResponse, token: string } {
  const token = generateCSRFToken()
  const updatedResponse = setCSRFTokenCookie(response, token)
  const finalResponse = addCSRFTokenToResponse(updatedResponse, token)
  return { response: finalResponse, token }
}

/**
 * CSRF protection for API routes
 */
export function withCSRFProtection<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      // Validate CSRF token for state-changing requests
      validateCSRFForRequest(request)

      // Call the original handler
      const response = await handler(request, ...args)

      // Ensure CSRF token is available for the client
      let token = getCSRFTokenFromSession(request)
      if (!token) {
        token = generateCSRFToken()
        return setCSRFTokenCookie(addCSRFTokenToResponse(response, token), token)
      }

      return addCSRFTokenToResponse(response, token)
    } catch (error) {
      if (error instanceof CSRFError) {
        return NextResponse.json(
          { error: 'CSRF token validation failed' },
          { status: 403 }
        )
      }
      throw error
    }
  }
}

/**
 * Double Submit Cookie Pattern for additional security
 */
export function validateDoubleSubmitPattern(request: NextRequest): boolean {
  const cookieToken = getCSRFTokenFromSession(request)
  const headerToken = request.headers.get('x-csrf-token')

  if (!cookieToken || !headerToken) {
    return false
  }

  try {
    return crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(headerToken))
  } catch {
    return false
  }
}

/**
 * Enhanced CSRF protection with double submit cookie pattern
 */
export function withEnhancedCSRFProtection<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const method = request.method.toUpperCase()

      // Skip CSRF validation for safe methods
      if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
        // Validate double submit cookie pattern
        if (!validateDoubleSubmitPattern(request)) {
          throw new CSRFError('CSRF validation failed - double submit pattern mismatch')
        }
      }

      // Call the original handler
      const response = await handler(request, ...args)

      // Ensure CSRF token is available
      let token = getCSRFTokenFromSession(request)
      if (!token) {
        const result = initializeCSRFToken(response)
        return result.response
      }

      return addCSRFTokenToResponse(response, token)
    } catch (error) {
      if (error instanceof CSRFError) {
        return NextResponse.json(
          { error: 'CSRF protection violation' },
          { status: 403 }
        )
      }
      throw error
    }
  }
}