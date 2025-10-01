require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testEditsAPI() {
  console.log('🧪 Testing edit history API...')

  try {
    // Get a post that has edits
    const postWithEdits = await prisma.post.findFirst({
      where: {
        edits: {
          some: {}
        }
      },
      select: {
        id: true,
        content: true,
        author: {
          select: {
            username: true
          }
        }
      }
    })

    if (!postWithEdits) {
      console.log('❌ No posts with edits found')
      return
    }

    console.log(`✅ Found post with edits: "${postWithEdits.content}" by ${postWithEdits.author.username}`)
    console.log(`   Post ID: ${postWithEdits.id}`)

    // Test the API endpoint
    console.log('\n🌐 Testing API endpoint...')
    const response = await fetch(`http://localhost:3001/api/posts/${postWithEdits.id}/edits`)

    if (response.ok) {
      const data = await response.json()
      console.log('✅ API Response:', JSON.stringify(data, null, 2))
    } else {
      console.log('❌ API Error:', response.status, await response.text())
    }

  } catch (error) {
    console.error('Error testing API:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testEditsAPI()