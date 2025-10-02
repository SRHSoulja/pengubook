import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Get all blacklisted tokens
export async function GET(request: NextRequest) {
  try {
    

    const blacklistedTokens = await prisma.blacklistedToken.findMany({
      orderBy: { blacklistedAt: 'desc' }
    })

    return NextResponse.json(blacklistedTokens)
  } catch (error) {
    console.error('Error fetching blacklisted tokens:', error)
    return NextResponse.json({ error: 'Failed to fetch blacklisted tokens' }, { status: 500 })
  }
}

// POST - Blacklist a token
export async function POST(request: NextRequest) {
  try {
    
    const { tokenAddress, symbol, name, reason, userId } = await request.json()

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

    // Check if already blacklisted
    const existing = await prisma.blacklistedToken.findUnique({
      where: { tokenAddress: tokenAddress.toLowerCase() }
    })

    if (existing) {
      return NextResponse.json({ error: 'Token already blacklisted' }, { status: 409 })
    }

    // Create blacklist entry
    const blacklistedToken = await prisma.blacklistedToken.create({
      data: {
        tokenAddress: tokenAddress.toLowerCase(),
        symbol: symbol || null,
        name: name || null,
        reason,
        blacklistedBy: userId || null,
        reportCount: 0
      }
    })

    // Update any related reports to BLACKLISTED status
    await prisma.tokenReport.updateMany({
      where: {
        tokenAddress: tokenAddress.toLowerCase(),
        status: 'PENDING'
      },
      data: {
        status: 'BLACKLISTED',
        reviewedAt: new Date(),
        reviewedBy: userId || null
      }
    })

    return NextResponse.json(blacklistedToken)
  } catch (error) {
    console.error('Error blacklisting token:', error)
    return NextResponse.json({ error: 'Failed to blacklist token' }, { status: 500 })
  }
}

// DELETE - Remove a token from blacklist
export async function DELETE(request: NextRequest) {
  try {
    
    const { searchParams } = new URL(request.url)
    const tokenAddress = searchParams.get('address')

    if (!tokenAddress) {
      return NextResponse.json({ error: 'Token address is required' }, { status: 400 })
    }

    await prisma.blacklistedToken.delete({
      where: { tokenAddress: tokenAddress.toLowerCase() }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Token not found in blacklist' }, { status: 404 })
    }
    console.error('Error removing token from blacklist:', error)
    return NextResponse.json({ error: 'Failed to remove from blacklist' }, { status: 500 })
  }
}
