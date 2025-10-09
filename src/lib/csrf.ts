import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// SECURITY: CSRF Configuration
const CSRF_TOKEN_LENGTH = 32 // 32 bytes = 256 bits
const CSRF_TOKEN_EXPIRY_MS = 60 * 60 * 1000 // 1 hour
const CSRF_HEADER_NAME = 'x-csrf-token'
const CSRF_COOKIE_NAME = 'pengu_csrf_token'

export class CSRFError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CSRFError'
  }
}

/**
 * Generate a cryptographically secure CSRF token
 * SECURITY: Uses crypto.randomBytes for cryptographically secure randomness
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
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

/**
 * SECURITY: Database-backed CSRF token storage
 * Provides single-use tokens with expiration for critical operations
 */

/**
 * Store CSRF token in database for validation
 * SECURITY: Single-use tokens prevent replay attacks
 *
 * @param token - Generated CSRF token
 * @param userId - Optional user ID for user-specific tokens
 * @param sessionId - Optional session ID for session binding
 */
export async function storeCsrfTokenInDB(
  token: string,
  userId?: string,
  sessionId?: string
): Promise<void> {
  const expiresAt = new Date(Date.now() + CSRF_TOKEN_EXPIRY_MS)

  await prisma.csrfToken.create({
    data: {
      token,
      userId,
      sessionId,
      expiresAt,
      used: false
    }
  })

  console.log('[CSRF] Token stored:', {
    tokenHash: token.slice(0, 8) + '...',
    userId: userId?.slice(0, 8) + '...',
    expiresAt: expiresAt.toISOString()
  })
}

/**
 * Validate and consume CSRF token from database
 * SECURITY: Single-use pattern - token is marked as used after validation
 *
 * @param token - CSRF token to validate
 * @returns true if valid, false otherwise
 */
export async function validateCsrfTokenFromDB(token: string): Promise<{
  valid: boolean
  error?: string
}> {
  try {
    // Look up token in database
    const tokenRecord = await prisma.csrfToken.findUnique({
      where: { token }
    })

    if (!tokenRecord) {
      return { valid: false, error: 'CSRF token not found' }
    }

    // SECURITY: Check if token has already been used (prevents replay attacks)
    if (tokenRecord.used) {
      console.warn('[CSRF] Replay attack detected - token already used:', {
        tokenHash: token.slice(0, 8) + '...',
        userId: tokenRecord.userId
      })
      return { valid: false, error: 'CSRF token already used (replay attack detected)' }
    }

    // SECURITY: Check if token has expired
    if (tokenRecord.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.csrfToken.delete({
        where: { id: tokenRecord.id }
      })
      return { valid: false, error: 'CSRF token expired' }
    }

    // SECURITY: Mark token as used (single-use pattern)
    await prisma.csrfToken.update({
      where: { id: tokenRecord.id },
      data: { used: true }
    })

    console.log('[CSRF] Token validated and consumed:', {
      tokenHash: token.slice(0, 8) + '...',
      userId: tokenRecord.userId
    })

    return { valid: true }

  } catch (error) {
    console.error('[CSRF] Database validation error:', error)
    return { valid: false, error: 'CSRF validation failed - database error' }
  }
}

/**
 * Cleanup expired CSRF tokens (run via cron)
 * SECURITY: Prevents database bloat and removes expired tokens
 */
export async function cleanupExpiredCsrfTokens(): Promise<number> {
  const result = await prisma.csrfToken.deleteMany({
    where: {
      OR: [
        // Delete expired tokens
        { expiresAt: { lt: new Date() } },
        // Delete used tokens older than 24 hours
        {
          used: true,
          createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      ]
    }
  })

  console.log(`[CSRF Cleanup] Deleted ${result.count} expired/used tokens`)
  return result.count
}

/**
 * Middleware: CSRF protection for critical mutations
 * Use this for admin operations, financial transactions, etc.
 *
 * SECURITY: Combines double-submit cookie pattern with database validation
 * - Cookie validation: Prevents CSRF from external sites
 * - Database validation: Prevents token replay attacks
 * - Single-use tokens: Extra security for critical operations
 *
 * Usage:
 * export const POST = withDatabaseCSRFProtection(async (request) => { ... })
 */
export function withDatabaseCSRFProtection<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const method = request.method.toUpperCase()

      // SECURITY: Only enforce CSRF on state-changing methods
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        // Step 1: Validate double-submit cookie pattern
        if (!validateDoubleSubmitPattern(request)) {
          throw new CSRFError('CSRF cookie validation failed')
        }

        // Step 2: Validate token against database (single-use)
        const headerToken = request.headers.get(CSRF_HEADER_NAME)
        if (!headerToken) {
          throw new CSRFError('CSRF token missing from header')
        }

        const dbValidation = await validateCsrfTokenFromDB(headerToken)
        if (!dbValidation.valid) {
          throw new CSRFError(dbValidation.error || 'CSRF token validation failed')
        }
      }

      // Call the original handler
      const response = await handler(request, ...args)

      // Ensure CSRF token is available for next request
      let token = getCSRFTokenFromSession(request)
      if (!token) {
        const result = initializeCSRFToken(response)
        return result.response
      }

      return addCSRFTokenToResponse(response, token)
    } catch (error) {
      if (error instanceof CSRFError) {
        console.error('[CSRF] Protection violation:', error.message)
        return NextResponse.json(
          {
            error: 'CSRF token validation failed',
            code: 'CSRF_INVALID',
            message: error.message,
            timestamp: new Date().toISOString()
          },
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'X-Content-Type-Options': 'nosniff'
            }
          }
        )
      }
      throw error
    }
  }
}

/**
 * Export CSRF configuration for client-side usage
 */
export const CSRF_CONFIG = {
  headerName: CSRF_HEADER_NAME,
  cookieName: CSRF_COOKIE_NAME,
  expiryMs: CSRF_TOKEN_EXPIRY_MS
}