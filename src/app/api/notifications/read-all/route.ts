import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    const walletAddress = request.headers.get('x-wallet-address')
    const userId = request.headers.get('x-user-id')

    // Find user
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

    // Mark all notifications as read
    await prisma.notification.updateMany({
      where: {
        recipientId: user.id,
        read: false
      },
      data: { read: true }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error)
    return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 })
  }
}
