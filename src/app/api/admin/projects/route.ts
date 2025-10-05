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

    // Fetch all project accounts
    const projects = await prisma.user.findMany({
      where: {
        profile: {
          isProject: true
        }
      },
      include: {
        profile: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({
      success: true,
      projects
    })
  } catch (error) {
    console.error('Fetch projects error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}
