// Blockchain integration utilities for Web3 features

import { ethers } from 'ethers'
import { logger } from './logger'
import { formatWeiToDecimal, parseDecimalToWei } from './utils/decimal-conversion'

// ERC-20 Token ABI (minimal for balance, decimals, symbol)
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)'
]

// ERC-721 NFT ABI (minimal for ownership check)
const ERC721_ABI = [
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function tokenURI(uint256 tokenId) view returns (string)'
]

// Types for blockchain operations
export interface TokenBalance {
  tokenAddress: string
  balance: string
  decimals: number
  symbol: string
}

export interface TransactionVerification {
  exists: boolean
  isConfirmed: boolean
  from: string
  to: string
  value: string
  tokenAddress?: string
  blockNumber?: number
  gasUsed?: string
  timestamp?: number
  status: 'success' | 'failed' | 'pending'
}

export interface TokenInfo {
  name: string
  symbol: string
  decimals: number
  totalSupply: string
}

export interface NFTOwnership {
  contractAddress: string
  tokenId: string
  owner: string
  metadata?: {
    name: string
    description: string
    image: string
    attributes: any[]
  }
}

// Blockchain configuration
export const BLOCKCHAIN_CONFIG = {
  // Abstract testnet configuration
  rpcUrl: process.env.ABSTRACT_RPC_URL || 'https://api.testnet.abs.xyz',
  chainId: parseInt(process.env.ABSTRACT_CHAIN_ID || '2741'),
  explorerUrl: process.env.ABSTRACT_EXPLORER_URL || 'https://explorer.testnet.abs.xyz',

  // Supported token contracts
  supportedTokens: {
    ETH: {
      address: '0x0000000000000000000000000000000000000000', // Native ETH
      decimals: 18
    },
    USDC: {
      address: process.env.USDC_CONTRACT_ADDRESS || '0x',
      decimals: 6
    },
    PENGU: {
      address: process.env.PENGU_TOKEN_ADDRESS || '0x',
      decimals: 18
    }
  },

  // Community token gating contracts
  nftContracts: {
    PUDGY_PENGUINS: process.env.PUDGY_PENGUINS_CONTRACT || '0x',
    COMMUNITY_NFTS: process.env.COMMUNITY_NFTS_CONTRACT || '0x'
  }
}

// Mock blockchain service for development
class MockBlockchainService {
  async getTokenBalance(walletAddress: string, tokenAddress: string): Promise<TokenBalance | null> {
    logger.debug('Mock: Getting token balance', { walletAddress, tokenAddress }, 'Blockchain')

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500))

    // Return mock balance
    return {
      tokenAddress,
      balance: '100.0',
      decimals: 18,
      symbol: 'MOCK'
    }
  }

  async verifyTransaction(txHash: string): Promise<TransactionVerification | null> {
    logger.debug('Mock: Verifying transaction', { txHash }, 'Blockchain')

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000))

    // Mock verification result
    return {
      exists: true,
      isConfirmed: true,
      from: '0x1234567890123456789012345678901234567890',
      to: '0x0987654321098765432109876543210987654321',
      value: '1.0',
      blockNumber: 12345,
      gasUsed: '21000',
      timestamp: Math.floor(Date.now() / 1000),
      status: 'success'
    }
  }

  async getTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
    logger.debug('Mock: Getting token info', { tokenAddress }, 'Blockchain')

    return {
      name: 'Mock Token',
      symbol: 'MOCK',
      decimals: 18,
      totalSupply: '1000000.0'
    }
  }

  async checkNFTOwnership(walletAddress: string, contractAddress: string, tokenId?: string): Promise<NFTOwnership[]> {
    logger.debug('Mock: Checking NFT ownership', { walletAddress, contractAddress, tokenId }, 'Blockchain')

    // Mock NFT ownership
    return [{
      contractAddress,
      tokenId: tokenId || '1',
      owner: walletAddress,
      metadata: {
        name: 'Mock NFT #1',
        description: 'A mock NFT for testing',
        image: 'https://example.com/nft.png',
        attributes: [
          { trait_type: 'Rarity', value: 'Common' },
          { trait_type: 'Background', value: 'Blue' }
        ]
      }
    }]
  }
}

// Real blockchain service using Web3/ethers
class RealBlockchainService {
  private rpcUrl: string
  private chainId: number

  constructor() {
    this.rpcUrl = BLOCKCHAIN_CONFIG.rpcUrl
    this.chainId = BLOCKCHAIN_CONFIG.chainId
  }

