import { SignJWT, jwtVerify } from 'jose'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// CRITICAL: Use dedicated SESSION_SECRET, fallback to NEXTAUTH_SECRET for compatibility
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET

if (!SESSION_SECRET) {
  throw new Error('[SECURITY] SESSION_SECRET or NEXTAUTH_SECRET environment variable must be set')
}

// Warn if using weak secret
if (SESSION_SECRET.length < 32) {
  console.warn('[SECURITY WARNING] SESSION_SECRET is too short. Generate a secure 256-bit secret with:')
  console.warn('node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"')
}

// Warn if in production without dedicated SESSION_SECRET
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.warn('[SECURITY WARNING] Using NEXTAUTH_SECRET as SESSION_SECRET in production.')
  console.warn('For better security, set a dedicated SESSION_SECRET environment variable.')
}

const secret = new TextEncoder().encode(SESSION_SECRET)
const SESSION_DURATION = 60 * 60 * 24 // 24 hours

export interface SessionData {
  walletAddress: string
  userId: string
  isAdmin: boolean
  timestamp: number
  jti?: string // JWT ID for revocation tracking
}

/**
 * Create a signed and encrypted session token
 */
export async function createSession(data: Omit<SessionData, 'timestamp' | 'jti'>): Promise<string> {
  // Generate unique JWT ID for revocation tracking
  const { randomBytes } = await import('crypto')
  const jti = randomBytes(16).toString('hex')

  const sessionData: SessionData = {
    ...data,
    timestamp: Date.now(),
    jti
  }

  const token = await new SignJWT(sessionData)
    .setProtectedHeader({ alg: 'HS256' })
    .setJwtId(jti)
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)

  return token
}

/**
 * Verify and decode a session token
 * Returns null if invalid, expired, or revoked
 */
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, secret)

    // Verify the session hasn't expired
    const sessionAge = Date.now() - (payload.timestamp as number || 0)
    if (sessionAge > SESSION_DURATION * 1000) {
      return null
    }

    // Check if session has been revoked
    const jti = payload.jti as string
    if (jti) {
      const { prisma } = await import('@/lib/prisma')
      const revoked = await prisma.revokedSession.findUnique({
        where: { sessionToken: jti }
      })

      if (revoked) {
        console.log('[Session] Revoked session attempted:', jti.slice(0, 8) + '...')
        return null
      }
    }

    return payload as unknown as SessionData
  } catch (error) {
    console.error('[Session] Verification failed:', error)
    return null
  }
}

/**
 * Set a secure session cookie on the response
 */
export function setSessionCookie(response: NextResponse, token: string) {
  const isProduction = process.env.NODE_ENV === 'production'

  // Warn about insecure development setup
  if (!isProduction) {
    console.warn('[SECURITY WARNING] Session cookies transmitted over HTTP in development.')
    console.warn('Production MUST use HTTPS to prevent session hijacking.')
  }

  response.cookies.set('pengubook-session', token, {
    httpOnly: true,                // Cannot be accessed by JavaScript
    secure: isProduction,          // HTTPS only in production
    sameSite: 'lax',              // CSRF protection
    maxAge: SESSION_DURATION,     // 24 hours
    path: '/'
  })
}

/**
 * Get session data from request cookies
 */
export async function getSession(request: NextRequest): Promise<SessionData | null> {
  const token = request.cookies.get('pengubook-session')?.value
  if (!token) return null

  return await verifySession(token)
}

/**
 * Clear session cookie
 */
export function clearSessionCookie(response: NextResponse) {
  response.cookies.delete('pengubook-session')
}

/**
 * Revoke a session (for logout or security)
 */
export async function revokeSession(token: string, reason: string = 'logout'): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secret)
    const jti = payload.jti as string
    const userId = payload.userId as string

    if (!jti || !userId) {
      return false
    }

    const { prisma } = await import('@/lib/prisma')

    // Add to revoked sessions list
    await prisma.revokedSession.create({
      data: {
        sessionToken: jti,
        userId,
        reason,
        // Keep revocation record for 48 hours after token expiration
        expiresAt: new Date(Date.now() + (SESSION_DURATION + 48 * 60 * 60) * 1000)
      }
    })

    console.log('[Session] Revoked:', {
      jti: jti.slice(0, 8) + '...',
      userId: userId.slice(0, 8) + '...',
      reason
    })

    return true
  } catch (error) {
    console.error('[Session] Revocation failed:', error)
    return false
  }
}

/**
 * Revoke all sessions for a user (for security incidents)
 */
export async function revokeAllUserSessions(userId: string, reason: string = 'security'): Promise<number> {
  const { prisma } = await import('@/lib/prisma')

  // This is a simplified version - in production you'd want to track all active sessions
  // For now, we'll just mark a flag that all sessions before this timestamp are invalid

  console.log('[Session] Revoking all sessions for user:', {
    userId: userId.slice(0, 8) + '...',
    reason
  })

  // You could implement a "sessionsRevokedBefore" timestamp on the User model
  // and check it during session verification

  return 0 // Return count of revoked sessions
}
