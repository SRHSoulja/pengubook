// Script to add supported tokens to your production database
const { PrismaClient } = require('@prisma/client')

async function addSupportedTokens() {
  const prisma = new PrismaClient()

  try {
    // Add common tokens that users can tip with
    const tokens = [
      {
        name: 'Ethereum',
        symbol: 'ETH',
        contractAddress: '0x0000000000000000000000000000000000000000', // Native ETH
        decimals: 18,
        logoUrl: 'https://cryptologos.cc/logos/ethereum-eth-logo.png',
        isEnabled: true
      },
      {
        name: 'USD Coin',
        symbol: 'USDC',
        contractAddress: '0xa0b86a33e6d27cf9ebd2c6b8aa62e14e99ea0b2d', // Abstract testnet USDC
        decimals: 6,
        logoUrl: 'https://cryptologos.cc/logos/usd-coin-usdc-logo.png',
        isEnabled: true
      },
      {
        name: 'Pudgy Penguins Token',
        symbol: 'PENGU',
        contractAddress: '0x123...', // Replace with actual PENGU token address
        decimals: 18,
        logoUrl: 'https://example.com/pengu-logo.png',
        isEnabled: true
      }
    ]

    for (const token of tokens) {
      const existing = await prisma.token.findUnique({
        where: { symbol: token.symbol }
      })

      if (!existing) {
        await prisma.token.create({ data: token })
        console.log(`✅ Added token: ${token.symbol}`)
      } else {
        console.log(`⚠️  Token already exists: ${token.symbol}`)
      }
    }

    console.log('🎉 Token setup complete!')
  } catch (error) {
    console.error('❌ Error adding tokens:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addSupportedTokens()