import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { authenticateUserSecure, AuthenticationError, AuthorizationError } from '@/lib/auth/secure'

const prisma = new PrismaClient()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { reactionType } = await request.json()

    // Authenticate user securely
    const user = await authenticateUserSecure(request)

    if (!reactionType) {
      return NextResponse.json(
        { error: 'Reaction type is required' },
        { status: 400 }
      )
    }

    // Validate reaction type
    const validReactions = ['PENGUIN_REACT', 'LAUGH', 'CRY', 'SHOCK', 'ANGER', 'THUMBS_UP', 'THUMBS_DOWN']
    if (!validReactions.includes(reactionType)) {
      return NextResponse.json(
        { error: 'Invalid reaction type' },
        { status: 400 }
      )
    }

    // Check if post exists
    const post = await prisma.post.findUnique({
      where: { id: params.id }
    })

    if (!post) {
      return NextResponse.json(
        { error: 'Post not found' },
        { status: 404 }
      )
    }

    // Check if user already reacted to this post with this reaction type
    const existingReaction = await prisma.reaction.findUnique({
      where: {
        userId_postId_reactionType: {
          userId: user.id,
          postId: params.id,
          reactionType
        }
      }
    })

    if (existingReaction) {
      // Remove the reaction (toggle off)
      await prisma.reaction.delete({
        where: {
          id: existingReaction.id
        }
      })
    } else {
      // Add the reaction
      await prisma.reaction.create({
        data: {
          userId: user.id,
          postId: params.id,
          reactionType
        }
      })
    }

    // Get updated reaction counts
    const reactionCounts = await prisma.reaction.groupBy({
      by: ['reactionType'],
      where: {
        postId: params.id
      },
      _count: {
        id: true
      }
    })

    // Format reaction counts
    const formattedCounts: { [key: string]: number } = {}
    reactionCounts.forEach(group => {
      formattedCounts[group.reactionType] = group._count.id
    })

    return NextResponse.json({
      success: true,
      data: {
        counts: formattedCounts,
        toggled: !existingReaction
      }
    })
  } catch (error) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      )
    }

    console.error('Error handling reaction:', error)
    return NextResponse.json(
      { error: 'Failed to handle reaction' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get reaction counts for the post
    const reactionCounts = await prisma.reaction.groupBy({
      by: ['reactionType'],
      where: {
        postId: params.id
      },
      _count: {
        id: true
      }
    })

    // Format reaction counts
    const formattedCounts: { [key: string]: number } = {}
    reactionCounts.forEach(group => {
      formattedCounts[group.reactionType] = group._count.id
    })

    return NextResponse.json({
      success: true,
      data: {
        counts: formattedCounts
      }
    })
  } catch (error) {
    console.error('Error fetching reactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reactions' },
      { status: 500 }
    )
  }
}