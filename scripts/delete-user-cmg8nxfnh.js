const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function deleteDuplicateUser() {
  try {
    const duplicateUserId = 'cmg8nxfnh00005vc3y0f780vc'

    console.log(`Deleting duplicate user: ${duplicateUserId}`)

    const deletedUser = await prisma.user.delete({
      where: { id: duplicateUserId }
    })

    console.log('✅ Successfully deleted duplicate user:', deletedUser.username || deletedUser.displayName)
  } catch (error) {
    console.error('Error deleting user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

deleteDuplicateUser()
