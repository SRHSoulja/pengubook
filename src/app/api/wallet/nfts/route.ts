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

// Get NFT collections held by address using eth_getLogs
async function getNFTCollectionsFromLogs(address: string): Promise<Map<string, Set<string>>> {
  try {
    // ERC721 Transfer event signature: Transfer(address,address,uint256)
    const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const paddedAddress = '0x' + address.slice(2).padStart(64, '0').toLowerCase()

    // Map of contract address -> Set of token IDs
    const nftsByCollection = new Map<string, Set<string>>()

    console.log('[NFT Discovery] Scanning for NFT transfers to:', address)

    // Get INCOMING NFT transfers (NFTs received TO this address)
    const incomingResponse = await fetch(ABSTRACT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getLogs',
        params: [{
          fromBlock: '0x0',
          toBlock: 'latest',
          topics: [
            transferEventSignature,
            null, // from (any address)
            paddedAddress // to (our wallet)
          ]
        }]
      })
    })

    const incomingData = await incomingResponse.json()
    console.log(`[NFT Discovery] Incoming transfers: ${incomingData.result?.length || 0}`)

    if (incomingData.result && Array.isArray(incomingData.result)) {
      for (const log of incomingData.result) {
        // ERC721/ERC1155 Transfer events have 4 topics (signature, from, to, tokenId)
        // ERC20 Transfer events only have 3 topics (signature, from, to)
        // Filter for NFTs by checking for 4 topics
        if (log.topics && log.topics.length === 4 && log.address && log.topics[3]) {
          const contractAddress = log.address.toLowerCase()
          const tokenId = BigInt(log.topics[3]).toString()

          if (!nftsByCollection.has(contractAddress)) {
            nftsByCollection.set(contractAddress, new Set())
          }
          nftsByCollection.get(contractAddress)!.add(tokenId)
        }
      }
    }

    // Get OUTGOING NFT transfers (NFTs sent FROM this address) to remove from our list
    const outgoingResponse = await fetch(ABSTRACT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_getLogs',
        params: [{
          fromBlock: '0x0',
          toBlock: 'latest',
          topics: [
            transferEventSignature,
            paddedAddress, // from (our wallet)
            null // to (any address)
          ]
        }]
      })
    })

    const outgoingData = await outgoingResponse.json()
    console.log(`[NFT Discovery] Outgoing transfers: ${outgoingData.result?.length || 0}`)

    if (outgoingData.result && Array.isArray(outgoingData.result)) {
      for (const log of outgoingData.result) {
        // Only process NFT transfers (4 topics), skip ERC20 transfers (3 topics)
        if (log.topics && log.topics.length === 4 && log.address && log.topics[3]) {
          const contractAddress = log.address.toLowerCase()
          const tokenId = BigInt(log.topics[3]).toString()

          // Remove NFT from our collection if we sent it away
          if (nftsByCollection.has(contractAddress)) {
            nftsByCollection.get(contractAddress)!.delete(tokenId)
          }
        }
      }
    }

    // Remove empty collections
    const emptyCollections: string[] = []
    nftsByCollection.forEach((tokenIds, contractAddress) => {
      if (tokenIds.size === 0) {
        emptyCollections.push(contractAddress)
      }
    })
    emptyCollections.forEach(addr => nftsByCollection.delete(addr))

    console.log(`[NFT Discovery] Found ${nftsByCollection.size} collections with NFTs`)
    return nftsByCollection

  } catch (error) {
    console.error('Error fetching NFT list from logs:', error)
    return new Map()
  }
}

