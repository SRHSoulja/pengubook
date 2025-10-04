import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// GET: Fetch posts pending review
export const GET = withAuth(async (request: NextRequest, user: any) => {
  try {
    // Check if user is admin
    if (!user.isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor') || undefined
    const take = Math.min(Number(searchParams.get('take') || 25), 100)

    const whereClause = {
      moderationStatus: { in: ['flagged', 'pending'] },
      isNSFW: true, // Only show NSFW flagged content
    }

    // Get total count
    const total = await prisma.post.count({ where: whereClause })

    // Find posts with moderationStatus: 'flagged' or 'pending'
    const posts = await prisma.post.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        authorId: true,
        content: true,
        mediaUrls: true,
        contentWarnings: true,
        moderationStatus: true,
        moderationData: true,
        isNSFW: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          }
        }
      },
    })

    const hasMore = posts.length > take
    const page = hasMore ? posts.slice(0, take) : posts
    const nextCursor = hasMore ? page[page.length - 1].id : null

    // Parse JSON fields
    const formattedPosts = page.map(post => ({
      ...post,
      mediaUrls: JSON.parse(post.mediaUrls || '[]'),
      contentWarnings: JSON.parse(post.contentWarnings || '[]'),
      moderationData: post.moderationData ? JSON.parse(post.moderationData) : null,
    }))

    return NextResponse.json({
      success: true,
      items: formattedPosts,
      total,
      nextCursor,
      hasMore
    })
  } catch (error: any) {
    console.error('[Admin] Review queue GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch review queue', details: error.message },
      { status: 500 }
    )
  }
})
