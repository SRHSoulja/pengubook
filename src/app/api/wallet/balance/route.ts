import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ABSTRACT_RPC_URL = 'https://api.mainnet.abs.xyz'
const DEXSCREENER_API = 'https://api.dexscreener.com'
const ABSCAN_API = 'https://api.abscan.org/api'

// Simple in-memory cache (5 minute TTL)
const cache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

// Common Abstract tokens to check
const COMMON_ABSTRACT_TOKENS = [
  {
    address: '0x84a71ccd554cc1b02749b35d22f684cc8ec987e1',
    symbol: 'USDC.e',
    name: 'Bridged USDC (Stargate)'
  },
  {
    address: '0xdf70075737e9f96b078ab4461eee3e055e061223',
    symbol: 'BIG',
    name: 'Bigcoin'
  },
  {
    address: '0x45f426ae8c1e647d544f6942784f759e5d3db089',
    symbol: 'PENGURU',
    name: 'PENGURU'
  },
  {
    address: '0x52629ddbf28aa01aa22b994ec9c80273e4eb5b0a',
    symbol: 'RETSBA',
    name: 'RETSBA'
  }
]

interface TokenBalance {
  token: string
  symbol: string
  name?: string
  balance: string
  decimals: number
  priceUsd?: number
  valueUsd?: number
  logoUrl?: string
  isVerified?: boolean
}

interface WalletBalanceResponse {
  walletAddress: string
  nativeBalance: {
    balance: string
    symbol: string
    priceUsd?: number
    valueUsd?: number
    logoUrl?: string
  }
  tokens: TokenBalance[]
  totalValueUsd: number
}

// Get ETH balance
async function getEthBalance(address: string): Promise<string> {
  const response = await fetch(ABSTRACT_RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_getBalance',
      params: [address, 'latest']
    })
  })

  const data = await response.json()
  if (data.error) {
    throw new Error(data.error.message)
  }

  // Convert from hex to decimal (wei)
  const weiBalance = BigInt(data.result)
  const ethBalance = Number(weiBalance) / 1e18
  return ethBalance.toFixed(6)
}

// Fallback logos for well-known tokens
const FALLBACK_LOGOS: Record<string, string> = {
  // USDC variants
  '0x84a71ccd554cc1b02749b35d22f684cc8ec987e1': 'https://assets.coingecko.com/coins/images/6319/small/usdc.png',
  // ETH
  '0x0000000000000000000000000000000000000000': 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
}

// Get token price and logo from DexScreener
async function getTokenInfo(tokenAddress: string): Promise<{ priceUsd?: number; logoUrl?: string }> {
  try {
    // Try using 'abstract' as chain ID for DexScreener
    const response = await fetch(`${DEXSCREENER_API}/latest/dex/tokens/${tokenAddress}`)
    const data = await response.json()

    if (data.pairs && data.pairs.length > 0) {
      // Filter pairs for Abstract chain specifically
      const abstractPairs = data.pairs.filter((p: any) =>
        p.chainId === 'abstract' || p.chainId === 'abstracttestnet'
      )

      // Use Abstract pairs if available, otherwise fall back to all pairs
      const pairsToConsider = abstractPairs.length > 0 ? abstractPairs : data.pairs

      // Sort by liquidity (highest first) to get the most accurate price
      const sortedPairs = pairsToConsider.sort((a: any, b: any) => {
        const aLiq = parseFloat(a.liquidity?.usd || '0')
        const bLiq = parseFloat(b.liquidity?.usd || '0')
        return bLiq - aLiq
      })

      const bestPair = sortedPairs[0]

      // Get the token info from the pair - check which side is our token
      const isToken0 = bestPair.baseToken?.address?.toLowerCase() === tokenAddress.toLowerCase()
      const tokenInfo = isToken0 ? bestPair.baseToken : bestPair.quoteToken

      // Try to get logo from DexScreener, then fall back to our hardcoded list
      const logoUrl = tokenInfo?.imageUrl || bestPair.info?.imageUrl || FALLBACK_LOGOS[tokenAddress.toLowerCase()]

      return {
        priceUsd: bestPair.priceUsd ? parseFloat(bestPair.priceUsd) : undefined,
        logoUrl: logoUrl
      }
    }
  } catch (error) {
    console.error('Error fetching token info:', error)
  }

  // If DexScreener fails, try fallback logo
  return {
    logoUrl: FALLBACK_LOGOS[tokenAddress.toLowerCase()]
  }
}

