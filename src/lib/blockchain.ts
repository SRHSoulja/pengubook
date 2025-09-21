// Blockchain integration utilities for Web3 features

import { logger } from './logger'

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
  chainId: parseInt(process.env.ABSTRACT_CHAIN_ID || '11124'),
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

      // TODO: Implement actual Web3 calls
      // Example using ethers.js:
      // const provider = new ethers.JsonRpcProvider(this.rpcUrl)
      // const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
      // const balance = await contract.balanceOf(walletAddress)
      // const decimals = await contract.decimals()
      // const symbol = await contract.symbol()

      // For now, return mock data
      logger.warn('Real blockchain service not implemented, using mock data', {}, 'Blockchain')
      return new MockBlockchainService().getTokenBalance(walletAddress, tokenAddress)

    } catch (error: any) {
      logger.error('Failed to get token balance', { error: error.message, walletAddress, tokenAddress }, 'Blockchain')
      return null
    }
  }

  async verifyTransaction(txHash: string): Promise<TransactionVerification | null> {
    try {
      logger.debug('Verifying transaction on blockchain', { txHash }, 'Blockchain')

      // TODO: Implement actual transaction verification
      // Example using ethers.js:
      // const provider = new ethers.JsonRpcProvider(this.rpcUrl)
      // const tx = await provider.getTransaction(txHash)
      // const receipt = await provider.getTransactionReceipt(txHash)

      // For now, return mock data
      logger.warn('Real blockchain service not implemented, using mock data', {}, 'Blockchain')
      return new MockBlockchainService().verifyTransaction(txHash)

    } catch (error: any) {
      logger.error('Failed to verify transaction', { error: error.message, txHash }, 'Blockchain')
      return null
    }
  }

  async getTokenInfo(tokenAddress: string): Promise<TokenInfo | null> {
    try {
      logger.debug('Getting token info from blockchain', { tokenAddress }, 'Blockchain')

      // TODO: Implement actual token info retrieval
      // For now, return mock data
      logger.warn('Real blockchain service not implemented, using mock data', {}, 'Blockchain')
      return new MockBlockchainService().getTokenInfo(tokenAddress)

    } catch (error: any) {
      logger.error('Failed to get token info', { error: error.message, tokenAddress }, 'Blockchain')
      return null
    }
  }

  async checkNFTOwnership(walletAddress: string, contractAddress: string, tokenId?: string): Promise<NFTOwnership[]> {
    try {
      logger.debug('Checking NFT ownership on blockchain', { walletAddress, contractAddress, tokenId }, 'Blockchain')

      // TODO: Implement actual NFT ownership check
      // For now, return mock data
      logger.warn('Real blockchain service not implemented, using mock data', {}, 'Blockchain')
      return new MockBlockchainService().checkNFTOwnership(walletAddress, contractAddress, tokenId)

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
export function formatTokenAmount(amount: string, decimals: number): string {
  const num = parseFloat(amount)
  const divisor = Math.pow(10, decimals)
  return (num / divisor).toFixed(6)
}

export function parseTokenAmount(amount: string, decimals: number): string {
  const num = parseFloat(amount)
  const multiplier = Math.pow(10, decimals)
  return (num * multiplier).toString()
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