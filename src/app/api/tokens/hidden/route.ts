import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Get user's hidden tokens
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 })
    }

    const hiddenTokens = await prisma.hiddenToken.findMany({
      where: { userId },
      select: {
        tokenAddress: true,
        symbol: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(hiddenTokens)
  } catch (error) {
    console.error('Error fetching hidden tokens:', error)
    return NextResponse.json({ error: 'Failed to fetch hidden tokens' }, { status: 500 })
  }
}

// POST - Hide a token
export async function POST(request: NextRequest) {
  try {
    const { userId, tokenAddress, symbol } = await request.json()

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

    const hiddenToken = await prisma.hiddenToken.create({
      data: {
        userId: userId,
        tokenAddress: tokenAddress.toLowerCase(),
        symbol: symbol || null
      }
    })

    return NextResponse.json(hiddenToken)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Token already hidden' }, { status: 409 })
    }
    console.error('Error hiding token:', error)
    return NextResponse.json({ error: 'Failed to hide token' }, { status: 500 })
  }
}

// DELETE - Unhide a token
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const tokenAddress = searchParams.get('address')
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 })
    }

    if (!tokenAddress) {
      return NextResponse.json({ error: 'Token address is required' }, { status: 400 })
    }

    await prisma.hiddenToken.deleteMany({
      where: {
        userId: userId,
        tokenAddress: tokenAddress.toLowerCase()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unhiding token:', error)
    return NextResponse.json({ error: 'Failed to unhide token' }, { status: 500 })
  }
}
