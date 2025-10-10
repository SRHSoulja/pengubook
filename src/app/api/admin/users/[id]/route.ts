import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAdminAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Update user (admin only)
export const PUT = withRateLimit(30, 60 * 1000)(withAdminAuth(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const { id } = params
    const body = await request.json()
    const { isBanned, level, isAdmin } = body

    logAPI.request('admin/users/update', {
      userId: id,
      updatedBy: user.id.slice(0, 8) + '...',
      changes: { isBanned, level, isAdmin }
    })

    

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, isAdmin: true }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent non-super-admins from modifying other admins
    if (targetUser.isAdmin && !user.isSuperAdmin && targetUser.id !== user.id) {
      return NextResponse.json(
        { error: 'Cannot modify other admin accounts' },
        { status: 403 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (isBanned !== undefined) updateData.isBanned = Boolean(isBanned)
    if (level !== undefined) updateData.level = Math.max(1, Math.min(parseInt(level), 100))
    if (isAdmin !== undefined && user.isSuperAdmin) updateData.isAdmin = Boolean(isAdmin)

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        displayName: true,
        walletAddress: true,
        isAdmin: true,
        isBanned: true,
        level: true,
        createdAt: true
      }
    })


    logger.info('User updated by admin', {
      targetUserId: id,
      updatedBy: user.id,
      changes: updateData
    }, 'AdminPanel')

    return NextResponse.json({
      success: true,
      user: updatedUser
    })

  } catch (error: any) {
    logAPI.error('admin/users/update', error)
    return NextResponse.json(
      { error: 'Failed to update user', details: error.message },
      { status: 500 }
    )
  }
}))

// Delete user (admin only)
export const DELETE = withRateLimit(10, 60 * 1000)(withAdminAuth(async (request: NextRequest, user: any, { params }: { params: { id: string } }) => {
  try {
    const { id } = params

    logAPI.request('admin/users/delete', {
      userId: id,
      deletedBy: user.id.slice(0, 8) + '...'
    })

    

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, username: true, isAdmin: true }
    })

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent deletion of admin accounts (unless super admin)
    if (targetUser.isAdmin && !user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Cannot delete admin accounts' },
        { status: 403 }
      )
    }

    // Prevent self-deletion
    if (targetUser.id === user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Delete user (this will cascade to related data)
    await prisma.user.delete({
      where: { id }
    })


    logger.info('User deleted by admin', {
      deletedUserId: id,
      deletedUsername: targetUser.username,
      deletedBy: user.id
    }, 'AdminPanel')

    return NextResponse.json({
      success: true,
      content: `User "${targetUser.username}" deleted successfully`
    })

  } catch (error: any) {
    logAPI.error('admin/users/delete', error)
    return NextResponse.json(
      { error: 'Failed to delete user', details: error.message },
      { status: 500 }
    )
  }
}))