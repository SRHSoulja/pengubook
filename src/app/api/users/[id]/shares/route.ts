import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: userId } = params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    const prisma = new PrismaClient()

    const shares = await prisma.share.findMany({
      where: { userId },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatar: true,
                level: true,
                isAdmin: true
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
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    })

    const formattedShares = shares.map(share => ({
      id: share.id,
      sharedAt: share.createdAt,
      post: {
        id: share.post.id,
        content: share.post.content,
        contentType: share.post.contentType,
        mediaUrls: JSON.parse(share.post.mediaUrls || '[]'),
        visibility: share.post.visibility,
        isPromoted: share.post.isPromoted,
        createdAt: share.post.createdAt,
        updatedAt: share.post.updatedAt,
        author: share.post.author,
        stats: {
          likes: share.post._count.likes,
          comments: share.post._count.comments,
          shares: share.post._count.shares
        }
      }
    }))

    await prisma.$disconnect()

    return NextResponse.json({
      success: true,
      shares: formattedShares
    })

  } catch (error: any) {
    console.error('[User Shares] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shared posts', details: error.message },
      { status: 500 }
    )
  }
}