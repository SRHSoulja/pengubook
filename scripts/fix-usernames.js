const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixUsernames() {
  console.log('Starting username fix...')

  // Find all users with user_ usernames
  const usersToFix = await prisma.user.findMany({
    where: {
      username: {
        startsWith: 'user_'
      }
    }
  })

  console.log(`Found ${usersToFix.length} users with user_ usernames`)

  for (const user of usersToFix) {
    // If user has a wallet address, set username to wallet address
    if (user.walletAddress && user.walletAddress !== '') {
      console.log(`Fixing ${user.username} -> ${user.walletAddress}`)
      await prisma.user.update({
        where: { id: user.id },
        data: {
          username: user.walletAddress,
          displayName: user.displayName.startsWith('Penguin ')
            ? `USER_${user.walletAddress.slice(-4).toUpperCase()}`
            : user.displayName
        }
      })
    }
    // If OAuth user, keep their current username (it should be their social handle)
    else {
      console.log(`Skipping OAuth user: ${user.username}`)
    }
  }

  console.log('Username fix complete!')
}

fixUsernames()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
