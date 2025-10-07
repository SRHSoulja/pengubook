import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { withDatabaseCSRFProtection } from '@/lib/csrf'
import { logger, logSecurity } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * SECURITY & GDPR: Delete user account and anonymize data (Right to be Forgotten)
 *
 * IMPORTANT: This is a destructive operation with no undo.
 * - Deletes user account
 * - Anonymizes posts/comments (keeps content for community integrity)
 * - Deletes personal data (messages, profile, activity)
 * - Respects foreign key constraints
 *
 * Rate limit: 1 request per day to prevent accidental deletion
 */
export const POST = withRateLimit(1, 24 * 60 * 60 * 1000)(
  withDatabaseCSRFProtection(
    withAuth(async (request: NextRequest, user: any): Promise<NextResponse> => {
      const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                       request.headers.get('x-real-ip') ||
                       'unknown'

      try {
        const body = await request.json()
        const { confirmationPhrase } = body

        // SECURITY: Require explicit confirmation to prevent accidental deletion
        const expectedPhrase = 'DELETE MY ACCOUNT'
        if (confirmationPhrase !== expectedPhrase) {
          return NextResponse.json(
            {
              error: 'Invalid confirmation phrase',
              expected: expectedPhrase,
              help: 'Please type exactly: DELETE MY ACCOUNT'
            },
            { status: 400 }
          )
        }

        logSecurity.suspiciousActivity(
          'User account deletion requested (GDPR)',
          user.id,
          clientIp,
          { walletAddress: user.walletAddress }
        )

        // Start transaction for atomic deletion
        await prisma.$transaction(async (tx) => {
          // 1. Delete personal data (cascading deletes handled by Prisma)

          // Delete messages (private data)
          await tx.message.deleteMany({
            where: { senderId: user.id }
          })

          // Delete message reactions
          await tx.messageReaction.deleteMany({
            where: { userId: user.id }
          })

          // Delete message read receipts
          await tx.messageReadReceipt.deleteMany({
            where: { userId: user.id }
          })

          // Delete notifications (sent and received)
          await tx.notification.deleteMany({
            where: { OR: [
              { fromUserId: user.id },
              { toUserId: user.id }
            ]}
          })

          // Delete bookmarks
          await tx.bookmark.deleteMany({
            where: { userId: user.id }
          })

          // Delete likes
          await tx.like.deleteMany({
            where: { userId: user.id }
          })

          // Delete reactions
          await tx.reaction.deleteMany({
            where: { userId: user.id }
          })

          // Delete shares
          await tx.share.deleteMany({
            where: { userId: user.id }
          })

          // Delete follows
          await tx.follow.deleteMany({
            where: { OR: [
              { followerId: user.id },
              { followingId: user.id }
            ]}
          })

          // Delete friendships
          await tx.friendship.deleteMany({
            where: { OR: [
              { initiatorId: user.id },
              { receiverId: user.id }
            ]}
          })

          // Delete blocks
          await tx.block.deleteMany({
            where: { OR: [
              { blockerId: user.id },
              { blockedId: user.id }
            ]}
          })

          // Delete activities
          await tx.activity.deleteMany({
            where: { userId: user.id }
          })

          // Delete streaks
          await tx.streak.deleteMany({
            where: { userId: user.id }
          })

          // Delete achievements
          await tx.userAchievement.deleteMany({
            where: { userId: user.id }
          })

          // Delete community memberships
          await tx.communityMember.deleteMany({
            where: { userId: user.id }
          })

          // Delete community moderator roles
          await tx.communityModerator.deleteMany({
            where: { userId: user.id }
          })

          // Delete reports submitted
          await tx.report.deleteMany({
            where: { reporterId: user.id }
          })

          // Delete reports targeting user (if they're about the user)
          await tx.report.deleteMany({
            where: { targetId: user.id }
          })

          // Delete muted phrases
          await tx.mutedPhrase.deleteMany({
            where: { userId: user.id }
          })

          // Delete hidden tokens
          await tx.hiddenToken.deleteMany({
            where: { userId: user.id }
          })

          // Delete ad interactions
          await tx.adInteraction.deleteMany({
            where: { userId: user.id }
          })

          // Delete advertisements created by user
          await tx.advertisement.deleteMany({
            where: { creatorId: user.id }
          })

          // Delete uploads
          await tx.upload.deleteMany({
            where: { userId: user.id }
          })

          // Delete contact submissions
          await tx.contactSubmission.deleteMany({
            where: { userId: user.id }
          })

          // Delete project applications
          await tx.projectApplication.deleteMany({
            where: { userId: user.id }
          })

          // Delete auth attempts
          await tx.authAttempt.deleteMany({
            where: { walletAddress: user.walletAddress || '' }
          })

          // Delete auth nonces
          await tx.authNonce.deleteMany({
            where: { walletAddress: user.walletAddress || '' }
          })

          // 2. Anonymize posts and comments (keep content for community integrity)
          // Replace author with [deleted] user

          // Anonymize posts
          await tx.post.updateMany({
            where: { authorId: user.id },
            data: {
              authorId: 'deleted-user', // Special deleted user ID
              // Keep content, mediaUrls for community integrity
            }
          })

          // Anonymize comments
          await tx.comment.updateMany({
            where: { userId: user.id },
            data: {
              userId: 'deleted-user'
            }
          })

          // Anonymize post edits
          await tx.postEdit.updateMany({
            where: { editedBy: user.id },
            data: {
              editedBy: 'deleted-user'
            }
          })

          // 3. Anonymize tips (keep transaction records for legal/tax purposes)
          await tx.tip.updateMany({
            where: { OR: [
              { fromUserId: user.id },
              { toUserId: user.id }
            ]},
            data: {
              message: '[deleted]'
              // Keep amount, transactionHash for audit trail
            }
          })

          // 4. Delete OAuth accounts
          await tx.account.deleteMany({
            where: { userId: user.id }
          })

          // 5. Delete sessions
          await tx.session.deleteMany({
            where: { userId: user.id }
          })

          // Revoke active sessions
          await tx.revokedSession.deleteMany({
            where: { userId: user.id }
          })

          // 6. Delete admin actions (if user was admin)
          await tx.adminAction.deleteMany({
            where: { adminId: user.id }
          })

          // 7. Delete profile
          await tx.profile.deleteMany({
            where: { userId: user.id }
          })

          // 8. Create special "deleted user" if it doesn't exist
          // This user will be the author of all anonymized content
          await tx.user.upsert({
            where: { id: 'deleted-user' },
            create: {
              id: 'deleted-user',
              username: 'deleted',
              displayName: '[Deleted User]',
              bio: 'This user account has been deleted',
              avatar: null,
              walletAddress: null,
              email: null,
              isAdmin: false,
              isBanned: false,
              isOnline: false
            },
            update: {} // Do nothing if already exists
          })

          // 9. Finally, delete the user account
          await tx.user.delete({
            where: { id: user.id }
          })
        })

        logger.info('User account deleted (GDPR)', {
          userId: user.id.slice(0, 8) + '...',
          walletAddress: user.walletAddress?.slice(0, 6) + '...',
          ip: clientIp
        }, { component: 'PRIVACY' })

        logSecurity.suspiciousActivity(
          'User account deletion completed (GDPR)',
          user.id,
          clientIp,
          { success: true }
        )

        return NextResponse.json({
          success: true,
          message: 'Account deleted successfully. All personal data has been removed.',
          deletedAt: new Date().toISOString()
        })

      } catch (error: any) {
        logger.error('Error deleting user account', {
          error: error.message,
          stack: error.stack
        }, { component: 'PRIVACY', userId: user.id, ip: clientIp })

        // Check if error is due to foreign key constraints
        if (error.code === 'P2003') {
          return NextResponse.json(
            {
              error: 'Account deletion failed due to data dependencies',
              details: 'Please contact support for manual deletion',
              code: 'FOREIGN_KEY_CONSTRAINT'
            },
            { status: 500 }
          )
        }

        return NextResponse.json(
          { error: 'Failed to delete account', details: error.message },
          { status: 500 }
        )
      }
    })
  )
)