  async getTokenBalance(walletAddress: string, tokenAddress: string): Promise<TokenBalance | null> {
    try {
      logger.debug('Getting token balance from blockchain', { walletAddress, tokenAddress }, 'Blockchain')

      const provider = new ethers.JsonRpcProvider(this.rpcUrl)

      // Handle native ETH balance
      if (tokenAddress === '0x0000000000000000000000000000000000000000' || tokenAddress === '0x') {
        const balance = await provider.getBalance(walletAddress)
        return {
          tokenAddress: '0x0000000000000000000000000000000000000000',
          balance: ethers.formatEther(balance),
          decimals: 18,
          symbol: 'ETH'
        }
      }

      // ERC-20 token balance
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
      const [balance, decimals, symbol] = await Promise.all([
        contract.balanceOf(walletAddress),
        contract.decimals(),
        contract.symbol()
      ])

      return {
        tokenAddress,
        balance: ethers.formatUnits(balance, decimals),
        decimals: Number(decimals),
        symbol: String(symbol)
      }

    } catch (error: any) {
      logger.error('Failed to get token balance', { error: error.message, walletAddress, tokenAddress }, 'Blockchain')
      return null
    }
  }

  async verifyTransaction(txHash: string): Promise<TransactionVerification | null> {
    try {
      logger.debug('Verifying transaction on blockchain', { txHash }, 'Blockchain')

      const provider = new ethers.JsonRpcProvider(this.rpcUrl)

      // Get transaction and receipt
      const [tx, receipt] = await Promise.all([
        provider.getTransaction(txHash),
        provider.getTransactionReceipt(txHash)
      ])

      if (!tx) {
        return {
          exists: false,
          isConfirmed: false,
          from: '',
          to: '',
          value: '0',
          status: 'pending'
        }
      }

      const block = receipt ? await provider.getBlock(receipt.blockNumber) : null

      return {
        exists: true,
        isConfirmed: !!receipt,
        from: tx.from,
        to: tx.to || '',
        value: ethers.formatEther(tx.value),
        blockNumber: receipt?.blockNumber,
        gasUsed: receipt?.gasUsed.toString(),
        timestamp: block?.timestamp,
        status: receipt ? (receipt.status === 1 ? 'success' : 'failed') : 'pending'
      }

    } catch (error: any) {
      logger.error('Failed to verify transaction', { error: error.message, txHash }, 'Blockchain')
      return null
    }
  }

  async getTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
    try {
      logger.debug('Getting token info from blockchain', { tokenAddress }, 'Blockchain')

      const provider = new ethers.JsonRpcProvider(this.rpcUrl)
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)

