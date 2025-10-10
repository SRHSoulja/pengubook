const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function deleteDuplicateUser() {
  try {
    const duplicateUserId = 'cmfwzbenk0000aywq4cwyqe6o'

    console.log(`Deleting duplicate user: ${duplicateUserId}`)

    // Delete the user (cascade will handle related records)
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
