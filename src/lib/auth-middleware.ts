import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { PrismaClient } from '@prisma/client'

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

    // Method 1: JWT Token from NextAuth
    try {
      const token = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET
      })

      if (token?.sub) {
        userId = token.sub
      }
    } catch (error) {
      console.error('[Auth] JWT token validation failed:', error)
    }

    // Method 2: Authorization header (Bearer token with wallet address)
    if (!userId && authHeader?.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7)
      // In a production app, you'd verify wallet signature here
      // For now, we'll treat the bearer token as a wallet address
      if (bearerToken.startsWith('0x') && bearerToken.length === 42) {
        walletAddress = bearerToken
      }
    }

    // Method 3: Direct wallet address header
    if (!userId && walletHeader) {
      walletAddress = walletHeader
    }

    // Method 4: Direct user ID header (for internal API calls)
    if (!userId && userIdHeader) {
      userId = userIdHeader
    }

    if (!userId && !walletAddress) {
      return {
        success: false,
        error: 'Authentication required. Provide JWT token, wallet address, or user ID.',
        status: 401
      }
    }

    const prisma = new PrismaClient()

    let user
    try {
      if (userId) {
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
        await prisma.$disconnect()
        return {
          success: false,
          error: 'User not found. Please ensure you are registered.',
          status: 404
        }
      }

      if (user.isBanned) {
        await prisma.$disconnect()
        return {
          success: false,
          error: 'Your account has been banned. Please contact support.',
          status: 403
        }
      }

      await prisma.$disconnect()

      return {
        success: true,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          username: user.username,
          displayName: user.displayName,
          isAdmin: user.isAdmin,
          isBanned: user.isBanned,
          level: user.level
        }
      }

    } catch (dbError) {
      await prisma.$disconnect()
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

export function withAuth(handler: (request: NextRequest, user: any, ...args: any[]) => Promise<Response>) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      const user = await requireAuth(request)
      return await handler(request, user, ...args)
    } catch (error: any) {
      const errorData = JSON.parse(error.message)
      return new Response(
        JSON.stringify({
          error: errorData.error,
          timestamp: new Date().toISOString()
        }),
        {
          status: errorData.status,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

export function withAdminAuth(handler: (request: NextRequest, user: any, ...args: any[]) => Promise<Response>) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      const user = await requireAdmin(request)
      return await handler(request, user, ...args)
    } catch (error: any) {
      const errorData = JSON.parse(error.message)
      return new Response(
        JSON.stringify({
          error: errorData.error,
          timestamp: new Date().toISOString()
        }),
        {
          status: errorData.status,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }
  }
}

// Rate limiting utilities
const requestCounts = new Map<string, { count: number; resetTime: number }>()

export function rateLimit(
  key: string,
  maxRequests: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = requestCounts.get(key)

  if (!record || now > record.resetTime) {
    // Reset or create new record
    const resetTime = now + windowMs
    requestCounts.set(key, { count: 1, resetTime })
    return { allowed: true, remaining: maxRequests - 1, resetTime }
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }

  record.count++
  requestCounts.set(key, record)
  return { allowed: true, remaining: maxRequests - record.count, resetTime: record.resetTime }
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

      const { allowed, remaining, resetTime } = rateLimit(key, maxRequests, windowMs)

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