// Get all ERC-20 tokens held by address using eth_getLogs
async function getTokenListFromLogs(address: string): Promise<string[]> {
  try {
    const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const paddedAddress = '0x' + address.slice(2).padStart(64, '0').toLowerCase()

    const uniqueTokens = new Set<string>()

    // Get INCOMING transfers (tokens received TO this address) - scan from genesis
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
          topics: [transferEventSignature, null, paddedAddress]
        }]
      })
    })

    const incomingData = await incomingResponse.json()

    console.log(`[Token Discovery] Incoming logs: ${incomingData.result?.length || 0}`)

    if (incomingData.error) {
      console.error('[Token Discovery] RPC error:', JSON.stringify(incomingData.error))
    }

    // Process incoming transfers
    if (incomingData.result && Array.isArray(incomingData.result)) {
      for (const log of incomingData.result) {
        if (log.address && !log.address.endsWith('800a')) {
          uniqueTokens.add(log.address.toLowerCase())
        }
      }
    }

    console.log(`[Token Discovery] Found ${uniqueTokens.size} unique tokens`)
    return Array.from(uniqueTokens)
  } catch (error) {
    console.error('Error fetching token list from logs:', error)
    return []
  }
}

// Get ERC-20 token balance using eth_call
async function getTokenBalance(
  walletAddress: string,
  tokenAddress: string
): Promise<{ balance: string; decimals: number; symbol: string; name: string } | null> {
  try {
    // balanceOf(address) function signature
    const balanceOfSignature = '0x70a08231'
    const paddedAddress = walletAddress.slice(2).padStart(64, '0')
    const data = balanceOfSignature + paddedAddress

    const response = await fetch(ABSTRACT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          {
            to: tokenAddress,
            data: data
          },
          'latest'
        ]
      })
    })

    const result = await response.json()
    if (result.error || result.result === '0x' || result.result === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      return null
    }

    // Get decimals - decimals() function signature
    const decimalsSignature = '0x313ce567'
    const decimalsResponse = await fetch(ABSTRACT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_call',
        params: [
          {
            to: tokenAddress,
            data: decimalsSignature
          },
          'latest'
        ]
      })
    })

    const decimalsResult = await decimalsResponse.json()
    const decimals = decimalsResult.result ? parseInt(decimalsResult.result, 16) : 18

    // Get symbol - symbol() function signature
    const symbolSignature = '0x95d89b41'
    const symbolResponse = await fetch(ABSTRACT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'eth_call',
        params: [
          {
            to: tokenAddress,
            data: symbolSignature
          },
          'latest'
        ]
      })
    })

    const symbolResult = await symbolResponse.json()
    let symbol = 'UNKNOWN'
    if (symbolResult.result && symbolResult.result !== '0x') {
      try {
        // Decode hex string - handle ABI encoded strings
        const hex = symbolResult.result.slice(2)
        if (hex.length > 128) {
          // ABI encoded string format
          const offset = parseInt(hex.slice(0, 64), 16) * 2
          const length = parseInt(hex.slice(offset, offset + 64), 16) * 2
          const stringHex = hex.slice(offset + 64, offset + 64 + length)
          symbol = Buffer.from(stringHex, 'hex').toString('utf8').trim()
        } else {
          // Simple string
          symbol = Buffer.from(hex, 'hex').toString('utf8').replace(/\0/g, '').replace(/[^\x20-\x7E]/g, '').trim()
        }
      } catch (e) {
        console.error('Error decoding symbol:', e)
      }
    }

    // Get name - name() function signature
    const nameSignature = '0x06fdde03'
    const nameResponse = await fetch(ABSTRACT_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'eth_call',
        params: [
          {
            to: tokenAddress,
            data: nameSignature
          },
          'latest'
        ]
      })
    })

    const nameResult = await nameResponse.json()
    let name = 'Unknown Token'
    if (nameResult.result && nameResult.result !== '0x') {
      try {
        // Decode hex string - handle ABI encoded strings
        const hex = nameResult.result.slice(2)
        if (hex.length > 128) {
          // ABI encoded string format
          const offset = parseInt(hex.slice(0, 64), 16) * 2
          const length = parseInt(hex.slice(offset, offset + 64), 16) * 2
          const stringHex = hex.slice(offset + 64, offset + 64 + length)
          name = Buffer.from(stringHex, 'hex').toString('utf8').trim()
        } else {
          // Simple string
          name = Buffer.from(hex, 'hex').toString('utf8').replace(/\0/g, '').replace(/[^\x20-\x7E]/g, '').trim()
        }
      } catch (e) {
        console.error('Error decoding name:', e)
      }
    }

    const balance = BigInt(result.result)
    const formattedBalance = (Number(balance) / Math.pow(10, decimals)).toFixed(6)

    return { balance: formattedBalance, decimals, symbol, name }
  } catch (error) {
    console.error('Error fetching token balance:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get('address')
    const userId = searchParams.get('userId') // Optional - for filtering hidden tokens

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      )
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Check cache first (DISABLED FOR DEBUGGING)
    const cacheKey = walletAddress.toLowerCase()
    const cached = null // cache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Returning cached wallet balance for:', walletAddress)

      // Still apply blacklist and hidden token filters to cached data
      let filteredData = { ...cached.data }

      // Get blacklisted tokens
      const blacklistedTokens = await prisma.blacklistedToken.findMany({
        select: { tokenAddress: true }
      })
      const blacklistSet = new Set(blacklistedTokens.map(t => t.tokenAddress.toLowerCase()))

      // Get user's hidden tokens if userId provided
      let hiddenSet = new Set<string>()
      if (userId) {
        const hiddenTokens = await prisma.hiddenToken.findMany({
          where: { userId },
          select: { tokenAddress: true }
        })
        hiddenSet = new Set(hiddenTokens.map(t => t.tokenAddress.toLowerCase()))
      }

      // Filter tokens
      filteredData.tokens = cached.data.tokens.filter((token: TokenBalance) => {
        const addr = token.token.toLowerCase()
        return !blacklistSet.has(addr) && !hiddenSet.has(addr)
      })

      // Recalculate total
      let totalTokenValueUsd = 0
      for (const token of filteredData.tokens) {
        if (token.valueUsd) {
          totalTokenValueUsd += token.valueUsd
        }
      }
      filteredData.totalValueUsd = (filteredData.nativeBalance.valueUsd || 0) + totalTokenValueUsd

      return NextResponse.json(filteredData)
    }

    // Get native ETH balance
    const ethBalance = await getEthBalance(walletAddress)

    // Get ETH price from DexScreener (using WETH or ETH address)
    // Note: You may need to adjust this based on Abstract's native token
    const ethInfo = await getTokenInfo('0x0000000000000000000000000000000000000000')
    const ethValueUsd = ethInfo.priceUsd ? parseFloat(ethBalance) * ethInfo.priceUsd : undefined

    // Discover all tokens from transaction logs
    const tokenAddressesToCheck = COMMON_ABSTRACT_TOKENS.map(t => t.address.toLowerCase())

    try {
      const discoveredTokenAddresses = await getTokenListFromLogs(walletAddress)

      // Add discovered tokens to the list
      for (const addr of discoveredTokenAddresses) {
        if (!tokenAddressesToCheck.includes(addr.toLowerCase())) {
          tokenAddressesToCheck.push(addr.toLowerCase())
        }
      }

      console.log(`Found ${tokenAddressesToCheck.length} total tokens to check for ${walletAddress} (${discoveredTokenAddresses.length} discovered)`)
    } catch (error) {
      console.error('Token discovery failed, using common tokens only:', error)
    }

    // Fetch balances for all tokens IN PARALLEL
    const tokenBalancePromises = tokenAddressesToCheck.map(async (tokenAddress) => {
      const tokenData = await getTokenBalance(walletAddress, tokenAddress)

      if (tokenData && parseFloat(tokenData.balance) > 0) {
        const tokenInfo = await getTokenInfo(tokenAddress)
        const valueUsd = tokenInfo.priceUsd ? parseFloat(tokenData.balance) * tokenInfo.priceUsd : undefined

        // Cache discovered token for admin verification (async, non-blocking)
        prisma.discoveredToken.upsert({
          where: { tokenAddress: tokenAddress.toLowerCase() },
          create: {
            tokenAddress: tokenAddress.toLowerCase(),
            symbol: tokenData.symbol,
            name: tokenData.name,
            decimals: tokenData.decimals,
            seenCount: 1
          },
          update: {
            symbol: tokenData.symbol || undefined,
            name: tokenData.name || undefined,
            lastSeenAt: new Date(),
            seenCount: { increment: 1 }
          }
        }).catch(err => {
          // Silently fail - token discovery caching is not critical
          console.error('Failed to cache discovered token:', err)
        })

        return {
          token: tokenAddress,
          symbol: tokenData.symbol,
          name: tokenData.name,
          balance: tokenData.balance,
          decimals: tokenData.decimals,
          priceUsd: tokenInfo.priceUsd,
          valueUsd: valueUsd,
          logoUrl: tokenInfo.logoUrl
        }
      }
      return null
    })

    // Wait for all balance checks to complete
    const tokenBalanceResults = await Promise.all(tokenBalancePromises)

    // Filter out null results
    let tokenBalances: TokenBalance[] = tokenBalanceResults.filter((token): token is TokenBalance => token !== null)

    // Get blacklisted tokens
    const blacklistedTokens = await prisma.blacklistedToken.findMany({
      select: { tokenAddress: true }
    })
    const blacklistSet = new Set(blacklistedTokens.map(t => t.tokenAddress.toLowerCase()))

    // Get verified tokens
    const verifiedTokens = await prisma.verifiedToken.findMany({
      select: { tokenAddress: true }
    })
    const verifiedSet = new Set(verifiedTokens.map(t => t.tokenAddress.toLowerCase()))

    // Get user's hidden tokens if userId provided
    let hiddenSet = new Set<string>()
    if (userId) {
      const hiddenTokens = await prisma.hiddenToken.findMany({
        where: { userId },
        select: { tokenAddress: true }
      })
      hiddenSet = new Set(hiddenTokens.map(t => t.tokenAddress.toLowerCase()))
    }

    // Filter out blacklisted and hidden tokens, and add verification status
    tokenBalances = tokenBalances
      .filter((token) => {
        const addr = token.token.toLowerCase()
        return !blacklistSet.has(addr) && !hiddenSet.has(addr)
      })
      .map((token) => ({
        ...token,
        isVerified: verifiedSet.has(token.token.toLowerCase())
      }))

    let totalTokenValueUsd = 0
    for (const token of tokenBalances) {
      if (token.valueUsd) {
        totalTokenValueUsd += token.valueUsd
      }
    }

    const totalValueUsd = (ethValueUsd || 0) + totalTokenValueUsd

    const response: WalletBalanceResponse = {
      walletAddress,
      nativeBalance: {
        balance: ethBalance,
        symbol: 'ETH',
        priceUsd: ethInfo.priceUsd,
        valueUsd: ethValueUsd,
        logoUrl: ethInfo.logoUrl || 'https://assets.coingecko.com/coins/images/279/small/ethereum.png'
      },
      tokens: tokenBalances,
      totalValueUsd: totalValueUsd
    }

    // Store in cache
    cache.set(cacheKey, {
      data: response,
      timestamp: Date.now()
    })

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching wallet balance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch wallet balance' },
      { status: 500 }
    )
  }
}
