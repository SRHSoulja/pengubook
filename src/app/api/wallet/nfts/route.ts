import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

import { ethers } from 'ethers'
import { prisma } from '@/lib/prisma'

const ABSTRACT_RPC_URL = process.env.ABSTRACT_RPC_URL || 'https://api.mainnet.abs.xyz'

// ERC721 ABI for NFT enumeration
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)'
]

// ERC1155 ABI
const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function uri(uint256 id) view returns (string)',
  'function supportsInterface(bytes4 interfaceId) view returns (bool)'
]

interface NFTMetadata {
  name?: string
  description?: string
  image?: string
  animation_url?: string
  external_url?: string
  attributes?: any[]
  media_type?: 'image' | 'video' | 'audio' | 'model' | 'html'
}

interface NFT {
  contractAddress: string
  tokenId: string
  tokenType: 'ERC721' | 'ERC1155'
  name?: string
  symbol?: string
  imageUrl?: string
  animationUrl?: string
  mediaType?: 'image' | 'video' | 'audio' | 'model' | 'html'
  metadata?: NFTMetadata
  collectionName?: string
  isHidden?: boolean
}

interface NFTCollection {
  contractAddress: string
  name?: string
  symbol?: string
  tokenType: 'ERC721' | 'ERC1155'
  nfts: NFT[]
  totalCount: number
  isBlacklisted: boolean
  isVerified: boolean
}

function detectMediaType(url: string): 'image' | 'video' | 'audio' | 'model' | 'html' {
  const lower = url.toLowerCase()

  // Video formats
  if (lower.match(/\.(mp4|webm|mov|avi|mkv|m4v)$/)) return 'video'

  // Audio formats
  if (lower.match(/\.(mp3|wav|ogg|m4a|flac)$/)) return 'audio'

  // 3D model formats
  if (lower.match(/\.(glb|gltf|obj|fbx|usdz)$/)) return 'model'

  // HTML/Interactive
  if (lower.match(/\.(html|htm)$/)) return 'html'

  // Default to image
  return 'image'
}

function normalizeUrl(url: string): string {
  if (!url) return ''

  // Handle IPFS URLs
  if (url.startsWith('ipfs://')) {
    return url.replace('ipfs://', 'https://ipfs.io/ipfs/')
  }

  // Handle ar:// (Arweave)
  if (url.startsWith('ar://')) {
    return url.replace('ar://', 'https://arweave.net/')
  }

  return url
}

async function fetchTokenMetadata(tokenURI: string): Promise<NFTMetadata | null> {
  try {
    // Normalize the URI
    tokenURI = normalizeUrl(tokenURI)

    const response = await fetch(tokenURI, {
      signal: AbortSignal.timeout(5000),
      headers: {
        'Accept': 'application/json'
      }
    })

    if (!response.ok) return null

    const metadata = await response.json()

    // Extract and normalize image URL
    let imageUrl = metadata.image || metadata.image_url || metadata.imageUrl
    imageUrl = normalizeUrl(imageUrl)

    // Extract and normalize animation URL
    let animationUrl = metadata.animation_url || metadata.animationUrl
    animationUrl = normalizeUrl(animationUrl)

    // Detect media type
    let mediaType: NFTMetadata['media_type'] = 'image'
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

async function detectNFTType(contractAddress: string, provider: ethers.Provider): Promise<'ERC721' | 'ERC1155' | null> {
  try {
    // ERC165 interface IDs
    const ERC721_INTERFACE_ID = '0x80ac58cd'
    const ERC1155_INTERFACE_ID = '0xd9b67a26'

    const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider)

    try {
      const isERC721 = await contract.supportsInterface(ERC721_INTERFACE_ID)
      if (isERC721) return 'ERC721'
    } catch (e) {
      // Continue to check ERC1155
    }

    const contract1155 = new ethers.Contract(contractAddress, ERC1155_ABI, provider)
    try {
      const isERC1155 = await contract1155.supportsInterface(ERC1155_INTERFACE_ID)
      if (isERC1155) return 'ERC1155'
    } catch (e) {
      // Not ERC1155
    }

    return null
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get('address')
    const userId = searchParams.get('userId')

    if (!address) {
      return NextResponse.json({ error: 'Wallet address required' }, { status: 400 })
    }

    // Validate address format
    if (!ethers.isAddress(address)) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 })
    }

    const provider = new ethers.JsonRpcProvider(ABSTRACT_RPC_URL)

    // Get hidden NFTs for this user
    const hiddenNFTs = userId ? await prisma.hiddenNFT.findMany({
      where: { userId },
      select: { contractAddress: true, tokenId: true }
    }) : []

    const hiddenSet = new Set(
      hiddenNFTs.map(h => `${h.contractAddress.toLowerCase()}:${h.tokenId || 'collection'}`)
    )

    // Get blacklisted collections
    const blacklistedCollections = await prisma.nFTCollection.findMany({
      where: { isBlacklisted: true },
      select: { contractAddress: true }
    })

    const blacklistSet = new Set(
      blacklistedCollections.map(c => c.contractAddress.toLowerCase())
    )

    // For now, we'll return a placeholder response
    // In production, you'd want to use an indexing service like Alchemy, Moralis, or The Graph
    // to efficiently fetch NFTs owned by the wallet

    const collections: NFTCollection[] = []

    // Get collection info from database
    const knownCollections = await prisma.nFTCollection.findMany({
      where: {
        contractAddress: { in: [] } // We'll populate this with discovered contracts
      }
    })

    return NextResponse.json({
      walletAddress: address,
      collections,
      totalNFTs: 0,
      message: 'NFT fetching requires integration with indexing service (Alchemy/Moralis/The Graph)'
    })

  } catch (error) {
    console.error('Error fetching NFTs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch NFTs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
