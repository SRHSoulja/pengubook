import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    const walletAddress = request.headers.get('x-wallet-address')
    const userId = request.headers.get('x-user-id')

    // Find user by session, wallet, or ID
    let user = null
    if (session?.user?.email) {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { discordId: session.user.email },
            { twitterId: session.user.email }
          ]
        }
      })
    }

    if (!user && walletAddress) {
      user = await prisma.user.findUnique({
        where: { walletAddress }
      })
    }

    if (!user && userId) {
      user = await prisma.user.findUnique({
        where: { id: userId }
      })
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch notifications for user
    const notifications = await prisma.notification.findMany({
      where: { toUserId: user.id },
      include: {
        fromUser: {
          select: {
            id: true,
            displayName: true,
            avatar: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    const unreadCount = await prisma.notification.count({
      where: {
        toUserId: user.id,
        isRead: false
      }
    })

    return NextResponse.json({
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        content: n.content,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        fromUser: n.fromUser
      })),
      unreadCount
    })
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
  }
}
