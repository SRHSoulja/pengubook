const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clearTwitterAvatar() {
  try {
    const walletAddress = '0xae2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02'

    console.log(`Clearing Twitter avatar for: ${walletAddress}`)

    const updatedUser = await prisma.user.update({
      where: { walletAddress },
      data: {
        twitterAvatar: null
      }
    })

    console.log('✅ Cleared Twitter avatar')
    console.log('Current state:', {
      twitterHandle: updatedUser.twitterHandle,
      twitterId: updatedUser.twitterId,
      twitterAvatar: updatedUser.twitterAvatar,
      discordAvatar: updatedUser.discordAvatar
    })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearTwitterAvatar()
