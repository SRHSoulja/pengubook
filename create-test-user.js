const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestUser() {
  try {
    // Create test user with the wallet address from the logs
    const user = await prisma.user.create({
      data: {
        walletAddress: '0xae2cf7cC881fFDfc75F1Fc425a01E8ae3229FA02',
        username: 'testuser',
        displayName: 'Test User'
      }
    })

    console.log('Created test user:', user)

    // Create a second test user for conversation testing
    const user2 = await prisma.user.create({
      data: {
        walletAddress: '0x1234567890123456789012345678901234567890',
        username: 'testuser2',
        displayName: 'Test User 2'
      }
    })

    console.log('Created second test user:', user2)

  } catch (error) {
    console.error('Error creating test users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser()