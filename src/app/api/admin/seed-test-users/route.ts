import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST() {
  try {
    const testUsers = [
      {
        username: 'penguin_dev',
        displayName: 'Dev Penguin 🐧',
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        level: 5,
        xp: 1250
      },
      {
        username: 'ice_queen_23',
        displayName: 'Ice Queen ❄️',
        walletAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        level: 8,
        xp: 3200
      },
      {
        username: 'flipper_pro',
        displayName: 'Flipper Pro 🏊',
        walletAddress: '0x9876543210fedcba9876543210fedcba98765432',
        level: 3,
        xp: 750
      },
      {
        username: 'arctic_artist',
        displayName: 'Arctic Artist 🎨',
        walletAddress: '0x2468ace02468ace02468ace02468ace02468ace0',
        level: 6,
        xp: 1800
      },
      {
        username: 'crypto_waddle',
        displayName: 'Crypto Waddle 💰',
        walletAddress: '0x1357bdf91357bdf91357bdf91357bdf91357bdf9',
        level: 4,
        xp: 920
      }
    ]

    const createdUsers = []

    for (const userData of testUsers) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { username: userData.username }
      })

      if (!existingUser) {
        const user = await prisma.user.create({
          data: {
            ...userData,
            profile: {
              create: {
                followersCount: Math.floor(Math.random() * 50),
                followingCount: Math.floor(Math.random() * 30),
                postsCount: Math.floor(Math.random() * 20),
                tipCount: Math.floor(Math.random() * 10),
                totalTipsReceived: Math.random() * 100,
                profileVerified: Math.random() > 0.5
              }
            }
          },
          include: {
            profile: true
          }
        })
        createdUsers.push(user)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Created ${createdUsers.length} test penguins`,
      users: createdUsers.map(u => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        level: u.level
      }))
    })
  } catch (error) {
    console.error('Failed to create test users:', error)
    return NextResponse.json(
      { error: 'Failed to create test users' },
      { status: 500 }
    )
  }
}