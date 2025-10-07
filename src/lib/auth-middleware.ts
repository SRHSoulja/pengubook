import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

export interface AuthenticatedRequest extends NextRequest {
  user?: {
    id: string
    walletAddress?: string
    username?: string
    displayName?: string
    isAdmin: boolean
    isBanned: boolean
    level: number
  }
}

export async function authenticateRequest(request: NextRequest): Promise<{
  success: boolean
  user?: any
  error?: string
  status?: number
}> {
  try {
    // Extract authentication data from different sources
    const authHeader = request.headers.get('authorization')
    const walletHeader = request.headers.get('x-wallet-address')
    const userIdHeader = request.headers.get('x-user-id')

    let userId: string | null = null
    let walletAddress: string | null = null

    // Method 1: Wallet session cookie (pengubook-session)
    try {
      const { getSession } = await import('@/lib/auth-session')
      const session = await getSession(request)

      if (session?.userId) {
        userId = session.userId
        walletAddress = session.walletAddress || null
        console.log('[Auth] Authenticated via wallet session:', { userId: userId.slice(0, 8) + '...', walletAddress: walletAddress?.slice(0, 6) + '...' })
      }
    } catch (error) {
      console.error('[Auth] Wallet session validation failed:', error)
    }

    // Method 2: JWT Token from NextAuth
    if (!userId) {
      try {
        const token = await getToken({
          req: request,
          secret: process.env.NEXTAUTH_SECRET
        })

        if (token?.sub) {
          userId = token.sub
          console.log('[Auth] Authenticated via NextAuth JWT:', { userId: userId.slice(0, 8) + '...' })
        }
      } catch (error) {
        console.error('[Auth] JWT token validation failed:', error)
      }
    }

    // Method 2: Authorization header (Bearer token - REMOVED FOR SECURITY)
    // Previously accepted raw wallet addresses as Bearer tokens
    // This was a critical security vulnerability
    // Bearer tokens should be session tokens validated against database
    if (!userId && authHeader?.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7)

      // Check if this is a session token (not a wallet address)
      if (!bearerToken.startsWith('0x')) {
        // Validate session token against database
        try {
          const session = await prisma.session.findUnique({
            where: { sessionToken: bearerToken },
            include: { user: true }
          })

          if (session && session.expires > new Date()) {
            userId = session.userId
            walletAddress = session.user.walletAddress
          }
        } catch (error) {
          console.error('[Auth] Session token validation failed:', error)
        }
      }
      // If it looks like a wallet address, reject it (security)
      else {
        console.warn('[Auth] Rejected Bearer token that looks like wallet address')
      }
    }

    // Method 3: Direct wallet address header - WITH NORMALIZATION
    if (!userId && walletHeader) {
      const { validateAndNormalizeAddress, isValidAddress } = await import('@/lib/utils/address')

      if (isValidAddress(walletHeader)) {
        try {
          walletAddress = validateAndNormalizeAddress(walletHeader)
        } catch (error) {
          return {
            success: false,
            error: 'Invalid wallet address format',
            status: 400
          }
        }
      }
    }

    // Method 4: REMOVED - Direct user ID header was a critical security vulnerability
    // Any client could impersonate any user by setting x-user-id header
    // If internal API calls are needed, use service-to-service authentication instead

    if (!userId && !walletAddress) {
      return {
        success: false,
        error: 'Authentication required. Provide JWT token, wallet address, or user ID.',
        status: 401
      }
    }

    

    let user
    try {
      if (userId) {
        // First try direct ID lookup
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            walletAddress: true,
            username: true,
            displayName: true,
            isAdmin: true,
            isBanned: true,
            level: true,
            createdAt: true
          }
        })

        // If not found and we have a NextAuth token, try looking up by OAuth account
        if (!user) {
          const token = await getToken({
            req: request,
            secret: process.env.NEXTAUTH_SECRET
          })

          if (token?.provider && token?.providerAccountId) {
            // Look up by OAuth provider ID
            user = await prisma.user.findFirst({
              where: {
                OR: [
                  token.provider === 'discord' ? { discordId: token.providerAccountId } : {},
                  token.provider === 'twitter' ? { twitterId: token.providerAccountId } : {},
                  token.email ? { email: token.email } : {}
                ].filter(condition => Object.keys(condition).length > 0)
              },
              select: {
                id: true,
                walletAddress: true,
                username: true,
                displayName: true,
                isAdmin: true,
                isBanned: true,
                level: true,
                createdAt: true
              }
            })
          }
        }
      } else if (walletAddress) {
        user = await prisma.user.findUnique({
          where: { walletAddress },
          select: {
            id: true,
            walletAddress: true,
            username: true,
            displayName: true,
            isAdmin: true,
            isBanned: true,
            level: true,
            createdAt: true
          }
        })
      }

      if (!user) {
        return {
          success: false,
          error: 'User not found. Please ensure you are registered.',
          status: 404
        }
      }

      if (user.isBanned) {
        return {
          success: false,
          error: 'Your account has been banned. Please contact support.',
          status: 403
        }
      }


      // Check if user is admin based on environment variable
      const adminWalletAddress = process.env.ADMIN_WALLET_ADDRESS
      const isAdminByWallet = adminWalletAddress &&
        user.walletAddress?.toLowerCase() === adminWalletAddress.toLowerCase()

      return {
        success: true,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          displayName: user.displayName,
          isAdmin: user.isAdmin || isAdminByWallet, // Admin by DB record OR by wallet address
          isBanned: user.isBanned,
          level: user.level
        }
      }

    } catch (dbError) {
      console.error('[Auth] Database error:', dbError)
      return {
        success: false,
        error: 'Authentication service unavailable',
        status: 503
      }
    }

  } catch (error) {
    console.error('[Auth] Authentication error:', error)
    return {
      success: false,
      error: 'Authentication failed',
      status: 500
    }
  }
}