      const [name, symbol, decimals, totalSupply] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.decimals(),
        contract.totalSupply()
      ])

      return {
        name: String(name),
        symbol: String(symbol),
        decimals: Number(decimals),
        totalSupply: ethers.formatUnits(totalSupply, decimals)
      }

    } catch (error: any) {
      logger.error('Failed to get token info', { error: error.message, tokenAddress }, 'Blockchain')
      return null
    }
  }

  async checkNFTOwnership(walletAddress: string, contractAddress: string, tokenId?: string): Promise<NFTOwnership[]> {
    try {
      logger.debug('Checking NFT ownership on blockchain', { walletAddress, contractAddress, tokenId }, 'Blockchain')

      const provider = new ethers.JsonRpcProvider(this.rpcUrl)
      const contract = new ethers.Contract(contractAddress, ERC721_ABI, provider)

      // If specific tokenId provided, check ownership of that token
      if (tokenId) {
        try {
          const owner = await contract.ownerOf(tokenId)

          if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
            return [] // Not the owner
          }

          // Try to get metadata
          let metadata
          try {
            const tokenURI = await contract.tokenURI(tokenId)
            // Fetch metadata from URI (IPFS or HTTP)
            if (tokenURI.startsWith('ipfs://')) {
              const ipfsHash = tokenURI.replace('ipfs://', '')
              const metadataUrl = `https://ipfs.io/ipfs/${ipfsHash}`
              const response = await fetch(metadataUrl)
              metadata = await response.json()
            } else if (tokenURI.startsWith('http')) {
              const response = await fetch(tokenURI)
              metadata = await response.json()
            }
          } catch (metadataError) {
            logger.warn('Failed to fetch NFT metadata', { tokenId, contractAddress }, 'Blockchain')
          }

          return [{
            contractAddress,
            tokenId,
            owner: walletAddress,
            metadata
          }]
        } catch (ownerError) {
          return [] // Token doesn't exist or not owned
        }
      }

      // Get all NFTs owned by wallet
      const balance = await contract.balanceOf(walletAddress)
      const ownedNFTs: NFTOwnership[] = []

      // Get up to 10 NFTs (to avoid timeout on large collections)
      const maxToFetch = Math.min(Number(balance), 10)

      for (let i = 0; i < maxToFetch; i++) {
        try {
          const tokenIdBigInt = await contract.tokenOfOwnerByIndex(walletAddress, i)
          const tokenIdStr = tokenIdBigInt.toString()

          // Try to get metadata
          let metadata
          try {
            const tokenURI = await contract.tokenURI(tokenIdBigInt)
            if (tokenURI.startsWith('ipfs://')) {
              const ipfsHash = tokenURI.replace('ipfs://', '')
              const metadataUrl = `https://ipfs.io/ipfs/${ipfsHash}`
              const response = await fetch(metadataUrl, { signal: AbortSignal.timeout(5000) })
              metadata = await response.json()
            } else if (tokenURI.startsWith('http')) {
              const response = await fetch(tokenURI, { signal: AbortSignal.timeout(5000) })
              metadata = await response.json()
            }
          } catch (metadataError) {
            logger.warn('Failed to fetch NFT metadata', { tokenId: tokenIdStr, contractAddress }, 'Blockchain')
          }

          ownedNFTs.push({
            contractAddress,
            tokenId: tokenIdStr,
            owner: walletAddress,
            metadata
          })
        } catch (indexError) {
          logger.warn('Failed to get token at index', { index: i, contractAddress }, 'Blockchain')
        }
      }

      return ownedNFTs

    } catch (error: any) {
      logger.error('Failed to check NFT ownership', { error: error.message, walletAddress, contractAddress }, 'Blockchain')
      return []
    }
  }
}

// Export blockchain service instance
export const blockchainService = process.env.NODE_ENV === 'development'
  ? new MockBlockchainService()
  : new RealBlockchainService()

// Utility functions
/**
 * Format wei amount to decimal string with precision
 * @deprecated Use formatWeiToDecimal from decimal-conversion.ts instead
 */
export function formatTokenAmount(amount: string, decimals: number): string {
  try {
    // Convert string to BigInt and use safe formatting
    const weiAmount = BigInt(amount)
    return formatWeiToDecimal(weiAmount, decimals, 6)
  } catch {
    // Fallback for invalid input
    return '0'
  }
}

/**
 * Parse decimal amount to wei string
 * @deprecated Use parseDecimalToWei from decimal-conversion.ts instead
 */
export function parseTokenAmount(amount: string, decimals: number): string {
  try {
    // Use safe decimal to wei conversion
    const weiAmount = parseDecimalToWei(amount, decimals)
    return weiAmount.toString()
  } catch {
    // Fallback for invalid input
    return '0'
  }
}

export function getExplorerUrl(txHash: string): string {
  return `${BLOCKCHAIN_CONFIG.explorerUrl}/tx/${txHash}`
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

export function isValidTxHash(hash: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(hash)
}

// Token gating helpers
export async function checkTokenGateAccess(
  walletAddress: string,
  requirements: {
    tokenAddress: string
    minimumAmount: string
    tokenIds?: string[]
  }
): Promise<{ hasAccess: boolean; balance?: string; ownedTokens?: NFTOwnership[] }> {
  try {
    const { tokenAddress, minimumAmount, tokenIds } = requirements

    if (tokenIds && tokenIds.length > 0) {
      // NFT-based gating
      const ownedTokens = await blockchainService.checkNFTOwnership(walletAddress, tokenAddress)
      const hasRequiredTokens = tokenIds.some(tokenId =>
        ownedTokens.some(owned => owned.tokenId === tokenId)
      )

      return {
        hasAccess: hasRequiredTokens,
        ownedTokens
      }
    } else {
      // Token balance-based gating
      const balance = await blockchainService.getTokenBalance(walletAddress, tokenAddress)
      if (!balance) {
        return { hasAccess: false }
      }

      const hasEnoughTokens = parseFloat(balance.balance) >= parseFloat(minimumAmount)

      return {
        hasAccess: hasEnoughTokens,
        balance: balance.balance
      }
    }
  } catch (error: any) {
    logger.error('Token gate access check failed', { error: error.message, walletAddress, requirements }, 'TokenGating')
    return { hasAccess: false }
  }
}