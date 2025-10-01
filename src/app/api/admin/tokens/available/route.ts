import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

export const dynamic = 'force-dynamic'

// GET - Get all unique tokens from user wallets that aren't verified or blacklisted
export async function GET(request: NextRequest) {
  try {
    const prisma = new PrismaClient()

    // Get all verified token addresses
    const verifiedTokens = await prisma.verifiedToken.findMany({
      select: { tokenAddress: true }
    })
    const verifiedSet = new Set(verifiedTokens.map(t => t.tokenAddress.toLowerCase()))

    // Get all blacklisted token addresses
    const blacklistedTokens = await prisma.blacklistedToken.findMany({
      select: { tokenAddress: true }
    })
    const blacklistSet = new Set(blacklistedTokens.map(t => t.tokenAddress.toLowerCase()))

    // Get discovered tokens (cached from wallet scans)
    const discoveredTokens = await prisma.discoveredToken.findMany({
      orderBy: [
        { seenCount: 'desc' },
        { lastSeenAt: 'desc' }
      ],
      take: 100 // Limit to top 100 most common tokens
    })

    // Filter out verified and blacklisted tokens
    const availableTokens = discoveredTokens
      .filter(token => {
        const addr = token.tokenAddress.toLowerCase()
        return !verifiedSet.has(addr) && !blacklistSet.has(addr)
      })
      .map(token => ({
        tokenAddress: token.tokenAddress,
        symbol: token.symbol,
        name: token.name,
        seenCount: token.seenCount,
        lastSeen: token.lastSeenAt
      }))

    await prisma.$disconnect()
    return NextResponse.json(availableTokens)
  } catch (error) {
    console.error('Error fetching available tokens:', error)
    return NextResponse.json({ error: 'Failed to fetch available tokens' }, { status: 500 })
  }
}
