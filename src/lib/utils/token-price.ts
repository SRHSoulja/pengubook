/**
 * Token Price Utilities
 * Fetches current USD prices for tokens from CoinGecko API
 */

interface PriceResponse {
  usd: number
}

const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price'

// Mapping of token symbols to CoinGecko IDs
const TOKEN_ID_MAP: Record<string, string> = {
  'ETH': 'ethereum',
  'WETH': 'weth',
  'USDC': 'usd-coin',
  'USDT': 'tether',
  'DAI': 'dai',
  'WBTC': 'wrapped-bitcoin',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'AAVE': 'aave',
  'MATIC': 'matic-network',
  // Add more as needed
}

/**
 * Fetch current USD price for a token
 * @param tokenSymbol Token symbol (e.g., 'ETH', 'USDC')
 * @returns USD price as string, or null if unable to fetch
 */
export async function getTokenPrice(tokenSymbol: string): Promise<string | null> {
  try {
    const coinId = TOKEN_ID_MAP[tokenSymbol.toUpperCase()]

    if (!coinId) {
      console.log(`[Token Price] No CoinGecko ID mapping for ${tokenSymbol}`)
      return null
    }

    const response = await fetch(
      `${COINGECKO_API}?ids=${coinId}&vs_currencies=usd`,
      {
        next: { revalidate: 60 }, // Cache for 60 seconds
        headers: {
          'Accept': 'application/json'
        }
      }
    )

    if (!response.ok) {
      console.error(`[Token Price] API error: ${response.status}`)
      return null
    }

    const data: Record<string, PriceResponse> = await response.json()
    const price = data[coinId]?.usd

    if (price === undefined) {
      console.log(`[Token Price] No price data for ${tokenSymbol}`)
      return null
    }

    return price.toString()
  } catch (error) {
    console.error(`[Token Price] Error fetching price for ${tokenSymbol}:`, error)
    return null
  }
}

/**
 * Calculate USD value of a token amount
 * @param amount Token amount as string
 * @param tokenSymbol Token symbol
 * @returns USD value as formatted string (e.g., "1234.56"), or null if unable to calculate
 */
export async function calculateUsdValue(
  amount: string,
  tokenSymbol: string
): Promise<string | null> {
  try {
    const price = await getTokenPrice(tokenSymbol)

    if (!price) {
      return null
    }

    const amountNum = parseFloat(amount)
    const priceNum = parseFloat(price)

    if (isNaN(amountNum) || isNaN(priceNum)) {
      return null
    }

    const usdValue = amountNum * priceNum

    // Format to 2 decimal places
    return usdValue.toFixed(2)
  } catch (error) {
    console.error(`[Token Price] Error calculating USD value:`, error)
    return null
  }
}
