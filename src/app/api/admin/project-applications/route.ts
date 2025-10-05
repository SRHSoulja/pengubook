import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const adminWallet = request.headers.get('x-wallet-address')

    if (!adminWallet) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin
    const admin = await prisma.user.findFirst({
      where: {
        walletAddress: adminWallet.toLowerCase(),
        isAdmin: true
      }
    })

    if (!admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Fetch all project applications
    const applications = await prisma.projectApplication.findMany({
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            walletAddress: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // PENDING first
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({
      success: true,
      applications
    })
  } catch (error) {
    console.error('Fetch project applications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}
