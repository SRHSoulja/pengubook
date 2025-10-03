import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'

// Force dynamic rendering - this endpoint needs request headers for IP-based rate limiting
export const dynamic = 'force-dynamic'

// Nonce Configuration
const NONCE_EXPIRY_MS = 5 * 60 * 1000 // 5 minutes
const MAX_NONCES_PER_IP = 10 // Rate limit nonce generation

export async function GET(request: NextRequest) {
  try {
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                     request.headers.get('x-real-ip') ||
                     'unknown'

    // Rate limit: Check how many active nonces this IP has
    const activeNoncesCount = await prisma.authNonce.count({
      where: {
        ipAddress: clientIp,
        expiresAt: { gt: new Date() },
        used: false
      }
    })

    if (activeNoncesCount >= MAX_NONCES_PER_IP) {
      return NextResponse.json(
        { error: 'Too many pending authentication attempts. Please try again in a few minutes.' },
        { status: 429 }
      )
    }

    // Generate cryptographically secure nonce (32 bytes for extra security)
    const nonce = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + NONCE_EXPIRY_MS)

    // Store nonce in database with metadata
    await prisma.authNonce.create({
      data: {
        nonce,
        ipAddress: clientIp,
        userAgent: request.headers.get('user-agent') || 'unknown',
        expiresAt,
        used: false
      }
    })

    return NextResponse.json({
      nonce,
      expiresAt: expiresAt.toISOString()
    })
  } catch (error) {
    console.error('[Nonce] Generation failed:', error)
    return NextResponse.json(
      { error: 'Failed to generate nonce' },
      { status: 500 }
    )
  }
}
