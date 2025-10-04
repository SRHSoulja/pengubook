import { SignJWT, jwtVerify } from 'jose'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.NEXTAUTH_SECRET
if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET or NEXTAUTH_SECRET must be set')
}

const secret = new TextEncoder().encode(SESSION_SECRET)
const SESSION_DURATION = 60 * 60 * 24 // 24 hours

export interface SessionData {
  walletAddress: string
  userId: string
  isAdmin: boolean
  timestamp: number
}

/**
 * Create a signed and encrypted session token
 */
export async function createSession(data: Omit<SessionData, 'timestamp'>): Promise<string> {
  const sessionData: SessionData = {
    ...data,
    timestamp: Date.now()
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
 * Returns null if invalid or expired
 */
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, secret)

    // Verify the session hasn't expired
    const sessionAge = Date.now() - (payload.timestamp as number || 0)
    if (sessionAge > SESSION_DURATION * 1000) {
      return null
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
  response.cookies.set('pengubook-session', token, {
    httpOnly: true,                              // Cannot be accessed by JavaScript
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'lax',                             // CSRF protection
    maxAge: SESSION_DURATION,                    // 24 hours
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
