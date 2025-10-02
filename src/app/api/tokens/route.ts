import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth, withAdminAuth, withRateLimit } from '@/lib/auth-middleware'
import { logger, logAPI } from '@/lib/logger'
import { schemas } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// Get list of supported tokens
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const enabledOnly = searchParams.get('enabled') === 'true'

    logAPI.request('tokens', { enabledOnly })

    

    const tokens = await prisma.token.findMany({
      where: enabledOnly ? { isEnabled: true } : undefined,
      orderBy: [
        { symbol: 'asc' }
      ]
    })


    return NextResponse.json({
      success: true,
      tokens: tokens.map(token => ({
        id: token.id,
        name: token.name,
        symbol: token.symbol,
        contractAddress: token.contractAddress,
        decimals: token.decimals,
        isEnabled: token.isEnabled,
        logoUrl: token.logoUrl
      }))
    })

  } catch (error: any) {
    logAPI.error('tokens', error)
    return NextResponse.json(
      { error: 'Failed to fetch tokens', details: error.message },
      { status: 500 }
    )
  }
}

// Add new token (admin only)
export const POST = withRateLimit(10, 60 * 1000)(withAdminAuth(async (request: NextRequest, user: any) => {
  try {
    const body = await request.json()
    const { name, symbol, contractAddress, decimals, logoUrl } = body

    // Validate input
    if (!name || !symbol || !contractAddress || decimals === undefined) {
      return NextResponse.json(
        { error: 'Name, symbol, contract address, and decimals are required' },
        { status: 400 }
      )
    }

    // Validate contract address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return NextResponse.json(
        { error: 'Invalid contract address format' },
        { status: 400 }
      )
    }

    if (decimals < 0 || decimals > 18) {
      return NextResponse.json(
        { error: 'Decimals must be between 0 and 18' },
        { status: 400 }
      )
    }

    

    // Check if token already exists
    const existingToken = await prisma.token.findFirst({
      where: {
        OR: [
          { symbol: symbol.toUpperCase() },
          { contractAddress: contractAddress.toLowerCase() }
        ]
      }
    })

    if (existingToken) {
      return NextResponse.json(
        { error: 'Token with this symbol or contract address already exists' },
        { status: 409 }
      )
    }

    // Create token
    const newToken = await prisma.token.create({
      data: {
        name: name.trim(),
        symbol: symbol.toUpperCase().trim(),
        contractAddress: contractAddress.toLowerCase(),
        decimals: parseInt(decimals),
        logoUrl: logoUrl?.trim() || null,
        isEnabled: true
      }
    })


    logger.info(`Token added: ${newToken.symbol}`, {
      tokenId: newToken.id,
      addedBy: user.id
    }, 'TokenManagement')

    return NextResponse.json({
      success: true,
      token: {
        id: newToken.id,
        name: newToken.name,
        symbol: newToken.symbol,
        contractAddress: newToken.contractAddress,
        decimals: newToken.decimals,
        isEnabled: newToken.isEnabled,
        logoUrl: newToken.logoUrl
      }
    }, { status: 201 })

  } catch (error: any) {
    logAPI.error('tokens', error)
    return NextResponse.json(
      { error: 'Failed to add token', details: error.message },
      { status: 500 }
    )
  }
}))