import { NextRequest, NextResponse } from 'next/server'
import { GaslessSocialService } from '@/lib/gasless-social'
import { PrismaClient } from '@prisma/client'
import { withAuth, withRateLimit } from '@/lib/auth-middleware'

export const dynamic = 'force-dynamic'

// Initialize gasless service (may be null if env vars not available)
let gaslessService: GaslessSocialService | null = null
try {
  gaslessService = new GaslessSocialService()
} catch (error) {
  console.warn('Gasless service not available - missing environment variables')
}

export const POST = withRateLimit(10, 15 * 60 * 1000)(withAuth(async (
  request: NextRequest,
  user: any
) => {
  try {
    const body = await request.json()
    const { content, signature, postData } = body

    if (!content || !signature || !postData) {
      return NextResponse.json(
        { error: 'Content, signature, and postData are required' },
        { status: 400 }
      )
    }

    // Check if gasless service is available
    if (!gaslessService) {
      return NextResponse.json(
        { error: 'Gasless posting service not available' },
        { status: 503 }
      )
    }

    // Check if user should use gasless posting (based on level)
    if (!gaslessService.shouldProcessOnChain('CREATE_POST', user.level)) {
      return NextResponse.json(
        { error: 'Gasless posting not available for your level. Use regular posting.' },
        { status: 403 }
      )
    }

    const prisma = new PrismaClient()

    try {
      // Submit to blockchain (we pay gas)
      const blockchainResult = await gaslessService.submitPost(
        user.walletAddress,
        postData,
        signature
      )

      if (!blockchainResult.success) {
        await prisma.$disconnect()
        return NextResponse.json(
          { error: 'Failed to submit to blockchain: ' + blockchainResult.error },
          { status: 500 }
        )
      }

      // Also store in database for fast queries
      const newPost = await prisma.post.create({
        data: {
          authorId: user.id,
          content,
          contentType: 'TEXT',
          mediaUrls: '[]',
          visibility: 'PUBLIC',
          isPromoted: false,
          // Add blockchain metadata
          blockchainTxHash: blockchainResult.txHash,
          isOnChain: true
        },
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
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
        where: { userId: user.id },
        update: {
          postsCount: {
            increment: 1
          }
        },
        create: {
          userId: user.id,
          postsCount: 1
        }
      })

      await prisma.$disconnect()

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
        },
        blockchain: {
          txHash: blockchainResult.txHash,
          isOnChain: true
        }
      }

      return NextResponse.json({
        success: true,
        post: formattedPost,
        message: 'Post created on-chain with gasless transaction!'
      }, { status: 201 })

    } catch (dbError: any) {
      await prisma.$disconnect()
      console.error('[Gasless Post] Database error:', dbError)
      return NextResponse.json(
        { error: 'Failed to save post to database', details: dbError.message },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('[Gasless Post] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create gasless post', details: error.message },
      { status: 500 }
    )
  }
}))