const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkAdmin() {
  const adminWallet = '0xae2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02'

  // Find all users with wallet addresses
  const users = await prisma.user.findMany({
    where: {
      walletAddress: { not: null }
    },
    select: { id: true, username: true, walletAddress: true, isAdmin: true }
  })

  console.log('All users with wallets:', users)

  // Try to find the admin user
  const user = users.find(u => u.walletAddress?.toLowerCase() === adminWallet.toLowerCase())

  console.log('\nAdmin user:', user)

  if (user && !user.isAdmin) {
    console.log('Setting isAdmin to true...')
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { isAdmin: true }
    })
    console.log('Updated user:', updated)
  } else if (!user) {
    console.log('Admin user not found. Please log in with your wallet first.')
  }

  await prisma.$disconnect()
}

checkAdmin()
