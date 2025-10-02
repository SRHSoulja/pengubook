import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - Get all verified tokens
export async function GET(request: NextRequest) {
  try {
    

    const verifiedTokens = await prisma.verifiedToken.findMany({
      orderBy: { verifiedAt: 'desc' }
    })

    return NextResponse.json(verifiedTokens)
  } catch (error) {
    console.error('Error fetching verified tokens:', error)
    return NextResponse.json({ error: 'Failed to fetch verified tokens' }, { status: 500 })
  }
}

// POST - Verify a token (admin only)
export async function POST(request: NextRequest) {
  try {
    
    const { tokenAddress, symbol, name, userId } = await request.json()

    if (!tokenAddress) {
      return NextResponse.json({ error: 'Token address is required' }, { status: 400 })
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      return NextResponse.json({ error: 'Invalid token address format' }, { status: 400 })
    }

    // Check if already verified
    const existing = await prisma.verifiedToken.findUnique({
      where: { tokenAddress: tokenAddress.toLowerCase() }
    })

    if (existing) {
      return NextResponse.json({ error: 'Token already verified' }, { status: 409 })
    }

    // Create verified entry
    const verifiedToken = await prisma.verifiedToken.create({
      data: {
        tokenAddress: tokenAddress.toLowerCase(),
        symbol: symbol || null,
        name: name || null,
        verifiedBy: userId || null
      }
    })

    return NextResponse.json(verifiedToken)
  } catch (error) {
    console.error('Error verifying token:', error)
    return NextResponse.json({ error: 'Failed to verify token' }, { status: 500 })
  }
}

// DELETE - Remove verification from a token
export async function DELETE(request: NextRequest) {
  try {
    
    const { searchParams } = new URL(request.url)
    const tokenAddress = searchParams.get('address')

    if (!tokenAddress) {
      return NextResponse.json({ error: 'Token address is required' }, { status: 400 })
    }

    await prisma.verifiedToken.delete({
      where: { tokenAddress: tokenAddress.toLowerCase() }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Token not found in verified list' }, { status: 404 })
    }
    console.error('Error removing token verification:', error)
    return NextResponse.json({ error: 'Failed to remove verification' }, { status: 500 })
  }
}
