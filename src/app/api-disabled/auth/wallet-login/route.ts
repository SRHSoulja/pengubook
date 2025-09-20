import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { rateLimiters, RateLimitError } from '@/lib/rateLimit'
import { generateSessionToken } from '@/lib/auth/secure'

const prisma = new PrismaClient()
const ADMIN_WALLET = process.env.ADMIN_WALLET_ADDRESS

export async function POST(request: NextRequest) {
  try {
    // Apply wallet login rate limiting
    rateLimiters.walletLogin(request)

    const { walletAddress } = await request.json()

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    let user: any = await prisma.user.findUnique({
      where: { walletAddress },
      include: { profile: true }
    })

    if (!user) {
      // Create new user with default username
      const username = `user_${walletAddress.slice(-6)}`
      const displayName = `User ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
      const isAdmin = Boolean(ADMIN_WALLET && walletAddress.toLowerCase() === ADMIN_WALLET.toLowerCase())

      user = await prisma.user.create({
        data: {
          walletAddress,
          username,
          displayName,
          isAdmin,
          profile: {
            create: {
              socialLinks: '[]',
              interests: '[]',
              languages: '[]',
              skills: '[]'
            }
          }
        },
        include: { profile: true }
      })

      console.log('New user created:', user.username)
    } else {
      // Update admin flag if needed
      const isAdmin = Boolean(ADMIN_WALLET && walletAddress.toLowerCase() === ADMIN_WALLET.toLowerCase())
      if (user.isAdmin !== isAdmin) {
        user = await prisma.user.update({
          where: { walletAddress },
          data: { isAdmin },
          include: { profile: true }
        })
      }
      console.log('Existing user logged in:', user.username)
    }

    // Generate session token for authentication
    const sessionToken = generateSessionToken({
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username,
      displayName: user.displayName,
      level: user.level,
      isBanned: user.isBanned,
      isAdmin: user.isAdmin
    })

    // Return user data with session token
    const response = NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        walletAddress: user.walletAddress,
        bio: user.bio,
        avatar: user.avatar,
        profile: user.profile
      },
      sessionToken
    })

    // Set session token as HTTP-only cookie for security
    response.cookies.set('pengu_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 // 24 hours
    })

    return response

  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': error.retryAfter.toString() }
        }
      )
    }

    console.error('Wallet login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}