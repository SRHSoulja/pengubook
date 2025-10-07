import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Get all users (admin only)
export const GET = withRateLimit(60, 60 * 1000)(withAdminAuth(async (request: NextRequest, user: any) => {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''

    logAPI.request('admin/users', { requestedBy: user.id.slice(0, 8) + '...', limit, offset, search })

    

    const where: any = {}
    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { displayName: { contains: search, mode: 'insensitive' } },
        { walletAddress: { contains: search, mode: 'insensitive' } }
      ]
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        displayName: true,
        walletAddress: true,
        isAdmin: true,
        isBanned: true,
        level: true,
        createdAt: true,
        profile: {
          select: {
            postsCount: true,
            followersCount: true,
            followingCount: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    const totalUsers = await prisma.user.count({ where })


    logger.info('Admin users fetched', {
      requestedBy: user.id,
      userCount: users.length,
      totalUsers,
      search: search || 'none'
    }, { component: 'AdminPanel' })

    return NextResponse.json({
      success: true,
      users: users.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        walletAddress: u.walletAddress,
        isAdmin: u.isAdmin,
        isBanned: u.isBanned,
        level: u.level,
        createdAt: u.createdAt,
        stats: {
          posts: u.profile?.postsCount || 0,
          followers: u.profile?.followersCount || 0,
          following: u.profile?.followingCount || 0
        }
      })),
      pagination: {
        limit,
        offset,
        total: totalUsers,
        hasMore: offset + users.length < totalUsers
      }
    })

  } catch (error: any) {
    logAPI.error('admin/users', error)
    return NextResponse.json(
      { error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    )
  }
}))