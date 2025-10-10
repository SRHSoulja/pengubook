import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { prisma } from '@/lib/prisma'

// GET - Get user's hidden NFTs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 })
    }

    const hiddenNFTs = await prisma.hiddenNFT.findMany({
      where: { userId },
      include: {
        collection: {
          select: {
            name: true,
            symbol: true,
            tokenType: true,
            logoUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(hiddenNFTs)
  } catch (error) {
    console.error('Error fetching hidden NFTs:', error)
    return NextResponse.json({ error: 'Failed to fetch hidden NFTs' }, { status: 500 })
  }
}

// POST - Hide an NFT or entire collection
export async function POST(request: NextRequest) {
  try {
    const { userId, contractAddress, tokenId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 })
    }

    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address is required' }, { status: 400 })
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
      return NextResponse.json({ error: 'Invalid contract address format' }, { status: 400 })
    }

    // Ensure collection exists in database
    const collection = await prisma.nFTCollection.upsert({
      where: { contractAddress: contractAddress.toLowerCase() },
      create: {
        contractAddress: contractAddress.toLowerCase(),
        tokenType: 'ERC721' // Default, will be updated when we fetch metadata
      },
      update: {}
    })

    // Hide the NFT
    const hiddenNFT = await prisma.hiddenNFT.create({
      data: {
        userId,
        contractAddress: contractAddress.toLowerCase(),
        tokenId: tokenId || null // null means hide entire collection
      }
    })

    return NextResponse.json(hiddenNFT)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'NFT already hidden' }, { status: 409 })
    }
    console.error('Error hiding NFT:', error)
    return NextResponse.json({ error: 'Failed to hide NFT' }, { status: 500 })
  }
}

// DELETE - Unhide an NFT
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contractAddress = searchParams.get('address')
    const tokenId = searchParams.get('tokenId')
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - User ID required' }, { status: 401 })
    }

    if (!contractAddress) {
      return NextResponse.json({ error: 'Contract address is required' }, { status: 400 })
    }

    await prisma.hiddenNFT.deleteMany({
      where: {
        userId,
        contractAddress: contractAddress.toLowerCase(),
        tokenId: tokenId || null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unhiding NFT:', error)
    return NextResponse.json({ error: 'Failed to unhide NFT' }, { status: 500 })
  }
}
