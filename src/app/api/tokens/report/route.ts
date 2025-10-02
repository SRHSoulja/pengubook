import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { prisma } from '@/lib/prisma'

// POST - Report a scam token
export async function POST(request: NextRequest) {
  try {
    const { userId, tokenAddress, symbol, name, reason, description } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 })
    }

    if (!tokenAddress) {
      return NextResponse.json({ error: 'Token address is required' }, { status: 400 })
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      return NextResponse.json({ error: 'Invalid token address format' }, { status: 400 })
    }

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    // Create the report
    const report = await prisma.tokenReport.create({
      data: {
        reporterId: userId,
        tokenAddress: tokenAddress.toLowerCase(),
        symbol: symbol || null,
        name: name || null,
        reason,
        description: description || null,
        status: 'PENDING'
      }
    })

    // Also hide the token for the user
    try {
      await prisma.hiddenToken.create({
        data: {
          userId: userId,
          tokenAddress: tokenAddress.toLowerCase(),
          symbol: symbol || null
        }
      })
    } catch (error: any) {
      // Ignore if already hidden
      if (error.code !== 'P2002') {
        console.error('Error hiding token after report:', error)
      }
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error reporting token:', error)
    return NextResponse.json({ error: 'Failed to report token' }, { status: 500 })
  }
}

// GET - Get user's token reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 })
    }

    const reports = await prisma.tokenReport.findMany({
      where: { reporterId: userId },
      select: {
        id: true,
        tokenAddress: true,
        symbol: true,
        name: true,
        reason: true,
        description: true,
        status: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching token reports:', error)
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 })
  }
}
