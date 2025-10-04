import { prisma } from '@/lib/prisma'
import { encryptMessage } from '@/lib/server-encryption'

/**
 * Cleanup job to delete expired self-destructing messages
 * Should be called periodically (e.g., every minute via cron)
 */
export async function cleanupExpiredMessages() {
  try {
    const now = new Date()

    // Find all expired messages that haven't been deleted yet
    const expiredMessages = await prisma.message.findMany({
      where: {
        expiresAt: {
          lte: now
        },
        isDeleted: false
      },
      select: {
        id: true,
        conversationId: true
      }
    })

    if (expiredMessages.length === 0) {
      return { success: true, deletedCount: 0 }
    }

    // Soft delete all expired messages
    const result = await prisma.message.updateMany({
      where: {
        id: {
          in: expiredMessages.map(m => m.id)
        }
      },
      data: {
        isDeleted: true,
        deletedAt: now,
        deletedBy: 'SYSTEM', // System auto-delete
        content: encryptMessage('[Message expired]')
      }
    })

    console.log(`[Message Cleanup] Deleted ${result.count} expired messages`)

    return {
      success: true,
      deletedCount: result.count
    }

  } catch (error) {
    console.error('[Message Cleanup] Error cleaning up expired messages:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Hard delete messages that have been soft-deleted for more than 30 days
 * This is for data retention compliance
 */
export async function permanentlyDeleteOldMessages() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const result = await prisma.message.deleteMany({
      where: {
        isDeleted: true,
        deletedAt: {
          lte: thirtyDaysAgo
        }
      }
    })

    console.log(`[Message Cleanup] Permanently deleted ${result.count} old messages`)

    return {
      success: true,
      deletedCount: result.count
    }

  } catch (error) {
    console.error('[Message Cleanup] Error permanently deleting old messages:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
