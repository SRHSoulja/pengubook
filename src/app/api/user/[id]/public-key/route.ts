import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { AuthenticationError } from '@/lib/auth'
import { rateLimiters, RateLimitError } from '@/lib/rateLimit'

const prisma = new PrismaClient()

// GET - Get user's public key for encryption
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    rateLimiters.general(request)

    const { id: userId } = params

    // Get user's public key
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { publicKey: true }
    })

    if (!user) {
      throw new AuthenticationError('User not found')
    }

    return NextResponse.json({
      success: true,
      publicKey: user.publicKey
    })
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': error.retryAfter.toString() }
        }
      )
    }

    console.error('Error fetching public key:', error)
    return NextResponse.json(
      { error: 'Failed to fetch public key' },
      { status: 500 }
    )
  }
}