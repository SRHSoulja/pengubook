const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function clearStreakAudit() {
  try {
    const userId = 'cmfs3mnjt0000gcs4xgcqdz4w'

    console.log('Clearing streak audit logs for user:', userId)

    const result = await prisma.activity.deleteMany({
      where: {
        userId,
        activityType: {
          startsWith: 'STREAK_'
        }
      }
    })

    console.log('✅ Deleted', result.count, 'streak audit log entries')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearStreakAudit()