export async function requireAuth(request: NextRequest) {
  const authResult = await authenticateRequest(request)

  if (!authResult.success) {
    throw new Error(JSON.stringify({
      error: authResult.error,
      status: authResult.status || 401
    }))
  }

  return authResult.user!
}

export async function requireAdmin(request: NextRequest) {
  const user = await requireAuth(request)

  if (!user.isAdmin) {
    throw new Error(JSON.stringify({
      error: 'Admin privileges required',
      status: 403
    }))
  }

  return user
}

export function withAuth(handler: (request: NextRequest, user: any, ...args: any[]) => Promise<NextResponse>) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      const user = await requireAuth(request)
      return await handler(request, user, ...args)
    } catch (error: any) {
      const errorData = JSON.parse(error.message)
      return NextResponse.json(
        {
          error: errorData.error,
          timestamp: new Date().toISOString()
        },
        { status: errorData.status }
      )
    }
  }
}

export function withAdminAuth(handler: (request: NextRequest, user: any, ...args: any[]) => Promise<NextResponse>) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      const user = await requireAdmin(request)
      return await handler(request, user, ...args)
    } catch (error: any) {
      const errorData = JSON.parse(error.message)
      return NextResponse.json(
        {
          error: errorData.error,
          timestamp: new Date().toISOString()
        },
        { status: errorData.status }
      )
    }
  }
}

// Optional auth: Continues if no user, passes null
export function withOptionalAuth(handler: (request: NextRequest, user: any | null, ...args: any[]) => Promise<NextResponse>) {
  return async (request: NextRequest, ...args: any[]): Promise<NextResponse> => {
    try {
      const authResult = await authenticateRequest(request)
      const user = authResult.success ? authResult.user : null
      return await handler(request, user, ...args)
    } catch (error: any) {
      // On auth error, continue with null user
      return await handler(request, null, ...args)
    }
  }
}

// Rate limiting utilities - DATABASE-BACKED
// Replaces in-memory Map to work across serverless instances
export async function rateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  const now = Date.now()
  const resetTime = now + windowMs

  try {
    // Try to find existing rate limit record
    const record = await prisma.rateLimit.findUnique({
      where: { key }
    })

    if (!record || BigInt(now) > record.resetTime) {
      // Create or reset rate limit record
      await prisma.rateLimit.upsert({
        where: { key },
        update: {
          count: 1,
          resetTime: BigInt(resetTime),
          updatedAt: new Date()
        },
        create: {
          key,
          count: 1,
          resetTime: BigInt(resetTime)
        }
      })
      return { allowed: true, remaining: maxRequests - 1, resetTime }
    }

    if (record.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetTime: Number(record.resetTime) }
    }

    // Increment count
    await prisma.rateLimit.update({
      where: { key },
      data: {
        count: { increment: 1 },
        updatedAt: new Date()
      }
    })

    return {
      allowed: true,
      remaining: maxRequests - (record.count + 1),
      resetTime: Number(record.resetTime)
    }
  } catch (error) {
    console.error('[Rate Limit] Database error:', error)
    // Fallback: allow request but log error
    return { allowed: true, remaining: maxRequests - 1, resetTime }
  }
}

export function withRateLimit(
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000,
  keyGenerator?: (request: NextRequest) => string
) {
  return function(handler: (request: NextRequest, ...args: any[]) => Promise<Response>) {
    return async (request: NextRequest, ...args: any[]) => {
      // Generate rate limit key
      const defaultKey = request.headers.get('x-forwarded-for') ||
                        request.headers.get('x-real-ip') ||
                        'unknown'
      const key = keyGenerator ? keyGenerator(request) : defaultKey

      const { allowed, remaining, resetTime } = await rateLimit(key, maxRequests, windowMs)

      if (!allowed) {
        return new Response(
          JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfter: Math.ceil((resetTime - Date.now()) / 1000),
            timestamp: new Date().toISOString()
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
              'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
            }
          }
        )
      }

      const response = await handler(request, ...args)

      // Add rate limit headers to successful responses
      response.headers.set('X-RateLimit-Limit', maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())

      return response
    }
  }
}