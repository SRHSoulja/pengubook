import { NextRequest } from 'next/server'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

const store: RateLimitStore = {}

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number
  keyGenerator?: (request: NextRequest) => string
}

export class RateLimitError extends Error {
  constructor(public retryAfter: number) {
    super('Too many requests')
    this.name = 'RateLimitError'
  }
}

export function rateLimit(config: RateLimitConfig) {
  return (request: NextRequest): void => {
    const now = Date.now()
    const key = config.keyGenerator ? config.keyGenerator(request) : getDefaultKey(request)

    // Clean up expired entries
    if (store[key] && store[key].resetTime <= now) {
      delete store[key]
    }

    // Initialize or update counter
    if (!store[key]) {
      store[key] = {
        count: 1,
        resetTime: now + config.windowMs
      }
      return
    }

    store[key].count++

    if (store[key].count > config.maxRequests) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000)
      throw new RateLimitError(retryAfter)
    }
  }
}

function getDefaultKey(request: NextRequest): string {
  // Try to get IP address for rate limiting
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0] :
             request.headers.get('x-real-ip') ||
             'unknown'

  // Also include wallet address if available for more specific rate limiting
  const walletAddress = request.headers.get('x-wallet-address')

  return walletAddress ? `${ip}:${walletAddress}` : ip
}

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  // General API rate limit
  general: rateLimit({
    maxRequests: 100,
    windowMs: 15 * 60 * 1000 // 15 minutes
  }),

  // More restrictive for write operations
  writeOperations: rateLimit({
    maxRequests: 20,
    windowMs: 15 * 60 * 1000 // 15 minutes
  }),

  // Very restrictive for community creation
  communityCreation: rateLimit({
    maxRequests: 5,
    windowMs: 60 * 60 * 1000 // 1 hour
  }),

  // Group conversation creation - prevent spam
  groupCreation: rateLimit({
    maxRequests: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyGenerator: (request: NextRequest) => {
      // Rate limit by user ID for group creation
      const userId = request.headers.get('x-user-id')
      const walletAddress = request.headers.get('x-wallet-address')
      return `group_creation:${userId || walletAddress || 'unknown'}`
    }
  }),

  // Authentication attempts - general auth requests
  authentication: rateLimit({
    maxRequests: 10,
    windowMs: 15 * 60 * 1000 // 15 minutes
  }),

  // Challenge generation - more restrictive to prevent spam
  authChallenge: rateLimit({
    maxRequests: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
    keyGenerator: (request: NextRequest) => {
      // Rate limit by IP for challenge generation
      const forwarded = request.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0] :
                 request.headers.get('x-real-ip') || 'unknown'
      return `challenge:${ip}`
    }
  }),

  // Wallet login attempts - very restrictive
  walletLogin: rateLimit({
    maxRequests: 3,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyGenerator: (request: NextRequest) => {
      // Rate limit by IP and wallet address combination
      const forwarded = request.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0] :
                 request.headers.get('x-real-ip') || 'unknown'
      const walletAddress = request.headers.get('x-wallet-address') || 'unknown'
      return `wallet_login:${ip}:${walletAddress}`
    }
  }),

  // Session token requests
  sessionToken: rateLimit({
    maxRequests: 8,
    windowMs: 10 * 60 * 1000, // 10 minutes
    keyGenerator: (request: NextRequest) => {
      const forwarded = request.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0] :
                 request.headers.get('x-real-ip') || 'unknown'
      return `session:${ip}`
    }
  }),

  // Password reset/sensitive operations
  sensitiveOperations: rateLimit({
    maxRequests: 2,
    windowMs: 60 * 60 * 1000, // 1 hour
    keyGenerator: (request: NextRequest) => {
      const forwarded = request.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0] :
                 request.headers.get('x-real-ip') || 'unknown'
      const walletAddress = request.headers.get('x-wallet-address') || 'unknown'
      return `sensitive:${ip}:${walletAddress}`
    }
  }),

  // Failed login attempts - progressive rate limiting
  failedLogin: rateLimit({
    maxRequests: 5,
    windowMs: 30 * 60 * 1000, // 30 minutes
    keyGenerator: (request: NextRequest) => {
      const forwarded = request.headers.get('x-forwarded-for')
      const ip = forwarded ? forwarded.split(',')[0] :
                 request.headers.get('x-real-ip') || 'unknown'
      return `failed_login:${ip}`
    }
  })
}