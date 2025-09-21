/**
 * RPC Configuration for Abstract Global Wallet and other networks
 */

export interface NetworkConfig {
  name: string
  chainId: number
  rpcUrl: string
  blockExplorer: string
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
}

/**
 * Supported networks configuration
 */
export const NETWORKS: Record<string, NetworkConfig> = {
  abstract_mainnet: {
    name: 'Abstract Mainnet',
    chainId: 11124, // Abstract Mainnet chain ID
    rpcUrl: 'https://api.abs.xyz', // Keep original working RPC
    blockExplorer: 'https://explorer.abs.xyz',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    }
  },
  ethereum_mainnet: {
    name: 'Ethereum Mainnet',
    chainId: 1,
    rpcUrl: 'https://eth.llamarpc.com',
    blockExplorer: 'https://etherscan.io',
    nativeCurrency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    }
  },
  polygon_mainnet: {
    name: 'Polygon',
    chainId: 137,
    rpcUrl: 'https://polygon.llamarpc.com',
    blockExplorer: 'https://polygonscan.com',
    nativeCurrency: {
      name: 'MATIC',
      symbol: 'MATIC',
      decimals: 18
    }
  }
}

/**
 * Get RPC configuration based on environment and preferences
 */
export class RpcConfig {
  /**
   * Get the default network for the current environment
   */
  static getDefaultNetwork(): NetworkConfig {
    return NETWORKS['abstract_mainnet']
  }

  /**
   * Get RPC URL with fallbacks
   */
  static getRpcUrl(networkName?: string): string {
    // Use custom RPC URL if provided
    if (process.env.ABSTRACT_RPC_URL) {
      return process.env.ABSTRACT_RPC_URL
    }

    // Use specific network RPC URLs from environment
    if (process.env.ABSTRACT_MAINNET_RPC && networkName === 'abstract_mainnet') {
      return process.env.ABSTRACT_MAINNET_RPC
    }

    // Fall back to default network configuration
    const network = networkName ? NETWORKS[networkName] : this.getDefaultNetwork()

    if (!network) {
      throw new Error(`Unsupported network: ${networkName}`)
    }

    return network.rpcUrl
  }

  /**
   * Get all available RPC URLs for redundancy
   */
  static getRpcUrls(networkName?: string): string[] {
    const network = networkName ? NETWORKS[networkName] : this.getDefaultNetwork()

    if (!network) {
      throw new Error(`Unsupported network: ${networkName}`)
    }

    const urls = [network.rpcUrl]

    // Keep the working RPC as-is for Abstract
    // The testing may fail but the RPC works for actual operations

    // Add environment-specific URLs
    if (networkName === 'abstract_mainnet' && process.env.ABSTRACT_MAINNET_RPC) {
      urls.unshift(process.env.ABSTRACT_MAINNET_RPC)
    }

    // Add custom RPC URL if provided
    if (process.env.ABSTRACT_RPC_URL) {
      urls.unshift(process.env.ABSTRACT_RPC_URL)
    }

    return Array.from(new Set(urls)) // Remove duplicates
  }

  /**
   * Test RPC connectivity
   */
  static async testRpcConnection(rpcUrl: string): Promise<boolean> {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      })

      const data = await response.json()
      return !!(data.result)
    } catch (error) {
      console.warn(`RPC connection test failed for ${rpcUrl}:`, error)
      return false
    }
  }

  /**
   * Get first working RPC URL from a list
   */
  static async getWorkingRpcUrl(networkName?: string): Promise<string> {
    const urls = this.getRpcUrls(networkName)

    for (const url of urls) {
      const isWorking = await this.testRpcConnection(url)
      if (isWorking) {
        return url
      }
    }

    throw new Error(`No working RPC URLs found for network: ${networkName || 'default'}`)
  }

  /**
   * Get network configuration by chain ID
   */
  static getNetworkByChainId(chainId: number): NetworkConfig | null {
    return Object.values(NETWORKS).find(network => network.chainId === chainId) || null
  }

  /**
   * Validate if a contract address is valid for the given network
   */
  static validateContractAddress(address: string, chainId?: number): boolean {
    // Basic Ethereum address validation
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return false
    }

    // Additional validation based on chain ID if needed
    if (chainId) {
      const network = this.getNetworkByChainId(chainId)
      if (!network) {
        console.warn(`Unknown chain ID: ${chainId}`)
        return false
      }
    }

    return true
  }
}