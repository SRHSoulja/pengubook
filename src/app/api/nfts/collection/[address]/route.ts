import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { ethers } from 'ethers'

const ABSTRACT_RPC_URL = process.env.ABSTRACT_RPC_URL || 'https://api.mainnet.abs.xyz'

interface NFTWithMetadata {
  contractAddress: string
  tokenId: string
  name?: string
  imageUrl?: string
  animationUrl?: string
  mediaType?: 'image' | 'video' | 'audio' | 'model' | 'html'
  metadata?: any
}

function detectMediaType(url: string): 'image' | 'video' | 'audio' | 'model' | 'html' {
  const lower = url.toLowerCase()
  if (lower.match(/\.(mp4|webm|mov|avi|mkv|m4v)$/)) return 'video'
  if (lower.match(/\.(mp3|wav|ogg|m4a|flac)$/)) return 'audio'
  if (lower.match(/\.(glb|gltf|obj|fbx|usdz)$/)) return 'model'
  if (lower.match(/\.(html|htm)$/)) return 'html'
  return 'image'
}

function normalizeUrl(url: string): string {
  if (!url) return ''
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/')
  }
  if (url.startsWith('ar://')) {
    return url.replace('ar://', 'https://arweave.net/')
  }
  return url
}

async function fetchTokenMetadata(tokenURI: string): Promise<any> {
  try {
    tokenURI = normalizeUrl(tokenURI)

    const response = await fetch(tokenURI, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'application/json' }
    })

    if (!response.ok) return null

    const metadata = await response.json()

    let imageUrl = metadata.image || metadata.image_url || metadata.imageUrl
    imageUrl = normalizeUrl(imageUrl)

    let animationUrl = metadata.animation_url || metadata.animationUrl
    animationUrl = normalizeUrl(animationUrl)

    let mediaType: any = 'image'
    if (animationUrl) {
      mediaType = detectMediaType(animationUrl)
    } else if (imageUrl) {
      mediaType = detectMediaType(imageUrl)
    }

    return {
      name: metadata.name,
      description: metadata.description,
      image: imageUrl,
      animation_url: animationUrl,
      external_url: metadata.external_url,
      attributes: metadata.attributes,
      media_type: mediaType
    }
  } catch (error) {
    console.error('Error fetching metadata:', error)
    return null
  }
}

async function getTokenURI(contractAddress: string, tokenId: string): Promise<string | null> {
  try {
    const tokenURISignature = '0xc87b56dd'
    const paddedTokenId = BigInt(tokenId).toString(16).padStart(64, '0')

    const response = await fetch(ABSTRACT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: contractAddress, data: tokenURISignature + paddedTokenId }, 'latest']
      })
    })

    const data = await response.json()
    if (data.result && data.result !== '0x') {
      const hex = data.result.slice(2)
      // Try to decode as ABI-encoded string (skip first 64 bytes for offset/length)
      let uri = ''
      try {
        // If it's ABI encoded, skip offset (32 bytes) and length (32 bytes)
        if (hex.length > 128) {
          const dataHex = hex.slice(128)
          uri = Buffer.from(dataHex, 'hex').toString('utf8').replace(/\0/g, '').trim()
        } else {
          uri = Buffer.from(hex, 'hex').toString('utf8').replace(/\0/g, '').trim()
        }
      } catch (e) {
        uri = Buffer.from(hex, 'hex').toString('utf8').replace(/\0/g, '').trim()
      }
      return uri
    }
    return null
  } catch (error) {
    console.error('Error getting tokenURI:', error)
    return null
  }
}

// GET /api/nfts/collection/[address]?tokenIds=1,2,3
export async function GET(
  request: NextRequest,
  { params }: { params: { address: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const tokenIdsParam = searchParams.get('tokenIds')

    if (!tokenIdsParam) {
      return NextResponse.json({ error: 'tokenIds parameter required' }, { status: 400 })
    }

    const contractAddress = params.address
    if (!ethers.isAddress(contractAddress)) {
      return NextResponse.json({ error: 'Invalid contract address' }, { status: 400 })
    }

    const tokenIds = tokenIdsParam.split(',').filter(id => id.trim())

    const nftsWithMetadata: NFTWithMetadata[] = []

    // Fetch metadata for each token ID
    for (const tokenId of tokenIds) {
      try {
        const tokenURI = await getTokenURI(contractAddress, tokenId.trim())

        const nft: NFTWithMetadata = {
          contractAddress,
          tokenId: tokenId.trim()
        }

        if (tokenURI) {
          const metadata = await fetchTokenMetadata(tokenURI)
          if (metadata) {
            nft.name = metadata.name
            nft.imageUrl = metadata.image
            nft.animationUrl = metadata.animation_url
            nft.mediaType = metadata.media_type
            nft.metadata = metadata
          }
        }

        nftsWithMetadata.push(nft)
      } catch (error) {
        console.error(`Error fetching metadata for ${contractAddress}:${tokenId}`, error)
        // Still add the NFT without metadata
        nftsWithMetadata.push({
          contractAddress,
          tokenId: tokenId.trim()
        })
      }
    }

    return NextResponse.json({ nfts: nftsWithMetadata })

  } catch (error) {
    console.error('Error fetching collection metadata:', error)
    return NextResponse.json(
      { error: 'Failed to fetch collection metadata' },
      { status: 500 }
    )
  }
}
