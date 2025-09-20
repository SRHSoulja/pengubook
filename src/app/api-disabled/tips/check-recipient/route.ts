import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { recipientAddress } = await request.json()

    if (!recipientAddress) {
      return NextResponse.json(
        { error: 'Recipient address is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    let user = await prisma.user.findUnique({
      where: { walletAddress: recipientAddress }
    })

    // If user doesn't exist, create a fake profile for testing
    if (!user) {
      const username = `fake_${recipientAddress.slice(-6)}`
      const displayName = `Fake User ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`

      user = await prisma.user.create({
        data: {
          walletAddress: recipientAddress,
          username,
          displayName,
          bio: 'This is a fake profile created for testing tips!',
          profile: {
            create: {
              socialLinks: '[]',
              interests: '["Testing", "Fake Profiles"]',
            }
          }
        }
      })

      console.log('Created fake profile for testing:', user.username)
    }

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        walletAddress: user.walletAddress
      }
    })

  } catch (error) {
    console.error('Failed to check recipient:', error)
    return NextResponse.json(
      { error: 'Failed to check recipient' },
      { status: 500 }
    )
  }
}