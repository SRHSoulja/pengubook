import { ethers, Contract } from 'ethers'
import { RpcConfig } from './rpc'

// ERC20 ABI (minimum required functions)
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
]

// ERC721 ABI (minimum required functions)
const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function symbol() view returns (string)'
]

// ERC1155 ABI (minimum required functions)
const ERC1155_ABI = [
  'function balanceOf(address account, uint256 id) view returns (uint256)',
  'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])'
]

interface TokenGateConfig {
  tokenGateType: 'ERC20' | 'ERC721' | 'ERC1155'
  tokenContractAddress: string
  tokenMinAmount?: string
  tokenIds?: string[]
  tokenDecimals?: number
}

interface TokenVerificationResult {
  hasAccess: boolean
  userBalance?: string
  ownedTokenIds?: string[]
  error?: string
}

export class TokenGatingService {
  private provider: ethers.Provider | null = null
  private networkName: string

  constructor(networkName?: string) {
    this.networkName = networkName || 'abstract_mainnet'
    this.initializeProvider()
  }

  /**
   * Initialize provider with fallback support
   */
  private async initializeProvider() {
    try {
      const rpcUrl = await RpcConfig.getWorkingRpcUrl(this.networkName)
      this.provider = new ethers.JsonRpcProvider(rpcUrl)

      // Test the connection
      await this.provider.getBlockNumber()
      console.log(`Token gating service initialized with RPC: ${rpcUrl}`)
    } catch (error) {
      console.error('Failed to initialize token gating provider:', error)

      // Fallback to default configuration
      try {
        const fallbackUrl = RpcConfig.getRpcUrl(this.networkName)
        this.provider = new ethers.JsonRpcProvider(fallbackUrl)
        console.warn(`Using fallback RPC: ${fallbackUrl}`)
      } catch (fallbackError) {
        console.error('Fallback RPC also failed:', fallbackError)
        throw new Error('Unable to connect to any RPC endpoint')
      }
    }
  }

  async verifyTokenAccess(
    userWalletAddress: string,
    gateConfig: TokenGateConfig
  ): Promise<TokenVerificationResult> {
    try {
      // Validate contract address format
      if (!RpcConfig.validateContractAddress(gateConfig.tokenContractAddress)) {
        return { hasAccess: false, error: 'Invalid contract address format' }
      }

      // Ensure provider is ready
      if (!this.provider) {
        await this.initializeProvider()
      }

      switch (gateConfig.tokenGateType) {
        case 'ERC20':
          return await this.verifyERC20Access(userWalletAddress, gateConfig)
        case 'ERC721':
          return await this.verifyERC721Access(userWalletAddress, gateConfig)
        case 'ERC1155':
          return await this.verifyERC1155Access(userWalletAddress, gateConfig)
        default:
          return { hasAccess: false, error: 'Invalid token gate type' }
      }
    } catch (error) {
      console.error('Error verifying token access:', error)

      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('network')) {
          return { hasAccess: false, error: 'Network connection error. Please try again.' }
        }
        if (error.message.includes('contract')) {
          return { hasAccess: false, error: 'Invalid contract address or contract not found.' }
        }
        return { hasAccess: false, error: error.message }
      }

