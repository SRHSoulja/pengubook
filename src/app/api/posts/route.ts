import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'
import { awardXPForPost } from '@/lib/leveling'
import { checkAndAwardAchievements } from '@/lib/achievement-checker'
import { processHashtagsForPost } from '@/lib/hashtag-processor'
import { updatePostStreak } from '@/lib/streak-tracker'
import { sanitizeMediaUrls } from '@/lib/utils/url-validator'
import { sanitizeHtml } from '@/lib/sanitize'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const authorId = searchParams.get('authorId')
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')
    const visibility = searchParams.get('visibility') || 'PUBLIC'

    

    const where: any = {
      visibility: visibility
    }

    if (authorId) {
      where.authorId = authorId
    }

    const posts = await prisma.post.findMany({
      where,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            avatarSource: true,
            discordAvatar: true,
            twitterAvatar: true,
            level: true,
            isAdmin: true,
            discordName: true,
            twitterHandle: true
          }
        },
        likes: {
          select: {
            userId: true
          }
        },
        comments: {
          select: {
            id: true
          }
        },
        shares: {
          select: {
            id: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })


    const formattedPosts = posts.map(post => ({
      id: post.id,
      content: post.content,
      contentType: post.contentType,
      mediaUrls: JSON.parse(post.mediaUrls || '[]'),
      visibility: post.visibility,
      isPromoted: post.isPromoted,
      isNSFW: post.isNSFW,
      contentWarnings: post.contentWarnings,
      moderationStatus: post.moderationStatus,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: post.author,
      stats: {
        likes: post._count.likes,
        comments: post._count.comments,
        shares: post._count.shares
      }
    }))

    return NextResponse.json({
      success: true,
      posts: formattedPosts,
      pagination: {
        limit,
        offset,
        hasMore: posts.length === limit
      }
    })

  } catch (error: any) {
    console.error('[Posts] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch posts', details: error.message },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(20, 15 * 60 * 1000)(withAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { content, contentType = 'TEXT', mediaUrls = [], visibility = 'PUBLIC', moderationData = null } = body

    // Use authenticated user's ID instead of requiring it in body
    const authorId = user.id

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      )
    }

    if (content.length > 2000) {
      return NextResponse.json(
        { error: 'Content cannot exceed 2000 characters' },
        { status: 400 }
      )
    }

    // Sanitize post content to prevent XSS attacks (allows safe HTML formatting)
    const sanitizedContent = sanitizeHtml(content)

    // Validate and sanitize media URLs (security: prevent XSS, SSRF)
    const sanitizedMediaUrls = sanitizeMediaUrls(mediaUrls)

    // Warn if URLs were filtered out
    if (sanitizedMediaUrls.length !== mediaUrls.length) {
      console.warn('[Posts] Filtered invalid media URLs:', {
        original: mediaUrls.length,
        sanitized: sanitizedMediaUrls.length,
        userId: user.id
      })
    }

    // User is already authenticated and verified by middleware

    // Extract moderation data if provided
    const isNSFW = moderationData?.isNSFW || false
    const moderationStatus = moderationData?.status || 'approved'
    const moderationDetails = moderationData ? JSON.stringify(moderationData) : null
    const contentWarnings = moderationData?.contentWarnings || []

    console.log('[Posts] Creating post with moderation data:', {
      isNSFW,
      moderationStatus,
      contentWarnings,
      hasModeration: !!moderationData
    })

    // Create the post
    const newPost = await prisma.post.create({
      data: {
        authorId,
        content: sanitizedContent,
        contentType,
        mediaUrls: JSON.stringify(sanitizedMediaUrls),
        visibility,
        isNSFW,
        moderationStatus,
        moderationData: moderationDetails,
        contentWarnings: JSON.stringify(contentWarnings)
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            avatarSource: true,
            discordAvatar: true,
            twitterAvatar: true,
            level: true,
            isAdmin: true,
            discordName: true,
            twitterHandle: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true
          }
        }
      }
    })

    // Update user's post count
    await prisma.profile.upsert({
      where: { userId: authorId },
      update: {
        postsCount: {
          increment: 1
        }
      },
      create: {
        userId: authorId,
        postsCount: 1
      }
    })

    // Award XP for creating a post
    try {
      const xpResult = await awardXPForPost(authorId, prisma)
      console.log(`[Posts] User ${authorId} earned ${xpResult.xpGained} XP for creating a post`)
      if (xpResult.leveledUp) {
        console.log(`[Posts] User ${authorId} leveled up from ${xpResult.oldLevel} to ${xpResult.newLevel}!`)
      }
    } catch (xpError) {
      console.error('[Posts] Failed to award XP:', xpError)
      // Don't fail the post creation if XP fails
    }

    // Update post streak
    try {
      const streakResult = await updatePostStreak(authorId)
      console.log(`[Posts] User ${authorId} post streak: ${streakResult.currentCount} days`)

      // Check streak-based achievements if streak was extended
      if (streakResult.wasExtended || streakResult.isNew) {
        const achievementResult = await checkAndAwardAchievements(authorId, 'streak')
        if (achievementResult.newAchievements.length > 0) {
          console.log(`[Posts] User ${authorId} unlocked streak achievements: ${achievementResult.newAchievements.join(', ')}`)
        }
      }
    } catch (streakError) {
      console.error('[Posts] Failed to update post streak:', streakError)
    }

    // Check and award achievements
    try {
      const achievementResult = await checkAndAwardAchievements(authorId, 'post')
      if (achievementResult.newAchievements.length > 0) {
        console.log(`[Posts] User ${authorId} unlocked ${achievementResult.newAchievements.length} new achievements: ${achievementResult.newAchievements.join(', ')}`)
      }
    } catch (achievementError) {
      console.error('[Posts] Failed to check achievements:', achievementError)
      // Don't fail the post creation if achievement checking fails
    }

    // Process hashtags in the post content (use sanitized content)
    try {
      await processHashtagsForPost(newPost.id, sanitizedContent, prisma)
    } catch (hashtagError) {
      console.error('[Posts] Failed to process hashtags:', hashtagError)
      // Don't fail the post creation if hashtag processing fails
    }


    const formattedPost = {
      id: newPost.id,
      content: newPost.content,
      contentType: newPost.contentType,
      mediaUrls: JSON.parse(newPost.mediaUrls || '[]'),
      visibility: newPost.visibility,
      isPromoted: newPost.isPromoted,
      createdAt: newPost.createdAt,
      updatedAt: newPost.updatedAt,
      author: newPost.author,
      stats: {
        likes: newPost._count.likes,
        comments: newPost._count.comments,
        shares: newPost._count.shares
      }
    }

    return NextResponse.json({
      success: true,
      post: formattedPost
    }, { status: 201 })

  } catch (error: any) {
    console.error('[Posts] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create post', details: error.message },
      { status: 500 }
    )
  }
}))