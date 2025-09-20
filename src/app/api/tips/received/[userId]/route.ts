import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '10')

    const tips = await prisma.tip.findMany({
      where: {
        toUserId: params.userId,
        status: 'COMPLETED' // Only show completed tips
      },
      include: {
        token: {
          select: {
            symbol: true,
            logoUrl: true
          }
        },
        fromUser: {
          select: {
            username: true,
            displayName: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    return NextResponse.json({
      success: true,
      data: tips
    })
  } catch (error) {
    console.error('Error fetching tips:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tips' },
      { status: 500 }
    )
  }
}