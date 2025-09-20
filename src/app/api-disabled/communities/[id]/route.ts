import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import {
  authenticateUser,
  getUserFromBody,
  checkCommunityPermission,
  validateInput,
  validateArrayInput,
  AuthenticationError,
  AuthorizationError
} from '@/lib/auth'
import { rateLimiters, RateLimitError } from '@/lib/rateLimit'

const prisma = new PrismaClient()

// GET - Get community details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    const community = await prisma.community.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
                profile: {
                  select: {
                    profileVerified: true
                  }
                }
              }
            }
          },
          orderBy: [
            { role: 'desc' },
            { joinedAt: 'asc' }
          ]
        },
        moderators: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      }
    })

    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      )
    }

    // Check if user is a member
    let userMembership = null
    if (userId) {
      userMembership = await prisma.communityMember.findUnique({
        where: {
          userId_communityId: {
            userId,
            communityId: id
          }
        }
      })
    }

    const responseData = {
      ...community,
      tags: JSON.parse(community.tags || '[]'),
      rules: JSON.parse(community.rules || '[]'),
      membersCount: community._count.members,
      userMembership,
      moderators: community.moderators.map(mod => ({
        ...mod,
        permissions: JSON.parse(mod.permissions || '[]')
      }))
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })
  } catch (error) {
    console.error('Error fetching community:', error)
    return NextResponse.json(
      { error: 'Failed to fetch community' },
      { status: 500 }
    )
  }
}

// PUT - Update community (owners, admins, and moderators only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting
    rateLimiters.writeOperations(request)

    const { id } = params
    const body = await request.json()

    // Validate and get user ID from body
    const userId = await getUserFromBody(body)

    // Check if user has permission to edit community
    await checkCommunityPermission(userId, id, ['OWNER', 'ADMIN', 'MODERATOR'])

    // Validate and sanitize inputs
    const updateData: any = {}

    if (body.displayName !== undefined) {
      updateData.displayName = validateInput(body.displayName, 'Display name', 100)
    }

    if (body.description !== undefined) {
      updateData.description = validateInput(body.description, 'Description', 1000)
    }

    if (body.category !== undefined) {
      updateData.category = validateInput(body.category, 'Category', 50)
    }

    if (body.tags !== undefined) {
      const validatedTags = validateArrayInput(body.tags, 'Tags', 10)
      updateData.tags = JSON.stringify(validatedTags)
    }

    if (body.rules !== undefined) {
      const validatedRules = validateArrayInput(body.rules, 'Rules', 20)
      updateData.rules = JSON.stringify(validatedRules)
    }

    if (body.avatar !== undefined) {
      if (body.avatar !== null) {
        updateData.avatar = validateInput(body.avatar, 'Avatar URL', 500)
      } else {
        updateData.avatar = null
      }
    }

    if (body.banner !== undefined) {
      if (body.banner !== null) {
        updateData.banner = validateInput(body.banner, 'Banner URL', 500)
      } else {
        updateData.banner = null
      }
    }

    if (body.visibility !== undefined) {
      const validVisibilities = ['PUBLIC', 'PRIVATE', 'INVITE_ONLY']
      if (!validVisibilities.includes(body.visibility)) {
        throw new AuthenticationError('Invalid visibility option')
      }
      updateData.visibility = body.visibility
    }

    // Token-gating updates
    if (body.isTokenGated !== undefined) {
      updateData.isTokenGated = body.isTokenGated
    }

    if (body.tokenGateType !== undefined) {
      if (body.tokenGateType && !['ERC20', 'ERC721', 'ERC1155'].includes(body.tokenGateType)) {
        throw new AuthenticationError('Invalid token gate type')
      }
      updateData.tokenGateType = body.tokenGateType || null
    }

    if (body.tokenContractAddress !== undefined) {
      updateData.tokenContractAddress = body.tokenContractAddress || null
    }

    if (body.tokenMinAmount !== undefined) {
      updateData.tokenMinAmount = body.tokenMinAmount || null
    }

    if (body.tokenIds !== undefined) {
      updateData.tokenIds = body.tokenIds || '[]'
    }

    if (body.tokenSymbol !== undefined) {
      updateData.tokenSymbol = body.tokenSymbol || null
    }

    if (body.tokenDecimals !== undefined) {
      updateData.tokenDecimals = body.tokenDecimals || null
    }

    const community = await prisma.community.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: {
        ...community,
        tags: JSON.parse(community.tags || '[]'),
        rules: JSON.parse(community.rules || '[]')
      }
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
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': error.retryAfter.toString() }
        }
      )
    }

    console.error('Error updating community:', error)
    return NextResponse.json(
      { error: 'Failed to update community' },
      { status: 500 }
    )
  }
}

// DELETE - Delete community (owners and admins only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Apply rate limiting
    rateLimiters.writeOperations(request)

    const { id } = params
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    if (!userId) {
      throw new AuthenticationError('User ID is required in query parameters')
    }

    // Validate user ID format
    if (typeof userId !== 'string' || userId.trim().length === 0) {
      throw new AuthenticationError('Invalid user ID format')
    }

    // Check if user has permission to delete community (OWNER or ADMIN only)
    await checkCommunityPermission(userId, id, ['OWNER', 'ADMIN'])

    // Verify community exists before deleting
    const community = await prisma.community.findUnique({
      where: { id },
      select: { id: true, displayName: true }
    })

    if (!community) {
      throw new AuthenticationError('Community not found')
    }

    // Delete community (cascade will handle related records)
    await prisma.community.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      message: 'Community deleted successfully'
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
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': error.retryAfter.toString() }
        }
      )
    }

    console.error('Error deleting community:', error)
    return NextResponse.json(
      { error: 'Failed to delete community' },
      { status: 500 }
    )
  }
}