      return {
        hasAccess: false,
        error: 'Unknown error occurred while verifying token access'
      }
    }
  }

  private async verifyERC20Access(
    userWalletAddress: string,
    gateConfig: TokenGateConfig
  ): Promise<TokenVerificationResult> {
    const contract = new Contract(gateConfig.tokenContractAddress, ERC20_ABI, this.provider)

    try {
      const balance = await contract.balanceOf(userWalletAddress)
      const decimals = gateConfig.tokenDecimals || await contract.decimals()

      const userBalanceFormatted = ethers.formatUnits(balance, decimals)
      const requiredAmount = gateConfig.tokenMinAmount || '0'

      const hasAccess = parseFloat(userBalanceFormatted) >= parseFloat(requiredAmount)

      return {
        hasAccess,
        userBalance: userBalanceFormatted
      }
    } catch (error) {
      throw new Error(`Failed to verify ERC20 balance: ${error}`)
    }
  }

  private async verifyERC721Access(
    userWalletAddress: string,
    gateConfig: TokenGateConfig
  ): Promise<TokenVerificationResult> {
    const contract = new Contract(gateConfig.tokenContractAddress, ERC721_ABI, this.provider)

    try {
      const balance = await contract.balanceOf(userWalletAddress)
      const userBalance = balance.toString()

      // If specific token IDs are required
      if (gateConfig.tokenIds && gateConfig.tokenIds.length > 0) {
        const ownedTokenIds: string[] = []

        // Check if user owns any of the required token IDs
        for (const tokenId of gateConfig.tokenIds) {
          try {
            const owner = await contract.ownerOf(tokenId)
            if (owner.toLowerCase() === userWalletAddress.toLowerCase()) {
              ownedTokenIds.push(tokenId)
            }
          } catch (error) {
            // Token might not exist or other error, continue checking
            console.warn(`Error checking ownership of token ${tokenId}:`, error)
          }
        }

        return {
          hasAccess: ownedTokenIds.length > 0,
          userBalance,
          ownedTokenIds
        }
      } else {
        // Just check if user owns any NFT from this collection
        const requiredAmount = gateConfig.tokenMinAmount || '1'
        const hasAccess = parseInt(userBalance) >= parseInt(requiredAmount)

        return {
          hasAccess,
          userBalance
        }
      }
    } catch (error) {
      throw new Error(`Failed to verify ERC721 ownership: ${error}`)
    }
  }

  private async verifyERC1155Access(
    userWalletAddress: string,
    gateConfig: TokenGateConfig
  ): Promise<TokenVerificationResult> {
    const contract = new Contract(gateConfig.tokenContractAddress, ERC1155_ABI, this.provider)

    try {
      if (!gateConfig.tokenIds || gateConfig.tokenIds.length === 0) {
        throw new Error('Token IDs are required for ERC1155 gating')
      }

      const requiredAmount = gateConfig.tokenMinAmount || '1'
      const ownedTokenIds: string[] = []
      let totalBalance = 0

      // Check balance for each token ID
      for (const tokenId of gateConfig.tokenIds) {
        try {
          const balance = await contract.balanceOf(userWalletAddress, tokenId)
          const balanceNum = parseInt(balance.toString())

          if (balanceNum >= parseInt(requiredAmount)) {
            ownedTokenIds.push(tokenId)
            totalBalance += balanceNum
          }
        } catch (error) {
          console.warn(`Error checking balance for token ${tokenId}:`, error)
        }
      }

      return {
        hasAccess: ownedTokenIds.length > 0,
        userBalance: totalBalance.toString(),
        ownedTokenIds
      }
    } catch (error) {
      throw new Error(`Failed to verify ERC1155 balance: ${error}`)
    }
  }

  async getTokenMetadata(
    contractAddress: string,
    tokenType: 'ERC20' | 'ERC721' | 'ERC1155'
  ): Promise<{ symbol: string; decimals?: number }> {
    try {
      let abi = ERC20_ABI
      if (tokenType === 'ERC721') abi = ERC721_ABI
      if (tokenType === 'ERC1155') abi = ERC1155_ABI

      const contract = new Contract(contractAddress, abi, this.provider)

      const symbol = await contract.symbol()
      let decimals: number | undefined

      if (tokenType === 'ERC20') {
        decimals = await contract.decimals()
      }

      return { symbol, decimals }
    } catch (error) {
      throw new Error(`Failed to get token metadata: ${error}`)
    }
  }

  async validateContractAddress(
    contractAddress: string,
    expectedType: 'ERC20' | 'ERC721' | 'ERC1155'
  ): Promise<boolean> {
    try {
      // Basic address validation
      if (!ethers.isAddress(contractAddress)) {
        return false
      }

      // Additional validation using RPC config
      if (!RpcConfig.validateContractAddress(contractAddress)) {
        return false
      }

      // Ensure provider is ready
      if (!this.provider) {
        await this.initializeProvider()
      }

      if (!this.provider) {
        throw new Error('Failed to initialize provider')
      }

      // Check if address contains contract code
      const code = await this.provider.getCode(contractAddress)
      if (code === '0x') {
        return false // No contract at this address
      }

      // Try to call type-specific functions to validate contract type
      const metadata = await this.getTokenMetadata(contractAddress, expectedType)
      return !!metadata.symbol
    } catch (error) {
      console.error('Contract validation error:', error)
      return false
    }
  }
}

// Export singleton instance
export const tokenGatingService = new TokenGatingService()

// Helper function for API routes
export async function checkTokenGateAccess(
  userWalletAddress: string,
  community: {
    isTokenGated: boolean
    tokenGateType?: string | null
    tokenContractAddress?: string | null
    tokenMinAmount?: string | null
    tokenIds?: string | null
    tokenDecimals?: number | null
  }
): Promise<{ hasAccess: boolean; error?: string; details?: any }> {
  // If not token gated, allow access
  if (!community.isTokenGated) {
    return { hasAccess: true }
  }

  // Validate required fields
  if (!community.tokenGateType || !community.tokenContractAddress) {
    return { hasAccess: false, error: 'Invalid token gate configuration' }
  }

  try {
    const gateConfig: TokenGateConfig = {
      tokenGateType: community.tokenGateType as 'ERC20' | 'ERC721' | 'ERC1155',
      tokenContractAddress: community.tokenContractAddress,
      tokenMinAmount: community.tokenMinAmount || undefined,
      tokenIds: community.tokenIds ? JSON.parse(community.tokenIds) : undefined,
      tokenDecimals: community.tokenDecimals || undefined
    }

    const result = await tokenGatingService.verifyTokenAccess(userWalletAddress, gateConfig)

    return {
      hasAccess: result.hasAccess,
      error: result.error,
      details: {
        userBalance: result.userBalance,
        ownedTokenIds: result.ownedTokenIds
      }
    }
  } catch (error) {
    return {
      hasAccess: false,
      error: error instanceof Error ? error.message : 'Token verification failed'
    }
  }
}