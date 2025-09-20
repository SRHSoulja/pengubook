import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    // Initialize default tokens
    const defaultTokens = [
      {
        name: 'Ethereum',
        symbol: 'ETH',
        contractAddress: '0x0000000000000000000000000000000000000000',
        decimals: 18,
        logoUrl: '🔷',
        isEnabled: true
      },
      {
        name: 'Penguin Token',
        symbol: 'PENGU',
        contractAddress: '0x9eBe3A824Ca958e4b3Da772D2065518F009CBa62',
        decimals: 18,
        logoUrl: '🐧',
        isEnabled: true
      },
      {
        name: 'Jock Rock',
        symbol: 'JOCK',
        contractAddress: '0x3Bb6d7504d5c4B251799E5959f8336eAe6129Db1',
        decimals: 18,
        logoUrl: '🪨',
        isEnabled: true
      }
    ]

    for (const tokenData of defaultTokens) {
      // Check if token already exists
      const existingToken = await prisma.token.findUnique({
        where: { symbol: tokenData.symbol }
      })

      if (!existingToken) {
        await prisma.token.create({
          data: tokenData
        })
        console.log(`Created token: ${tokenData.name} (${tokenData.symbol})`)
      } else {
        console.log(`Token ${tokenData.symbol} already exists`)
      }
    }

    return NextResponse.json({
      message: 'Default tokens initialized successfully',
      tokens: defaultTokens.map(t => ({ name: t.name, symbol: t.symbol }))
    })

  } catch (error) {
    console.error('Failed to initialize tokens:', error)
    return NextResponse.json(
      { error: 'Failed to initialize tokens' },
      { status: 500 }
    )
  }
}