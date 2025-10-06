import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { awardXPForGivingReaction, awardXPForReceivingReaction } from '@/lib/leveling'

export const dynamic = 'force-dynamic'

// GET /api/posts/[id]/reactions - Get reactions for a post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id

    const reactions = await prisma.reaction.findMany({
      where: { postId },
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
    })

    // Count reactions by type
    const counts: { [key: string]: number } = {}
    reactions.forEach(reaction => {
      counts[reaction.reactionType] = (counts[reaction.reactionType] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      data: {
        reactions,
        counts
      }
    })
  } catch (error: any) {
    console.error('[Reactions] GET error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reactions', details: error.message },
      { status: 500 }
    )
  }
}

// POST /api/posts/[id]/reactions - Toggle a reaction
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const postId = params.id
    const body = await request.json()
    const { reactionType } = body

    if (!reactionType) {
      return NextResponse.json(
        { success: false, error: 'Reaction type is required' },
        { status: 400 }
      )
    }

    // Get user ID from headers (supports both wallet and OAuth users)
    const walletAddress = request.headers.get('x-wallet-address')
    const userIdHeader = request.headers.get('x-user-id')

    let userId: string | null = null

    if (walletAddress) {
      const user = await prisma.user.findUnique({
        where: { walletAddress },
        select: { id: true }
      })
      userId = user?.id || null
    } else if (userIdHeader) {
      userId = userIdHeader
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if user already has ANY reaction on this post
    const existingReactions = await prisma.reaction.findMany({
      where: {
        userId,
        postId
      }
    })

    let toggled = false

    // Check if clicking the same reaction (toggle off)
    const sameReaction = existingReactions.find(r => r.reactionType === reactionType)

    if (sameReaction) {
      // Remove the same reaction (toggle off)
      await prisma.reaction.delete({
        where: { id: sameReaction.id }
      })
      toggled = false
    } else {
      // Remove all existing reactions first
      if (existingReactions.length > 0) {
        await prisma.reaction.deleteMany({
          where: {
            userId,
            postId
          }
        })
      }

      // Add new reaction (toggle on)
      await prisma.reaction.create({
        data: {
          userId,
          postId,
          reactionType
        }
      })
      toggled = true

      // Award XP for giving a reaction
      try {
        const xpResult = await awardXPForGivingReaction(userId, prisma)
        console.log(`[Reactions] User ${userId} earned ${xpResult.xpGained} XP for giving a reaction`)
      } catch (xpError) {
        console.error('[Reactions] Failed to award XP to reactor:', xpError)
      }

      // Award XP to the post author for receiving a reaction
      try {
        const post = await prisma.post.findUnique({
          where: { id: postId },
          select: { authorId: true }
        })

        if (post && post.authorId !== userId) {
          const xpResult = await awardXPForReceivingReaction(post.authorId, prisma)
          console.log(`[Reactions] User ${post.authorId} earned ${xpResult.xpGained} XP for receiving a reaction`)
        }
      } catch (xpError) {
        console.error('[Reactions] Failed to award XP to post author:', xpError)
      }
    }

    // Get updated reaction counts and user's current reactions
    const reactions = await prisma.reaction.findMany({
      where: { postId }
    })

    const counts: { [key: string]: number } = {}
    reactions.forEach(reaction => {
      counts[reaction.reactionType] = (counts[reaction.reactionType] || 0) + 1
    })

    // Get user's current reactions after the operation
    const userReactions = await prisma.reaction.findMany({
      where: {
        userId,
        postId
      },
      select: {
        reactionType: true
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        toggled,
        counts,
        userReactions: userReactions.map(r => r.reactionType)
      }
    })
  } catch (error: any) {
    console.error('[Reactions] POST error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to toggle reaction', details: error.message },
      { status: 500 }
    )
  }
}
