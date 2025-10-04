// Test setup and configuration for PeBloq

import { PrismaClient } from '@prisma/client'

// Mock environment variables for testing
if (!process.env.NODE_ENV) {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value: 'test',
    writable: true
  })
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'sqlite://./test.db'
process.env.NEXTAUTH_SECRET = 'test-secret-for-testing-only'
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only'

// Global test setup
let prisma: PrismaClient

beforeAll(async () => {
  prisma = new PrismaClient()

  // Clean database before tests
  await cleanDatabase()
})

afterAll(async () => {
  // Clean up after all tests
  await cleanDatabase()
  await prisma.$disconnect()
})

afterEach(async () => {
  // Clean up after each test
  await cleanDatabase()
})

// Helper function to clean database
async function cleanDatabase() {
  // Delete in order to respect foreign key constraints
  const tablenames = [
    'Tip',
    'UserAchievement',
    'Notification',
    'MessageReadReceipt',
    'Message',
    'Conversation',
    'ConversationParticipant',
    'CommunityModerator',
    'CommunityMember',
    'Community',
    'Share',
    'Reaction',
    'Like',
    'Comment',
    'Post',
    'FeedItem',
    'Follow',
    'Friendship',
    'Activity',
    'Streak',
    'Profile',
    'Account',
    'Session',
    'User',
    'Token',
    'Achievement'
  ]

  try {
    for (const tablename of tablenames) {
      await prisma.$executeRawUnsafe(`DELETE FROM "${tablename}";`)
    }
  } catch (error) {
    console.log('Error cleaning database:', error)
  }
}

// Test helpers
export const testHelpers = {
  // Create test user
  async createTestUser(overrides: any = {}) {
    return await prisma.user.create({
      data: {
        walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
        username: `testuser${Math.random().toString(36).substr(2, 9)}`,
        displayName: 'Test User',
        level: 1,
        isAdmin: false,
        isBanned: false,
        ...overrides
      }
    })
  },

  // Create test token
  async createTestToken(overrides: any = {}) {
    return await prisma.token.create({
      data: {
        name: 'Test Token',
        symbol: 'TEST',
        contractAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
        decimals: 18,
        isEnabled: true,
        ...overrides
      }
    })
  },

  // Create test post
  async createTestPost(authorId: string, overrides: any = {}) {
    return await prisma.post.create({
      data: {
        authorId,
        content: 'This is a test post',
        contentType: 'TEXT',
        visibility: 'PUBLIC',
        ...overrides
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
            level: true,
            isAdmin: true
          }
        },
        _count: {
          select: {
            likes: true,
            comments: true,
            shares: true
          }
        }
      }
    })
  },

  // Create test community
  async createTestCommunity(creatorId: string, overrides: any = {}) {
    const communityName = `testcommunity${Math.random().toString(36).substr(2, 9)}`

    return await prisma.community.create({
      data: {
        name: communityName,
        displayName: 'Test Community',
        description: 'This is a test community',
        category: 'general',
        creatorId,
        membersCount: 1,
        ...overrides
      }
    })
  },

  // Create authenticated request headers
  createAuthHeaders(userId: string) {
    return {
      'x-user-id': userId,
      'content-type': 'application/json'
    }
  },

  // Clean database manually
  cleanDatabase,

  // Get Prisma client for direct database operations
  getPrisma() {
    return prisma
  }
}

// Make testHelpers available globally
declare global {
  var testHelpers: typeof testHelpers
}

global.testHelpers = testHelpers