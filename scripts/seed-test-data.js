require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestUsers() {
  console.log('🐧 Creating test users with sample data...')

  try {
    // Create test users
    const testUsers = [
      {
        walletAddress: '0x1234567890123456789012345678901234567890',
        username: 'penguin_dev',
        displayName: 'Penguin Developer',
        bio: 'Building the future of social Web3 🚀',
        level: 3,
        xp: 150,
        discordName: 'PenguinDev#1234',
        twitterHandle: '@penguin_dev'
      },
      {
        walletAddress: '0x2345678901234567890123456789012345678901',
        username: 'crypto_alice',
        displayName: 'Alice the Builder',
        bio: 'DeFi enthusiast and smart contract developer',
        level: 5,
        xp: 420,
        twitterHandle: '@crypto_alice'
      },
      {
        walletAddress: '0x3456789012345678901234567890123456789012',
        username: 'web3_bob',
        displayName: 'Bob the Explorer',
        bio: 'Exploring the Web3 ecosystem one dApp at a time',
        level: 2,
        xp: 75,
        discordName: 'Web3Bob#5678'
      }
    ]

    const createdUsers = []
    for (const userData of testUsers) {
      const user = await prisma.user.create({
        data: userData,
        include: { profile: true }
      })

      // Create profile if it doesn't exist
      if (!user.profile) {
        await prisma.profile.create({
          data: {
            userId: user.id,
            interests: JSON.stringify(['Web3', 'DeFi', 'NFTs', 'Gaming']),
            socialLinks: JSON.stringify(['https://github.com/penguin', 'https://twitter.com/penguin']),
            postsCount: 0,
            followersCount: Math.floor(Math.random() * 100),
            followingCount: Math.floor(Math.random() * 50),
            tipCount: Math.floor(Math.random() * 20),
            totalTipsReceived: Math.random() * 100
          }
        })
      }

      createdUsers.push(user)
      console.log(`✅ Created user: ${user.displayName} (@${user.username})`)
    }

    return createdUsers
  } catch (error) {
    console.error('❌ Error creating test users:', error)
    throw error
  }
}

async function createPostsWithEditHistory(users) {
  console.log('📝 Creating posts with edit history...')

  try {
    const samplePosts = [
      {
        user: users[0],
        originalContent: 'Just shipped a new feature! 🚀',
        edits: [
          'Just shipped a new feature! 🚀 Working on the next one...',
          'Just shipped an amazing new feature! 🚀 Working on the next one... Stay tuned!'
        ]
      },
      {
        user: users[1],
        originalContent: 'Learning Solidity is so much fun!',
        edits: [
          'Learning Solidity is challenging but fun!',
          'Learning Solidity is challenging but incredibly rewarding! The possibilities are endless.'
        ]
      },
      {
        user: users[2],
        originalContent: 'Web3 is the future',
        edits: [
          'Web3 is definitely the future of the internet',
          'Web3 is definitely the future of the internet! Can\'t wait to see what we build next 🌐'
        ]
      },
      {
        user: users[0],
        originalContent: 'Building in public today',
        edits: [
          'Building in public today - working on authentication',
          'Building in public today - working on authentication and user profiles',
          'Building in public today - working on authentication, user profiles, and social features! 🔥'
        ]
      },
      {
        user: users[1],
        originalContent: 'DeFi summer vibes',
        edits: [
          'DeFi summer vibes are back!',
          'DeFi summer vibes are back! Time to build some cool protocols 💎'
        ]
      }
    ]

    for (const postData of samplePosts) {
      // Create the original post
      const post = await prisma.post.create({
        data: {
          authorId: postData.user.id,
          content: postData.originalContent,
          contentType: 'TEXT',
          mediaUrls: '[]',
          visibility: 'PUBLIC',
          createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random time in last week
        }
      })

      console.log(`📄 Created post: "${postData.originalContent}"`)

      // Create edit history
      let previousContent = postData.originalContent
      for (let i = 0; i < postData.edits.length; i++) {
        const newContent = postData.edits[i]
        const editTime = new Date(Date.now() - Math.random() * 6 * 24 * 60 * 60 * 1000) // Random time in last 6 days

        // Update the post content
        await prisma.post.update({
          where: { id: post.id },
          data: {
            content: newContent,
            updatedAt: editTime
          }
        })

        // Create edit history record
        await prisma.postEdit.create({
          data: {
            postId: post.id,
            previousContent: previousContent,
            newContent: newContent,
            editedAt: editTime,
            editedBy: postData.user.id
          }
        })

        console.log(`  ✏️ Edit ${i + 1}: "${newContent}"`)
        previousContent = newContent
      }

      // Update user's post count
      await prisma.profile.update({
        where: { userId: postData.user.id },
        data: {
          postsCount: {
            increment: 1
          }
        }
      })
    }

    console.log('✅ Created posts with edit history!')
  } catch (error) {
    console.error('❌ Error creating posts:', error)
    throw error
  }
}

async function createSampleLikesAndComments(users) {
  console.log('💝 Adding some likes and comments...')

  try {
    // Get all posts
    const posts = await prisma.post.findMany({
      take: 10
    })

    for (const post of posts) {
      // Add some random likes
      const numLikes = Math.floor(Math.random() * 5) + 1
      const shuffledUsers = [...users].sort(() => 0.5 - Math.random()).slice(0, numLikes)

      for (const user of shuffledUsers) {
        try {
          await prisma.like.create({
            data: {
              userId: user.id,
              postId: post.id,
              createdAt: new Date(Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000)
            }
          })
        } catch (error) {
          // Ignore duplicate likes
        }
      }

      // Add some random comments
      const numComments = Math.floor(Math.random() * 3)
      const comments = [
        'Great post! 🔥',
        'This is awesome! Keep it up 💪',
        'Love this! Thanks for sharing 🙏',
        'Totally agree! 💯',
        'Mind blown 🤯'
      ]

      for (let i = 0; i < numComments; i++) {
        const randomUser = users[Math.floor(Math.random() * users.length)]
        const randomComment = comments[Math.floor(Math.random() * comments.length)]

        await prisma.comment.create({
          data: {
            userId: randomUser.id,
            postId: post.id,
            content: randomComment,
            createdAt: new Date(Date.now() - Math.random() * 4 * 24 * 60 * 60 * 1000)
          }
        })
      }
    }

    console.log('✅ Added likes and comments!')
  } catch (error) {
    console.error('❌ Error creating likes/comments:', error)
    throw error
  }
}

async function main() {
  console.log('🚀 Starting test data seeding...\n')

  try {
    // Check if test users already exist
    const existingUser = await prisma.user.findUnique({
      where: { username: 'penguin_dev' }
    })

    if (existingUser) {
      console.log('⚠️  Test users already exist. Skipping creation...')
      console.log('   If you want to recreate them, delete them first.')
      return
    }

    const users = await createTestUsers()
    console.log('')

    await createPostsWithEditHistory(users)
    console.log('')

    await createSampleLikesAndComments(users)
    console.log('')

    console.log('🎉 Test data seeding completed successfully!')
    console.log('')
    console.log('📋 Created:')
    console.log(`   👥 ${users.length} test users`)
    console.log('   📝 5 posts with edit history')
    console.log('   💝 Random likes and comments')
    console.log('')
    console.log('🔍 You can now view these users\' profiles to see edit history in action!')

  } catch (error) {
    console.error('💥 Seeding failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()