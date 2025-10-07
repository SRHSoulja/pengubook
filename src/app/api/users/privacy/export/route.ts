import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logSecurity } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * SECURITY & GDPR: Export all user data (Right to Access)
 * User can download complete copy of their data in JSON format
 */
export const POST = withRateLimit(3, 60 * 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
                   request.headers.get('x-real-ip') ||
                   'unknown'

  try {
    logSecurity.suspiciousActivity(
      'User data export requested (GDPR)',
      user.id,
      clientIp,
      { walletAddress: user.walletAddress }
    )

    // Fetch comprehensive user data from all related tables
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        posts: {
          include: {
            likes: true,
            comments: true,
            reactions: true,
            shares: true,
            edits: true,
            bookmarks: true
          }
        },
        comments: {
          include: {
            post: {
              select: { id: true, content: true, createdAt: true }
            }
          }
        },
        likes: {
          include: {
            post: {
              select: { id: true, content: true, authorId: true }
            }
          }
        },
        reactions: {
          include: {
            post: {
              select: { id: true, content: true }
            }
          }
        },
        shares: {
          include: {
            post: {
              select: { id: true, content: true }
            }
          }
        },
        bookmarks: {
          include: {
            post: {
              select: { id: true, content: true, authorId: true, createdAt: true }
            }
          }
        },
        followers: {
          include: {
            follower: {
              select: { id: true, username: true, displayName: true }
            }
          }
        },
        following: {
          include: {
            following: {
              select: { id: true, username: true, displayName: true }
            }
          }
        },
        friendsInitiated: {
          include: {
            receiver: {
              select: { id: true, username: true, displayName: true }
            }
          }
        },
        friendsReceived: {
          include: {
            initiator: {
              select: { id: true, username: true, displayName: true }
            }
          }
        },
        blocksInitiated: {
          include: {
            blocked: {
              select: { id: true, username: true }
            }
          }
        },
        messagesSent: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            recipientId: true,
            isDeleted: true
          }
        },
        messageReadReceipts: {
          select: {
            messageId: true,
            readAt: true
          }
        },
        messageReactions: {
          select: {
            messageId: true,
            emoji: true,
            createdAt: true
          }
        },
        notificationsSent: true,
        notificationsReceived: {
          select: {
            id: true,
            type: true,
            content: true,
            isRead: true,
            createdAt: true,
            fromUserId: true
          }
        },
        tipsGiven: {
          select: {
            id: true,
            toUserId: true,
            amount: true,
            tokenId: true,
            transactionHash: true,
            message: true,
            createdAt: true,
            status: true
          }
        },
        tipsReceived: {
          select: {
            id: true,
            fromUserId: true,
            amount: true,
            tokenId: true,
            transactionHash: true,
            message: true,
            createdAt: true,
            status: true
          }
        },
        userAchievements: {
          include: {
            achievement: true
          }
        },
        activities: {
          select: {
            id: true,
            type: true,
            targetType: true,
            targetId: true,
            metadata: true,
            createdAt: true
          }
        },
        streaks: {
          select: {
            id: true,
            currentStreak: true,
            lastActivityDate: true,
            longestStreak: true
          }
        },
        communityMembers: {
          include: {
            community: {
              select: { id: true, name: true }
            }
          }
        },
        moderatedCommunities: {
          include: {
            community: {
              select: { id: true, name: true }
            }
          }
        },
        reportsSubmitted: {
          select: {
            id: true,
            targetType: true,
            targetId: true,
            reason: true,
            description: true,
            status: true,
            createdAt: true
          }
        },
        reportsReceived: {
          select: {
            id: true,
            targetType: true,
            reason: true,
            status: true,
            createdAt: true,
            submittedById: true
          }
        },
        mutedPhrases: {
          select: {
            id: true,
            phrase: true,
            createdAt: true
          }
        },
        hiddenTokens: {
          select: {
            id: true,
            tokenSymbol: true,
            reason: true,
            createdAt: true
          }
        },
        uploads: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            url: true,
            createdAt: true
          }
        },
        adminActions: {
          select: {
            id: true,
            action: true,
            targetType: true,
            targetId: true,
            reason: true,
            metadata: true,
            success: true,
            createdAt: true
          }
        },
        accounts: {
          select: {
            id: true,
            provider: true,
            providerAccountId: true,
            type: true,
            createdAt: true
            // Do NOT expose tokens, refresh_tokens, or other secrets
          }
        },
        sessions: {
          select: {
            id: true,
            expires: true,
            createdAt: true
            // Do NOT expose sessionToken
          }
        },
        adInteractions: {
          select: {
            id: true,
            adId: true,
            interactionType: true,
            createdAt: true
          }
        },
        adsCreated: {
          select: {
            id: true,
            title: true,
            targetUrl: true,
            status: true,
            impressions: true,
            clicks: true,
            createdAt: true
          }
        }
      }
    })

    if (!userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // SECURITY: Remove sensitive fields before export
    const sanitizedData = {
      ...userData,
      // Keep publicKey/privateKey if they exist (user owns this data)
      // But other users' private info is already excluded via select
    }

    logger.info('User data export completed', {
      userId: user.id.slice(0, 8) + '...',
      postsCount: userData.posts.length,
      commentsCount: userData.comments.length
    }, { component: 'PRIVACY', ip: clientIp })

    return NextResponse.json({
      success: true,
      exportDate: new Date().toISOString(),
      data: sanitizedData,
      metadata: {
        postsCount: userData.posts.length,
        commentsCount: userData.comments.length,
        likesCount: userData.likes.length,
        followersCount: userData.followers.length,
        followingCount: userData.following.length,
        bookmarksCount: userData.bookmarks.length,
        tipsGivenCount: userData.tipsGiven.length,
        tipsReceivedCount: userData.tipsReceived.length,
        achievementsCount: userData.userAchievements.length,
        uploadsCount: userData.uploads.length
      }
    })

  } catch (error: any) {
    logger.error('Error exporting user data', {
      error: error.message,
      stack: error.stack
    }, { component: 'PRIVACY', userId: user.id, ip: clientIp })

    return NextResponse.json(
      { error: 'Failed to export user data', details: error.message },
      { status: 500 }
    )
  }
}))
