import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { rateLimiters, RateLimitError } from '@/lib/rateLimit'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    rateLimiters.general(request)

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters long' },
        { status: 400 }
      )
    }

    // Input sanitization and validation
    let searchTerm = query.trim()

    // Security: Limit search term length to prevent DoS
    if (searchTerm.length > 50) {
      return NextResponse.json(
        { error: 'Search query too long' },
        { status: 400 }
      )
    }

    // Security: Remove dangerous special characters and potential injection attempts
    searchTerm = searchTerm.replace(/[<>'";&\\]/g, '')

    // Remove @ prefix if present (common for username searches)
    if (searchTerm.startsWith('@')) {
      searchTerm = searchTerm.substring(1)
    }

    // Ensure we still have a valid search term after sanitization
    if (searchTerm.length < 1) {
      return NextResponse.json(
        { error: 'Search query too short after sanitization' },
        { status: 400 }
      )
    }

    // Search users by username or displayName
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            isBanned: false
          },
          {
            OR: [
              { username: { contains: searchTerm } },
              { displayName: { contains: searchTerm } }
            ]
          }
        ]
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
        level: true,
        profile: {
          select: {
            profileVerified: true,
            followersCount: true
          }
        }
      },
      orderBy: [
        { level: 'desc' },
        { profile: { followersCount: 'desc' } }
      ],
      take: Math.min(limit, 50) // Cap at 50 results
    })

    return NextResponse.json({
      success: true,
      users,
      query: searchTerm,
      count: users.length
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': error.retryAfter.toString() }
        }
      )
    }

    // Security: Log error details server-side but don't expose to client
    console.error('Error searching users:', error)
    return NextResponse.json(
      { error: 'Search service temporarily unavailable' },
      { status: 500 }
    )
  }
}