// Get NFT collection metadata
async function getCollectionMetadata(contractAddress: string): Promise<{ name: string; symbol: string; tokenType: 'ERC721' | 'ERC1155' }> {
  try {
    // name() function signature
    const nameSignature = '0x06fdde03'
    const nameResponse = await fetch(ABSTRACT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: contractAddress, data: nameSignature }, 'latest']
      })
    })

    // symbol() function signature
    const symbolSignature = '0x95d89b41'
    const symbolResponse = await fetch(ABSTRACT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_call',
        params: [{ to: contractAddress, data: symbolSignature }, 'latest']
      })
    })

    const [nameData, symbolData] = await Promise.all([nameResponse.json(), symbolResponse.json()])

    // Decode string responses (remove 0x, skip first 64 bytes for offset/length, decode hex)
    let name = 'Unknown Collection'
    let symbol = 'UNKNOWN'

    if (nameData.result && nameData.result !== '0x') {
      try {
        const hex = nameData.result.slice(2)
        const decoded = Buffer.from(hex, 'hex').toString('utf8').replace(/\0/g, '').trim()
        if (decoded) name = decoded
      } catch (e) {
        console.error('Error decoding name:', e)
      }
    }

    if (symbolData.result && symbolData.result !== '0x') {
      try {
        const hex = symbolData.result.slice(2)
        const decoded = Buffer.from(hex, 'hex').toString('utf8').replace(/\0/g, '').trim()
        if (decoded) symbol = decoded
      } catch (e) {
        console.error('Error decoding symbol:', e)
      }
    }

    // Detect token type (default to ERC721 if we found Transfer events with 3 topics)
    const tokenType = await detectNFTType(contractAddress, new ethers.JsonRpcProvider(ABSTRACT_RPC_URL)) || 'ERC721'

    return { name, symbol, tokenType }
  } catch (error) {
    console.error('Error getting collection metadata:', error)
    return { name: 'Unknown Collection', symbol: 'UNKNOWN', tokenType: 'ERC721' }
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

    // Scan blockchain for NFTs owned by this address
    const nftsByCollection = await getNFTCollectionsFromLogs(address)

    const collections: NFTCollection[] = []
    let totalNFTs = 0

    // Process each collection
    for (const contractAddress of Array.from(nftsByCollection.keys())) {
      const tokenIds = nftsByCollection.get(contractAddress)!

      // Skip blacklisted collections
      if (blacklistSet.has(contractAddress)) {
        console.log(`[NFT Discovery] Skipping blacklisted collection: ${contractAddress}`)
        continue
      }

      // Skip if entire collection is hidden
      if (hiddenSet.has(`${contractAddress}:collection`)) {
        console.log(`[NFT Discovery] Skipping hidden collection: ${contractAddress}`)
        continue
      }

      // Get or create collection metadata
      let collectionData = await prisma.nFTCollection.findUnique({
        where: { contractAddress }
      })

      if (!collectionData) {
        const metadata = await getCollectionMetadata(contractAddress)
        collectionData = await prisma.nFTCollection.create({
          data: {
            contractAddress,
            name: metadata.name,
            symbol: metadata.symbol,
            tokenType: metadata.tokenType
          }
        })
      }

      // Build NFT list for this collection
      const nfts: NFT[] = []
      Array.from(tokenIds).forEach((tokenId) => {
        // Skip individually hidden NFTs
        if (hiddenSet.has(`${contractAddress}:${tokenId}`)) {
          return
        }

        nfts.push({
          contractAddress,
          tokenId,
          tokenType: collectionData.tokenType as 'ERC721' | 'ERC1155',
          symbol: collectionData.symbol || undefined,
          collectionName: collectionData.name || undefined
        })
      })

      if (nfts.length > 0) {
        collections.push({
          contractAddress,
          name: collectionData.name || undefined,
          symbol: collectionData.symbol || undefined,
          tokenType: collectionData.tokenType as 'ERC721' | 'ERC1155',
          nfts,
          totalCount: nfts.length,
          isBlacklisted: collectionData.isBlacklisted,
          isVerified: collectionData.isVerified
        })

        totalNFTs += nfts.length
      }
    }

    console.log(`[NFT Discovery] Returning ${collections.length} collections with ${totalNFTs} total NFTs`)

    return NextResponse.json({
      walletAddress: address,
      collections,
      totalNFTs
    })

  } catch (error) {
    console.error('Error fetching NFTs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch NFTs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
