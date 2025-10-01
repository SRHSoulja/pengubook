const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkUser() {
  try {
    // Check what users exist in the database
    const users = await prisma.user.findMany({
      select: {
        id: true,
        walletAddress: true,
        username: true,
        displayName: true
      }
    })

    console.log('All users in database:')
    users.forEach(user => {
      console.log(`- ID: ${user.id}`)
      console.log(`  Wallet: "${user.walletAddress}"`)
      console.log(`  Username: ${user.username}`)
      console.log(`  Display: ${user.displayName}`)
      console.log('---')
    })

    // Try to find the specific wallet address
    const searchWallet = '0xae2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02'
    console.log(`Searching for wallet: "${searchWallet}"`)

    const userByExact = await prisma.user.findUnique({
      where: { walletAddress: searchWallet }
    })
    console.log('Exact match result:', userByExact ? `Found user ${userByExact.id}` : 'Not found')

    const userByLower = await prisma.user.findUnique({
      where: { walletAddress: searchWallet.toLowerCase() }
    })
    console.log('Lowercase match result:', userByLower ? `Found user ${userByLower.id}` : 'Not found')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUser()