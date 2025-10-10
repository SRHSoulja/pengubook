const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function checkArsonUsers() {
  try {
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { displayName: { contains: 'arson', mode: 'insensitive' } },
          { username: { contains: 'arson', mode: 'insensitive' } },
          { discordName: { contains: 'arson', mode: 'insensitive' } },
          { twitterHandle: { contains: 'arson', mode: 'insensitive' } }
        ]
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        walletAddress: true,
        avatar: true,
        avatarSource: true,
        discordName: true,
        discordAvatar: true,
        twitterHandle: true,
        twitterAvatar: true,
        level: true,
        xp: true,
        isAdmin: true,
        createdAt: true
      }
    })

    console.log(`Found ${users.length} users matching "arson":\n`)

    users.forEach((user, index) => {
      console.log(`\n--- User ${index + 1} ---`)
      console.log(`ID: ${user.id}`)
      console.log(`Username: ${user.username}`)
      console.log(`Display Name: ${user.displayName}`)
      console.log(`Wallet: ${user.walletAddress || 'none'}`)
      console.log(`Level: ${user.level}`)
      console.log(`XP: ${user.xp}`)
      console.log(`Admin: ${user.isAdmin}`)
      console.log(`Created: ${user.createdAt}`)
      console.log(`Avatar Source: ${user.avatarSource}`)
      console.log(`Avatar URL: ${user.avatar || 'none'}`)
      console.log(`Discord: ${user.discordName || 'none'}`)
      console.log(`Discord Avatar: ${user.discordAvatar || 'none'}`)
      console.log(`Twitter: ${user.twitterHandle || 'none'}`)
      console.log(`Twitter Avatar: ${user.twitterAvatar || 'none'}`)
    })

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkArsonUsers()
