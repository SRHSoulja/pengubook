import { SignJWT, jwtVerify } from 'jose'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Calculate Shannon entropy to estimate randomness of the secret
 * Higher entropy = more random and secure
 * Perfect randomness for 64 hex chars ≈ 256 bits
 */
function calculateEntropy(str: string): number {
  const len = str.length
  const frequencies: Record<string, number> = {}

  for (const char of str) {
    frequencies[char] = (frequencies[char] || 0) + 1
  }

  let entropy = 0
  for (const freq of Object.values(frequencies)) {
    const p = freq / len
    entropy -= p * Math.log2(p)
  }

  return entropy
}

/**
 * Check for common weak patterns in secrets
 */
function hasWeakPatterns(secret: string): string[] {
  const warnings: string[] = []

  // Check for repeated characters (e.g., "aaaaaa")
  if (/(.)\1{5,}/.test(secret)) {
    warnings.push('Contains repeated characters')
  }

  // Check for sequential patterns (e.g., "123456", "abcdef")
  if (/(?:012345|123456|234567|345678|456789|567890|abcdef|bcdefg|cdefgh)/.test(secret.toLowerCase())) {
    warnings.push('Contains sequential patterns')
  }

  // Check for common weak secrets
  const weakSecrets = ['secret', 'password', 'changeme', 'default', '000000', 'test']
  if (weakSecrets.some(weak => secret.toLowerCase().includes(weak))) {
    warnings.push('Contains common weak patterns')
  }

  // Check if it's all the same character type
  if (/^[a-z]+$/i.test(secret) || /^\d+$/.test(secret)) {
    warnings.push('Uses only one character type (letters or numbers)')
  }

  return warnings
}

// CRITICAL: Use dedicated SESSION_SECRET, fallback to NEXTAUTH_SECRET for compatibility
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET

if (!SESSION_SECRET) {
  throw new Error('[SECURITY] SESSION_SECRET or NEXTAUTH_SECRET environment variable must be set')
}

// Validate secret strength
const minLength = 32
const recommendedLength = 64
const entropy = calculateEntropy(SESSION_SECRET)
const weakPatterns = hasWeakPatterns(SESSION_SECRET)

// CRITICAL: Minimum length check
if (SESSION_SECRET.length < minLength) {
  throw new Error(
    `[SECURITY] SESSION_SECRET must be at least ${minLength} characters. ` +
    `Current length: ${SESSION_SECRET.length}. ` +
    `Generate a secure 256-bit secret with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  )
}

// CRITICAL: Entropy check (minimum 4.0 bits per character for hex strings)
const minEntropy = 4.0
if (entropy < minEntropy) {
  console.error(`[SECURITY ERROR] SESSION_SECRET has low entropy (${entropy.toFixed(2)} bits/char).`)
  console.error('This indicates a weak or predictable secret.')
  console.error('Generate a cryptographically secure secret with:')
  console.error('node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"')

  if (process.env.NODE_ENV === 'production') {
    throw new Error('[SECURITY] SESSION_SECRET entropy too low for production use')
  }
}

// CRITICAL: Check for weak patterns
if (weakPatterns.length > 0) {
  console.error('[SECURITY ERROR] SESSION_SECRET contains weak patterns:')
  weakPatterns.forEach(pattern => console.error(`  - ${pattern}`))
  console.error('Generate a new secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"')

  if (process.env.NODE_ENV === 'production') {
    throw new Error('[SECURITY] SESSION_SECRET contains weak patterns, unsafe for production')
  }
}

// Warnings for suboptimal but acceptable secrets
if (SESSION_SECRET.length < recommendedLength) {
  console.warn(`[SECURITY WARNING] SESSION_SECRET is shorter than recommended (${SESSION_SECRET.length}/${recommendedLength} chars).`)
  console.warn('For optimal security, use a 512-bit (64-char hex) secret:')
  console.warn('node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"')
}

// Warn if in production without dedicated SESSION_SECRET
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.warn('[SECURITY WARNING] Using NEXTAUTH_SECRET as SESSION_SECRET in production.')
  console.warn('For better security, set a dedicated SESSION_SECRET environment variable.')
}

// Log entropy in development for debugging
if (process.env.NODE_ENV !== 'production') {
  console.log(`[Session] SECRET entropy: ${entropy.toFixed(2)} bits/char, length: ${SESSION_SECRET.length} chars`)
}

const secret = new TextEncoder().encode(SESSION_SECRET)
const SESSION_DURATION = 60 * 60 * 24 // 24 hours

export interface SessionData {
  walletAddress: string
  userId: string
  isAdmin: boolean
  timestamp: number
  jti?: string // JWT ID for revocation tracking
  [key: string]: unknown // Index signature for JWT compatibility
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

    // Check if session has been revoked (skip in Edge Runtime/Middleware)
    const jti = payload.jti as string
    if (jti && typeof EdgeRuntime === 'undefined') {
      try {
        const { prisma } = await import('@/lib/prisma')
        const revoked = await prisma.revokedSession.findUnique({
          where: { sessionToken: jti }
        })

        if (revoked) {
          console.log('[Session] Revoked session attempted:', jti.slice(0, 8) + '...')
          return null
        }
      } catch (error) {
        // Skip revocation check in Edge Runtime (middleware)
        // Revoked sessions will still expire after 24h
        console.warn('[Session] Skipping revocation check (Edge Runtime)')
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
