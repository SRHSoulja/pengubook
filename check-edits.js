require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkEdits() {
  console.log('🔍 Checking PostEdit records...')

  try {
    const edits = await prisma.postEdit.findMany({
      include: {
        post: {
          select: {
            id: true,
            content: true,
            author: {
              select: {
                username: true
              }
            }
          }
        },
        editor: {
          select: {
            username: true
          }
        }
      }
    })

    console.log(`Found ${edits.length} edit records:`)
    edits.forEach(edit => {
      console.log(`- Post by ${edit.post.author.username}: "${edit.previousContent}" -> "${edit.newContent}"`)
    })

    if (edits.length === 0) {
      console.log('No edit history found. The test data might not have been created properly.')
    }

  } catch (error) {
    console.error('Error checking edits:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkEdits()