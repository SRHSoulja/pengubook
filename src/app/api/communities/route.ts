import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import {
  getUserFromBody,
  validateInput,
  validateArrayInput,
  AuthenticationError,
  AuthorizationError
} from '@/lib/auth'
import { rateLimiters, RateLimitError } from '@/lib/rateLimit'

const prisma = new PrismaClient()

// GET - List all public communities with filtering and search
export async function GET(request: NextRequest) {
  try {
    // Apply rate limiting
    rateLimiters.general(request)
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const featured = searchParams.get('featured')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Build query filters
    const where: any = {
      visibility: 'PUBLIC'
    }

    if (category && category !== 'all') {
      where.category = category
    }

    if (search) {
      where.OR = [
        { displayName: { contains: search } },
        { description: { contains: search } },
        { name: { contains: search } }
      ]
    }

    if (featured === 'true') {
      where.isOfficial = true
    }

    // Get total count
    const total = await prisma.community.count({ where })

    // Get paginated communities
    const communities = await prisma.community.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [
        { isOfficial: 'desc' },
        { membersCount: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    // Parse tags for each community
    const formattedCommunities = communities.map(community => ({
      ...community,
      tags: JSON.parse(community.tags || '[]')
    }))

    return NextResponse.json({
      success: true,
      data: {
        communities: formattedCommunities,
        pagination: {
          total,
          page,
          limit,
          hasNext: (page - 1) * limit + communities.length < total,
          hasPrev: page > 1
        }
      }
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

    console.error('Error fetching communities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch communities' },
      { status: 500 }
    )
  }
}

// POST - Create a new community
export async function POST(request: NextRequest) {
  try {
    // Apply strict rate limiting for community creation
    rateLimiters.communityCreation(request)

    const body = await request.json()

    // Validate and get user ID from body
    const creatorId = await getUserFromBody(body)

    // Validate and sanitize required inputs
    const name = validateInput(body.name, 'Community name', 50)
    const displayName = validateInput(body.displayName, 'Display name', 100)
    const description = validateInput(body.description, 'Description', 1000)
    const category = validateInput(body.category, 'Category', 50)

    // Validate community name format (no spaces, special chars, etc.)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      throw new AuthenticationError('Community name can only contain letters, numbers, hyphens, and underscores')
    }

    // Validate optional inputs
    const tags = body.tags ? validateArrayInput(body.tags, 'Tags', 10) : []
    const rules = body.rules ? validateArrayInput(body.rules, 'Rules', 20) : []

    const visibility = body.visibility || 'PUBLIC'
    const validVisibilities = ['PUBLIC', 'PRIVATE', 'INVITE_ONLY']
    if (!validVisibilities.includes(visibility)) {
      throw new AuthenticationError('Invalid visibility option')
    }

    let avatar = null
    let banner = null

    if (body.avatar) {
      avatar = validateInput(body.avatar, 'Avatar URL', 500)
    }

    if (body.banner) {
      banner = validateInput(body.banner, 'Banner URL', 500)
    }

    // Token-gating validation
    let tokenGateData = {}
    if (body.isTokenGated) {
      const tokenGateType = validateInput(body.tokenGateType, 'Token gate type', 10)
      const tokenContractAddress = validateInput(body.tokenContractAddress, 'Token contract address', 50)

      if (!['ERC20', 'ERC721', 'ERC1155'].includes(tokenGateType)) {
        throw new AuthenticationError('Invalid token gate type')
      }

      tokenGateData = {
        isTokenGated: true,
        tokenGateType,
        tokenContractAddress,
        tokenMinAmount: body.tokenMinAmount || '1',
        tokenIds: body.tokenIds || '[]',
        tokenSymbol: body.tokenSymbol || '',
        tokenDecimals: parseInt(body.tokenDecimals) || (tokenGateType === 'ERC20' ? 18 : 0)
      }
    }

    // Check if community name already exists (case insensitive)
    const existingCommunity = await prisma.community.findFirst({
      where: {
        name: name
      }
    })

    if (existingCommunity) {
      throw new AuthenticationError('A community with this name already exists')
    }

    // Verify user exists and is not banned
    const user = await prisma.user.findUnique({
      where: { id: creatorId },
      select: { id: true, isBanned: true, level: true }
    })

    if (!user) {
      throw new AuthenticationError('User not found')
    }

    if (user.isBanned) {
      throw new AuthorizationError('Banned users cannot create communities')
    }

    // Check if user has reached community creation limit (e.g., max 5 communities per user)
    const userCommunitiesCount = await prisma.community.count({
      where: { creatorId }
    })

    if (userCommunitiesCount >= 5) {
      throw new AuthorizationError('You have reached the maximum limit of 5 communities per user')
    }

    // Create community and related records in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the community
      const community = await tx.community.create({
        data: {
          name: name.toLowerCase(), // Store name in lowercase for consistency
          displayName,
          description,
          category,
          tags: JSON.stringify(tags),
          rules: JSON.stringify(rules),
          visibility,
          avatar,
          banner,
          creatorId,
          membersCount: 1, // Creator is the first member
          isOfficial: false,
          ...tokenGateData
        }
      })

      // Add creator as the first member with OWNER role
      await tx.communityMember.create({
        data: {
          userId: creatorId,
          communityId: community.id,
          role: 'OWNER'
        }
      })

      // Add creator as moderator with full permissions
      await tx.communityModerator.create({
        data: {
          userId: creatorId,
          communityId: community.id,
          permissions: JSON.stringify(['ALL'])
        }
      })

      return community
    })

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        tags: JSON.parse(result.tags || '[]'),
        rules: JSON.parse(result.rules || '[]')
      },
      message: 'Community created successfully!'
    })
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    if (error instanceof RateLimitError) {
      return NextResponse.json(
        { error: 'Too many community creation attempts. Please try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': error.retryAfter.toString() }
        }
      )
    }

    console.error('Error creating community:', error)
    return NextResponse.json(
      { error: 'Failed to create community' },
      { status: 500 }
    )
  }
}