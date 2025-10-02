const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function createMissingProfiles() {
  try {
    // Find all users without profiles
    const usersWithoutProfiles = await prisma.user.findMany({
      where: {
        profile: null
      },
      select: {
        id: true,
        username: true,
        displayName: true
      }
    })

    console.log(`Found ${usersWithoutProfiles.length} users without profiles`)

    // Create profiles for each user
    for (const user of usersWithoutProfiles) {
      console.log(`Creating profile for user: ${user.username} (${user.id})`)

      await prisma.profile.create({
        data: {
          userId: user.id,
          isPrivate: false,
          showActivity: true,
          showTips: true,
          allowDirectMessages: true,
          theme: 'dark',
          profileVerified: false,
          socialLinks: '[]',
          interests: '[]',
          languages: '[]',
          skills: '[]'
        }
      })
    }

    console.log(`✅ Successfully created ${usersWithoutProfiles.length} profiles`)
  } catch (error) {
    console.error('Error creating profiles:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createMissingProfiles()
