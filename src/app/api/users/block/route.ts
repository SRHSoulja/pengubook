import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Block a user
export const POST = withRateLimit(10, 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { userId: targetUserId } = body

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: 'Cannot block yourself' },
        { status: 400 }
      )
    }

    

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if already blocked
    const existingBlock = await prisma.block.findUnique({
      where: {
        blockerId_blockedId: {
          blockerId: user.id,
          blockedId: targetUserId
        }
      }
    })

    if (existingBlock) {
      return NextResponse.json(
        { error: 'User is already blocked' },
        { status: 409 }
      )
    }

    // Create block
    const block = await prisma.block.create({
      data: {
        blockerId: user.id,
        blockedId: targetUserId
      }
    })

    // Remove any existing friendship
    await prisma.friendship.deleteMany({
      where: {
        OR: [
          { initiatorId: user.id, receiverId: targetUserId },
          { initiatorId: targetUserId, receiverId: user.id }
        ]
      }
    })


    logger.info('User blocked', {
      blockerId: user.id.slice(0, 8) + '...',
      blockedId: targetUserId.slice(0, 8) + '...'
    }, 'Privacy')

    return NextResponse.json({
      success: true,
      content: 'User blocked successfully',
      blockId: block.id
    })

  } catch (error: any) {
    logger.error('Error blocking user', error, 'Privacy')
    return NextResponse.json(
      { error: 'Failed to block user', details: error.message },
      { status: 500 }
    )
  }
}))

// Unblock a user
export const DELETE = withRateLimit(10, 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const targetUserId = searchParams.get('userId')

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    

    // Find and delete the block
    const deletedBlock = await prisma.block.deleteMany({
      where: {
        blockerId: user.id,
        blockedId: targetUserId
      }
    })


    if (deletedBlock.count === 0) {
      return NextResponse.json(
        { error: 'User is not blocked' },
        { status: 404 }
      )
    }

    logger.info('User unblocked', {
      blockerId: user.id.slice(0, 8) + '...',
      blockedId: targetUserId.slice(0, 8) + '...'
    }, 'Privacy')

    return NextResponse.json({
      success: true,
      content: 'User unblocked successfully'
    })

  } catch (error: any) {
    logger.error('Error unblocking user', error, 'Privacy')
    return NextResponse.json(
      { error: 'Failed to unblock user', details: error.message },
      { status: 500 }
    )
  }
}))

// Get blocked users list
export const GET = withRateLimit(30, 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    

    const blocks = await prisma.block.findMany({
      where: {
        blockerId: user.id
      },
      include: {
        blocked: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })


    return NextResponse.json({
      success: true,
      data: blocks.map(block => ({
        id: block.id,
        user: block.blocked,
        blockedAt: block.createdAt
      }))
    })

  } catch (error: any) {
    logger.error('Error fetching blocked users', error, 'Privacy')
    return NextResponse.json(
      { error: 'Failed to fetch blocked users', details: error.message },
      { status: 500 }
    )
  }
}))